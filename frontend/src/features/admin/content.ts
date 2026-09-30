import {
  CONTENT_LIMITS,
  CONTENT_STATUSES,
  type ContentStatus,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  type PageSize,
} from '../../types/api';

/**
 * A slug from a title: lowercase a-z, 0-9 and single dashes, accents
 * removed ("Phân vùng tương đương" → "phan-vung-tuong-duong").
 */
export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CONTENT_LIMITS.slugLength)
    .replace(/-+$/, '');
}

export interface CourseFormValues {
  skillId: string;
  title: string;
  slug: string;
  description: string;
}

/** Course form fields that backend `details` can point at. */
export const COURSE_FIELDS = ['skillId', 'title', 'slug', 'description'];

/** Moves one entry of a list (reorder by buttons or drag-and-drop). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) {
    return next;
  }
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

// Course list state in the URL ----------------------------------------------

export interface AdminListParams {
  skill?: string;
  status?: ContentStatus;
  page: number;
  pageSize: PageSize;
}

const SKILL_CODE = /^[a-z][a-z0-9_]{0,39}$/;

/** Reads `?skill=&status=&page=&pageSize=` with safe defaults. */
export function parseAdminListParams(search: URLSearchParams): AdminListParams {
  const skill = search.get('skill') ?? '';
  const status = search.get('status') ?? '';
  const page = Number(search.get('page'));
  const pageSize = Number(search.get('pageSize'));
  return {
    skill: SKILL_CODE.test(skill) ? skill : undefined,
    status: (CONTENT_STATUSES as readonly string[]).includes(status)
      ? (status as ContentStatus)
      : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize)
      ? (pageSize as PageSize)
      : DEFAULT_PAGE_SIZE,
  };
}

/** Writes the params, leaving out defaults. */
export function adminListSearch(params: AdminListParams): URLSearchParams {
  const search = new URLSearchParams();
  if (params.skill) search.set('skill', params.skill);
  if (params.status) search.set('status', params.status);
  if (params.page > 1) search.set('page', String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE) {
    search.set('pageSize', String(params.pageSize));
  }
  return search;
}

const LIST_KEY = 'qalab.adminCourseList';

/** The last course list URL, so editors can go back to it. */
export function rememberAdminList(search: string): void {
  try {
    sessionStorage.setItem(LIST_KEY, search);
  } catch {
    // Storage unavailable (private mode): back goes to the plain list.
  }
}

export function adminListPath(): string {
  let search = '';
  try {
    search = sessionStorage.getItem(LIST_KEY) ?? '';
  } catch {
    search = '';
  }
  return `/admin/courses${search}`;
}
