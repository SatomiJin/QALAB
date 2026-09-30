import type { Verdict } from '../../components/VerdictTag';
import {
  DEFAULT_PAGE_SIZE,
  DIFFICULTIES,
  type Difficulty,
  type ExerciseStats,
  type ExerciseType,
  PAGE_SIZES,
  type PageSize,
} from '../../types/api';

/** The Practice tabs and the exercise types each one lists. */
export const PRACTICE_KINDS = {
  quiz: ['multiple_choice', 'classification'],
  testCase: ['test_case'],
  bugReport: ['bug_report'],
  scenario: ['scenario'],
} as const satisfies Record<string, readonly ExerciseType[]>;

export type PracticeKind = keyof typeof PRACTICE_KINDS;

export const KIND_PATHS: Record<PracticeKind, string> = {
  quiz: '/practice/quiz',
  testCase: '/practice/test-case',
  bugReport: '/practice/bug-report',
  scenario: '/practice/scenario',
};

export function kindOf(type: ExerciseType): PracticeKind {
  const entry = Object.entries(PRACTICE_KINDS).find(([, types]) =>
    (types as readonly ExerciseType[]).includes(type),
  );
  return (entry?.[0] ?? 'quiz') as PracticeKind;
}

/** Types graded by concept coverage, with a model answer and a checklist. */
export const isFreeText = (type: ExerciseType) =>
  type === 'test_case' || type === 'bug_report' || type === 'scenario';

/** Not tried → Not run; any passing attempt → Passed; otherwise Failed. */
export function exerciseVerdict(stats: ExerciseStats): Verdict {
  if (stats.attemptCount === 0) return 'notRun';
  return stats.passed ? 'pass' : 'fail';
}

export const attemptVerdict = (isCorrect: boolean): Verdict =>
  isCorrect ? 'pass' : 'fail';

// List state in the URL ------------------------------------------------------

export interface PracticeListParams {
  skill?: string;
  difficulty?: Difficulty;
  page: number;
  pageSize: PageSize;
}

const SKILL_CODE = /^[a-z][a-z0-9_]{0,39}$/;

/**
 * Reads `?skill=&difficulty=&page=&pageSize=`. Invalid values fall back to
 * the defaults instead of sending a request the API would reject.
 */
export function parsePracticeParams(
  search: URLSearchParams,
): PracticeListParams {
  const skill = search.get('skill') ?? '';
  const difficulty = search.get('difficulty') as Difficulty | null;
  const page = Number(search.get('page'));
  const pageSize = Number(search.get('pageSize'));
  return {
    skill: SKILL_CODE.test(skill) ? skill : undefined,
    difficulty:
      difficulty && DIFFICULTIES.includes(difficulty) ? difficulty : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize)
      ? (pageSize as PageSize)
      : DEFAULT_PAGE_SIZE,
  };
}

/** The query string for `params`, leaving out defaults (`?` included). */
export function practiceSearch(params: PracticeListParams): string {
  const search = new URLSearchParams();
  if (params.skill) search.set('skill', params.skill);
  if (params.difficulty) search.set('difficulty', params.difficulty);
  if (params.page > 1) search.set('page', String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE) {
    search.set('pageSize', String(params.pageSize));
  }
  const value = search.toString();
  return value ? `?${value}` : '';
}

const listKey = (kind: PracticeKind) => `qalab.practice.list.${kind}`;

/** Remembers the list of a tab, so the exercise page's back button returns to it. */
export function rememberPracticeSearch(kind: PracticeKind, search: string) {
  try {
    sessionStorage.setItem(listKey(kind), search);
  } catch {
    // Not remembered; back goes to the first page.
  }
}

export function practiceListPath(kind: PracticeKind): string {
  try {
    const search = sessionStorage.getItem(listKey(kind)) ?? '';
    return `${KIND_PATHS[kind]}${search.startsWith('?') ? search : ''}`;
  } catch {
    return KIND_PATHS[kind];
  }
}

/** A Markdown question as one line of plain text, for lists. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
