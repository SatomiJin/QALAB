import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageSize } from '../../types/api';

export interface ListParams {
  skill?: string;
  page: number;
  pageSize: PageSize;
}

const SKILL_CODE = /^[a-z][a-z0-9_]{0,39}$/;

function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value);
}

/**
 * Reads `?skill=&page=&pageSize=` from the Learning URL. Invalid values fall
 * back to the defaults instead of sending a request the API would reject.
 */
export function parseListParams(search: URLSearchParams): ListParams {
  const skill = search.get('skill') ?? '';
  const page = Number(search.get('page'));
  const pageSize = Number(search.get('pageSize'));
  return {
    skill: SKILL_CODE.test(skill) ? skill : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: isPageSize(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

/** The query string for `params`, leaving out defaults (`?` included). */
export function listSearch(params: ListParams): string {
  const search = new URLSearchParams();
  if (params.skill) search.set('skill', params.skill);
  if (params.page > 1) search.set('page', String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE) {
    search.set('pageSize', String(params.pageSize));
  }
  const value = search.toString();
  return value ? `?${value}` : '';
}

/** The last page that has items, for a request past the end. */
export function lastPage(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

const LAST_LIST_KEY = 'qalab.learning.list';

/**
 * Remembers the Learning list the learner was on (filter, page, size), so
 * the back buttons on course and lesson pages return to it. Per tab, and
 * optional: storage may be unavailable.
 */
export function rememberListSearch(search: string): void {
  try {
    sessionStorage.setItem(LAST_LIST_KEY, search);
  } catch {
    // Not remembered; back goes to the first page.
  }
}

export function learningListPath(): string {
  try {
    const search = sessionStorage.getItem(LAST_LIST_KEY) ?? '';
    return `/learning${search.startsWith('?') ? search : ''}`;
  } catch {
    return '/learning';
  }
}
