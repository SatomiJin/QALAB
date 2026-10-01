import { api } from '../../lib/http';
import type {
  ContentLanguage,
  Dashboard,
  PageSize,
  ProgressPage,
} from '../../types/api';

export interface ProgressListParams {
  skill?: string;
  page: number;
  pageSize: PageSize;
  lang: ContentLanguage;
}

export const dashboardApi = {
  getDashboard: (
    { lang, tz }: { lang: ContentLanguage; tz: string },
    signal?: AbortSignal,
  ) => api.get<Dashboard>('/dashboard', { query: { lang, tz }, signal }),

  getProgress: (
    { skill, page, pageSize, lang }: ProgressListParams,
    signal?: AbortSignal,
  ) =>
    api.get<ProgressPage>('/progress', {
      query: { skill, page, pageSize, lang },
      signal,
    }),
};
