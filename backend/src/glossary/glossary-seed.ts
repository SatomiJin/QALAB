import { readFileSync } from 'node:fs';
import { SKILL_CODES } from '../curriculum/curriculum.js';
import { uuidV5 } from '../curriculum/uuid-v5.js';
import {
  GLOSSARY_LIMITS,
  GLOSSARY_SLUG_PATTERN,
  phraseErrors,
} from './glossary-rules.js';
import type { GlossaryRow, GlossaryWrite } from './glossary.repository.js';

/** One entry of `seed/glossary/terms.json`. */
export interface SeedTerm {
  slug: string;
  term: string;
  viName?: string;
  skill: string;
  match: string[];
  definition: { en: string; vi: string };
  related: string[];
}

const FIELDS = new Set([
  'slug',
  'term',
  'viName',
  'skill',
  'match',
  'definition',
  'related',
]);

const isText = (value: unknown, max: number, min = 1): value is string =>
  typeof value === 'string' &&
  value === value.trim() &&
  value.length >= min &&
  value.length <= max;

/** Validates the file with the DB limits and the CMS rules; never writes. */
export function validateGlossarySeed(data: unknown): {
  terms: SeedTerm[];
  errors: string[];
} {
  if (!Array.isArray(data))
    return { terms: [], errors: ['the file must hold an array'] };
  const errors: string[] = [];
  const terms = data as SeedTerm[];
  const slugs = new Set<string>();
  terms.forEach((entry, index) => {
    const at = `[${index}] ${typeof entry?.slug === 'string' ? entry.slug : '?'}`;
    const problem = (message: string) => errors.push(`${at}: ${message}`);
    if (typeof entry !== 'object' || entry === null)
      return problem('not an object');
    for (const key of Object.keys(entry))
      if (!FIELDS.has(key)) problem(`unknown field ${key}`);
    if (
      !isText(entry.slug, GLOSSARY_LIMITS.slugLength) ||
      !GLOSSARY_SLUG_PATTERN.test(entry.slug)
    )
      problem('invalid slug');
    else if (slugs.has(entry.slug)) problem('slug used twice');
    slugs.add(entry.slug);
    if (!isText(entry.term, GLOSSARY_LIMITS.termLength))
      problem('invalid term');
    if (
      entry.viName !== undefined &&
      !isText(entry.viName, GLOSSARY_LIMITS.viNameLength)
    )
      problem('invalid viName');
    if (!(SKILL_CODES as readonly string[]).includes(entry.skill))
      problem(`unknown skill ${String(entry.skill)}`);
    if (
      !Array.isArray(entry.match) ||
      entry.match.length > GLOSSARY_LIMITS.phrases ||
      !entry.match.every((p) =>
        isText(p, GLOSSARY_LIMITS.phraseMax, GLOSSARY_LIMITS.phraseMin),
      )
    ) {
      problem(
        `match: at most ${GLOSSARY_LIMITS.phrases} trimmed phrases of ${GLOSSARY_LIMITS.phraseMin}-${GLOSSARY_LIMITS.phraseMax} characters`,
      );
    }
    for (const lang of ['en', 'vi'] as const) {
      if (!isText(entry.definition?.[lang], GLOSSARY_LIMITS.definitionLength))
        problem(`invalid definition.${lang}`);
    }
    if (
      !Array.isArray(entry.related) ||
      entry.related.length > GLOSSARY_LIMITS.related
    ) {
      problem(`related: at most ${GLOSSARY_LIMITS.related} slugs`);
    }
  });
  if (errors.length > 0) return { terms: [], errors };

  // A phrase belongs to one term; related slugs exist and are not the term.
  terms.forEach((entry, index) => {
    const others = terms.map((other, i) => ({
      id: String(i),
      term: other.term,
      matchPhrases: other.match,
    }));
    for (const error of phraseErrors(String(index), entry.match, others)) {
      errors.push(`${entry.slug}: ${error.field} ${error.message}`);
    }
    for (const slug of entry.related) {
      if (slug === entry.slug || !slugs.has(slug))
        errors.push(`${entry.slug}: related ${slug} is not another term`);
    }
  });
  return { terms: errors.length > 0 ? [] : terms, errors };
}

export function loadGlossarySeed(path: string) {
  return validateGlossarySeed(
    JSON.parse(readFileSync(path, 'utf8')) as unknown,
  );
}

/** Id of a seeded term: the existing row's (by slug), else UUID v5 of `glossary:<slug>`. */
export const seedTermId = (slug: string) => uuidV5(`glossary:${slug}`);

export type SeedRow = GlossaryWrite & { id: string };

export interface GlossaryPlan {
  write: SeedRow[];
  /** Terms left out, with the reason (a phrase used by a term made in the CMS). */
  skipped: string[];
}

/**
 * What to upsert. Without `update` only missing terms are inserted
 * (published); with it the file wins too, except the status, which stays as
 * an admin set it. A term whose phrase another stored term uses is skipped.
 */
export function planGlossaryWrites(
  terms: readonly SeedTerm[],
  existing: readonly Pick<
    GlossaryRow,
    'id' | 'slug' | 'term' | 'match_phrases' | 'status'
  >[],
  options: { update: boolean },
): GlossaryPlan {
  const bySlug = new Map(existing.map((row) => [row.slug, row]));
  const ids = new Map(
    terms.map((t) => [t.slug, bySlug.get(t.slug)?.id ?? seedTermId(t.slug)]),
  );
  const seedSlugs = new Set(terms.map((t) => t.slug));
  // Stored rows this run leaves as they are keep their phrases: a written
  // term must not take one of those. (Phrases inside the file are already
  // unique.)
  const kept = existing
    .filter((row) => !(options.update && seedSlugs.has(row.slug)))
    .map((row) => ({
      id: row.id,
      term: row.term,
      matchPhrases: row.match_phrases,
    }));
  const write: SeedRow[] = [];
  const skipped: string[] = [];
  for (const entry of terms) {
    const stored = bySlug.get(entry.slug);
    if (stored && !options.update) continue;
    const id = ids.get(entry.slug)!;
    const taken = phraseErrors(id, entry.match, kept);
    if (taken.length > 0) {
      skipped.push(`${entry.slug}: ${taken.map((e) => e.message).join('; ')}`);
      continue;
    }
    write.push({
      id,
      slug: entry.slug,
      term: entry.term,
      vi_name: entry.viName ?? null,
      skill_code: entry.skill,
      match_phrases: entry.match,
      definition_en: entry.definition.en,
      definition_vi: entry.definition.vi,
      related_ids: entry.related.map((slug) => ids.get(slug)!),
      status: stored?.status ?? 'published',
    });
  }
  return { write, skipped };
}
