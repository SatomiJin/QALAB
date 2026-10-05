import type { GlossaryTerm, SkillCode } from '../../types/api';

type Lang = 'en' | 'vi';

/** Lower case without accents, so "kiem thu" finds "kiểm thử". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Terms whose name, Vietnamese name, linked phrases or definition (in the
 * shown language) contain every word of the query, within the skill if given.
 */
export function filterTerms<T extends GlossaryTerm>(
  terms: readonly T[],
  query: string,
  skill: SkillCode | '',
  lang: Lang,
): T[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return terms.filter((term) => {
    if (skill && term.skill !== skill) return false;
    if (words.length === 0) return true;
    const haystack = normalize(
      [
        term.term,
        term.viName ?? '',
        ...term.matchPhrases,
        definition(term, lang),
      ].join(' '),
    );
    return words.every((word) => haystack.includes(word));
  });
}

export interface LetterGroup<T extends GlossaryTerm = GlossaryTerm> {
  letter: string;
  terms: T[];
}

/** A–Z groups by the term's first letter, terms sorted by name. */
export function groupByLetter<T extends GlossaryTerm>(
  terms: readonly T[],
): LetterGroup<T>[] {
  const sorted = [...terms].sort((a, b) =>
    a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }),
  );
  const groups: LetterGroup<T>[] = [];
  for (const term of sorted) {
    const letter = normalize(term.term.charAt(0)).toUpperCase();
    const group = groups.at(-1);
    if (group?.letter === letter) group.terms.push(term);
    else groups.push({ letter, terms: [term] });
  }
  return groups;
}

/** The definition in the shown language. */
export function definition(term: GlossaryTerm, lang: Lang): string {
  return lang === 'vi' ? term.definitionVi : term.definitionEn;
}

/** Splits `code` spans out of a definition: odd parts are code. */
export function splitCode(text: string): string[] {
  return text.split('`');
}
