import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ContentLanguage } from '../../types/api';
import { dashboardApi, type ProgressListParams } from './dashboard-api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  dashboard: (lang: ContentLanguage, tz: string) =>
    ['dashboard', 'summary', lang, tz] as const,
  progress: (params: ProgressListParams) =>
    ['dashboard', 'progress', params] as const,
};

// Everything here is derived from progress and attempts that other features
// write. Instead of every mutation invalidating these keys, they are never
// fresh: each visit refetches (and shows the cached data meanwhile).

export function useDashboard(lang: ContentLanguage, tz: string) {
  return useQuery({
    queryKey: dashboardKeys.dashboard(lang, tz),
    queryFn: ({ signal }) => dashboardApi.getDashboard({ lang, tz }, signal),
    staleTime: 0,
  });
}

export function useProgress(params: ProgressListParams) {
  return useQuery({
    queryKey: dashboardKeys.progress(params),
    queryFn: ({ signal }) => dashboardApi.getProgress(params, signal),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}
