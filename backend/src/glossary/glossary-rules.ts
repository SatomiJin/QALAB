/** Same limits as the DB checks and `frontend/src/types/api.ts`. */
export const GLOSSARY_LIMITS = {
  slugLength: 64,
  termLength: 80,
  viNameLength: 80,
  definitionLength: 500,
  phrases: 10,
  phraseMin: 2,
  phraseMax: 60,
  related: 8,
} as const;

/** Same as content slugs (and the DB check). */
export const GLOSSARY_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface FieldError {
  field: string;
  message: string;
}

export interface PhraseOwner {
  id: string;
  term: string;
  matchPhrases: readonly string[];
}

const key = (phrase: string) => phrase.toLowerCase().replace(/’/g, "'");

/**
 * Phrases repeated inside one term, or already used by another term (a
 * phrase links to one entry only). The DB trigger catches races.
 */
export function phraseErrors(
  id: string | null,
  phrases: readonly string[],
  others: readonly PhraseOwner[],
): FieldError[] {
  const errors: FieldError[] = [];
  const owners = new Map<string, string>();
  for (const other of others) {
    if (other.id === id) continue;
    for (const phrase of other.matchPhrases)
      owners.set(key(phrase), other.term);
  }
  const seen = new Set<string>();
  phrases.forEach((phrase, index) => {
    const field = `matchPhrases[${index}]`;
    if (seen.has(key(phrase))) {
      errors.push({ field, message: 'phrase is listed twice' });
    } else if (owners.has(key(phrase))) {
      errors.push({
        field,
        message: `phrase is already used by "${owners.get(key(phrase))}"`,
      });
    }
    seen.add(key(phrase));
  });
  return errors;
}

/** Related ids: no duplicates, not the term itself, every one exists. */
export function relatedErrors(
  id: string | null,
  related: readonly string[],
  existing: ReadonlySet<string>,
): FieldError[] {
  const errors: FieldError[] = [];
  const seen = new Set<string>();
  related.forEach((other, index) => {
    const field = `relatedIds[${index}]`;
    if (other === id)
      errors.push({ field, message: 'a term cannot be related to itself' });
    else if (seen.has(other))
      errors.push({ field, message: 'term is listed twice' });
    else if (!existing.has(other))
      errors.push({ field, message: 'term does not exist' });
    seen.add(other);
  });
  return errors;
}

// Matching ---------------------------------------------------------------
// The same rules as the frontend's lesson links
// (`frontend/src/features/glossary/link-terms.ts`): whole words (letters,
// digits, `_`, `-` are word characters), optional plural, all-caps phrases
// in capitals only, longest phrase first.

interface Phrase {
  termId: string;
  text: string;
  caseSensitive: boolean;
}

const escape = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(/'/g, "['’]");

export function isAcronym(phrase: string): boolean {
  return /^[^a-z]*[A-Z][^a-z]*$/.test(phrase);
}

export class TermMatcher {
  private readonly pattern: RegExp | null;
  private readonly byKey: Map<string, Phrase>;

  constructor(terms: readonly PhraseOwner[]) {
    const phrases: Phrase[] = terms.flatMap((term) =>
      term.matchPhrases.map((text) => ({
        termId: term.id,
        text,
        caseSensitive: isAcronym(text),
      })),
    );
    this.byKey = new Map(phrases.map((p) => [key(p.text), p]));
    this.pattern =
      phrases.length === 0
        ? null
        : new RegExp(
            `(?<![\\p{L}\\p{N}_-])(${[...phrases]
              .sort((a, b) => b.text.length - a.text.length)
              .map((p) => escape(p.text))
              .join('|')})(?:e?s)?(?![\\p{L}\\p{N}_-])`,
            'giu',
          );
  }

  /** Ids of the terms whose phrases appear in the text, outside code. */
  termsIn(markdown: string): Set<string> {
    const found = new Set<string>();
    if (!this.pattern) return found;
    const text = markdown
      .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, ' ')
      .replace(/`[^`\n]*`/g, ' ');
    for (const match of text.matchAll(this.pattern)) {
      const phrase = this.byKey.get(key(match[1]));
      if (!phrase) continue;
      if (phrase.caseSensitive && match[1] !== phrase.text) continue;
      found.add(phrase.termId);
    }
    return found;
  }
}

export interface LessonText {
  lessonId: string;
  courseId: string;
  contentMd: string;
}

export interface TermUsage {
  lessons: number;
  courseIds: string[];
}

/** Per term: how many lessons use it and in which courses. */
export function termUsage(
  terms: readonly PhraseOwner[],
  lessons: readonly LessonText[],
): Map<string, TermUsage> {
  const matcher = new TermMatcher(terms);
  const usage = new Map<string, { lessons: number; courses: Set<string> }>(
    terms.map((term) => [term.id, { lessons: 0, courses: new Set() }]),
  );
  for (const lesson of lessons) {
    for (const id of matcher.termsIn(lesson.contentMd)) {
      const entry = usage.get(id);
      if (!entry) continue;
      entry.lessons += 1;
      entry.courses.add(lesson.courseId);
    }
  }
  return new Map(
    [...usage].map(([id, entry]) => [
      id,
      { lessons: entry.lessons, courseIds: [...entry.courses].sort() },
    ]),
  );
}
