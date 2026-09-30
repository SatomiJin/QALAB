import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type {
  ContentLanguage,
  Lesson,
  LessonProgress,
  UpdateLessonProgressRequest,
} from '../../types/api';
import { type CourseListParams, learningApi } from './learning-api';

export const learningKeys = {
  all: ['learning'] as const,
  skills: ['learning', 'skills'] as const,
  courses: (params: CourseListParams) =>
    ['learning', 'courses', params] as const,
  course: (slug: string, lang: ContentLanguage) =>
    ['learning', 'course', slug, lang] as const,
  lesson: (id: string, lang: ContentLanguage) =>
    ['learning', 'lesson', id, lang] as const,
  continue: (lang: ContentLanguage) => ['learning', 'continue', lang] as const,
};

/** Content follows the UI language (content is machine-translated to VI). */
export function useContentLanguage(): ContentLanguage {
  const { i18n } = useTranslation();
  return i18n.language === 'vi' ? 'vi' : 'en';
}

export function useSkills() {
  return useQuery({
    queryKey: learningKeys.skills,
    queryFn: ({ signal }) => learningApi.listSkills(signal),
    // Skills are reference data; they change only with a migration.
    staleTime: 10 * 60_000,
  });
}

export function useCourses(params: CourseListParams) {
  return useQuery({
    queryKey: learningKeys.courses(params),
    queryFn: ({ signal }) => learningApi.listCourses(params, signal),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}

export function useCourse(slug: string, lang: ContentLanguage) {
  return useQuery({
    queryKey: learningKeys.course(slug, lang),
    queryFn: ({ signal }) => learningApi.getCourse(slug, lang, signal),
  });
}

export function useLesson(id: string, lang: ContentLanguage) {
  return useQuery({
    queryKey: learningKeys.lesson(id, lang),
    queryFn: ({ signal }) => learningApi.getLesson(id, lang, signal),
    // Switching original/translation keeps the lesson on screen meanwhile;
    // another lesson never shows the previous one.
    placeholderData: (previous) => (previous?.id === id ? previous : undefined),
  });
}

export function useContinue(lang: ContentLanguage) {
  return useQuery({
    queryKey: learningKeys.continue(lang),
    queryFn: ({ signal }) => learningApi.getContinue(lang, signal),
  });
}

/**
 * Records opening, reading or completing a lesson. The saved progress goes
 * into every cached language version of the lesson; course lists and
 * "continue" are marked stale.
 */
export function useRecordProgress(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateLessonProgressRequest) =>
      learningApi.recordProgress(lessonId, body),
    onSuccess: (progress: LessonProgress) => {
      queryClient.setQueriesData<Lesson>(
        { queryKey: ['learning', 'lesson', lessonId] },
        (old) => (old ? { ...old, progress } : old),
      );
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'learning' &&
          query.queryKey[1] !== 'lesson' &&
          query.queryKey[1] !== 'skills',
      });
    },
  });
}
