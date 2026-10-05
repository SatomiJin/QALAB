import {
  type AdminGlossaryTerm,
  CONTENT_STATUSES,
  type ContentStatus,
  type CreateGlossaryTermRequest,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  type PageSize,
  SKILL_CODES,
  type SkillCode,
} from '../../types/api';
import { filterTerms } from '../glossary/glossary';

// List state in the URL: ?q=&skill=&status=&course=&page=&pageSize= ----------

/** `course`: a course id, or `unused` for terms no lesson uses. */
export interface GlossaryListParams {
  search?: string;
  skill?: SkillCode;
  status?: ContentStatus;
  course?: string;
  page: number;
  pageSize: PageSize;
}

export const UNUSED = 'unused';
const SEARCH_MAX = 64;

const includes = <T extends string>(list: readonly T[], value: string) =>
  (list as readonly string[]).includes(value);

export function parseGlossaryListParams(
  search: URLSearchParams,
): GlossaryListParams {
  const q = (search.get('q') ?? '').trim().slice(0, SEARCH_MAX);
  const skill = search.get('skill') ?? '';
  const status = search.get('status') ?? '';
  const course = (search.get('course') ?? '').slice(0, 64);
  const page = Number(search.get('page'));
  const pageSize = Number(search.get('pageSize'));
  return {
    search: q || undefined,
    skill: includes(SKILL_CODES, skill) ? (skill as SkillCode) : undefined,
    status: includes(CONTENT_STATUSES, status)
      ? (status as ContentStatus)
      : undefined,
    course: course || undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize)
      ? (pageSize as PageSize)
      : DEFAULT_PAGE_SIZE,
  };
}

export function glossaryListSearch(params: GlossaryListParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set('q', params.search);
  if (params.skill) search.set('skill', params.skill);
  if (params.status) search.set('status', params.status);
  if (params.course) search.set('course', params.course);
  if (params.page > 1) search.set('page', String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE) {
    search.set('pageSize', String(params.pageSize));
  }
  return search.toString();
}

export const isFiltered = (params: GlossaryListParams) =>
  Boolean(params.search || params.skill || params.status || params.course);

/**
 * The filtered terms (search in English and Vietnamese, topic, status,
 * course of use) and the page of them to show.
 */
export function glossaryPage(
  terms: readonly AdminGlossaryTerm[],
  params: GlossaryListParams,
): { items: AdminGlossaryTerm[]; total: number } {
  const searched = params.search
    ? filterTerms(terms, params.search, '', 'en').concat(
        filterTerms(terms, params.search, '', 'vi'),
      )
    : [...terms];
  const unique = [...new Set(searched)].sort((a, b) =>
    a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }),
  );
  const matching = unique.filter(
    (term) =>
      (!params.skill || term.skill === params.skill) &&
      (!params.status || term.status === params.status) &&
      (!params.course ||
        (params.course === UNUSED
          ? term.usage.lessons === 0
          : term.usage.courseIds.includes(params.course))),
  );
  const start = (params.page - 1) * params.pageSize;
  return {
    items: matching.slice(start, start + params.pageSize),
    total: matching.length,
  };
}

const LIST_KEY = 'qalab.adminGlossaryList';

/** The last list URL, so the term page goes back to it. */
export function rememberGlossaryList(search: string): void {
  try {
    sessionStorage.setItem(LIST_KEY, search);
  } catch {
    // Storage unavailable (private mode): back goes to the plain list.
  }
}

export function glossaryListPath(): string {
  let search = '';
  try {
    search = sessionStorage.getItem(LIST_KEY) ?? '';
  } catch {
    search = '';
  }
  return `/admin/glossary${search}`;
}

// Form ---------------------------------------------------------------------

export interface TermFormValues {
  term: string;
  slug: string;
  viName: string;
  skill: SkillCode;
  status: ContentStatus;
  matchPhrases: string[];
  definitionEn: string;
  definitionVi: string;
  relatedIds: string[];
}

export const TERM_FIELDS = [
  'term',
  'slug',
  'viName',
  'skill',
  'status',
  'matchPhrases',
  'definitionEn',
  'definitionVi',
  'relatedIds',
] as const;

export function termFormValues(term?: AdminGlossaryTerm): TermFormValues {
  return {
    term: term?.term ?? '',
    slug: term?.slug ?? '',
    viName: term?.viName ?? '',
    skill: term?.skill ?? 'fundamentals',
    status: term?.status ?? 'draft',
    matchPhrases: term?.matchPhrases ?? [],
    definitionEn: term?.definitionEn ?? '',
    definitionVi: term?.definitionVi ?? '',
    relatedIds: term?.relatedIds ?? [],
  };
}

/** Form → API body: trimmed phrases, no empty ones, empty Vietnamese name = none. */
export function termRequest(values: TermFormValues): CreateGlossaryTermRequest {
  return {
    term: values.term.trim(),
    slug: values.slug.trim(),
    viName: values.viName.trim() || null,
    skill: values.skill,
    status: values.status,
    matchPhrases: values.matchPhrases
      .map((phrase) => phrase.trim())
      .filter(Boolean),
    definitionEn: values.definitionEn.trim(),
    definitionVi: values.definitionVi.trim(),
    relatedIds: values.relatedIds,
  };
}

/**
 * API `details` → form fields: `matchPhrases[1]` belongs to the phrases
 * field (named with the phrase, so the admin sees which one).
 */
export function termFieldErrors(
  details: readonly { field: string; message: string }[],
  values: TermFormValues,
): { name: keyof TermFormValues; errors: string[] }[] {
  const byField = new Map<keyof TermFormValues, string[]>();
  for (const detail of details) {
    const indexed = /^(matchPhrases|relatedIds)(?:\[(\d+)\])?$/.exec(
      detail.field,
    );
    const field = indexed ? indexed[1] : detail.field;
    if (!(TERM_FIELDS as readonly string[]).includes(field)) continue;
    const name = field as keyof TermFormValues;
    const phrase =
      indexed?.[1] === 'matchPhrases' && indexed[2] !== undefined
        ? termRequest(values).matchPhrases?.[Number(indexed[2])]
        : undefined;
    const message = phrase ? `"${phrase}": ${detail.message}` : detail.message;
    byField.set(name, [...(byField.get(name) ?? []), message]);
  }
  return [...byField].map(([name, errors]) => ({ name, errors }));
}
