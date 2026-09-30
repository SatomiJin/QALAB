import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { AdminCourse, AdminExercise, AdminLesson } from '../../types/api';
import { type AdminCourseListParams, adminApi } from './admin-api';

export const adminKeys = {
  all: ['admin'] as const,
  courses: (params: AdminCourseListParams) =>
    ['admin', 'courses', params] as const,
  course: (id: string) => ['admin', 'course', id] as const,
  lesson: (id: string) => ['admin', 'lesson', id] as const,
  exercise: (id: string) => ['admin', 'exercise', id] as const,
};

export function useAdminCourses(params: AdminCourseListParams) {
  return useQuery({
    queryKey: adminKeys.courses(params),
    queryFn: ({ signal }) => adminApi.listCourses(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCourse(id: string) {
  return useQuery({
    queryKey: adminKeys.course(id),
    queryFn: ({ signal }) => adminApi.getCourse(id, signal),
  });
}

export function useAdminLesson(id: string) {
  return useQuery({
    queryKey: adminKeys.lesson(id),
    queryFn: ({ signal }) => adminApi.getLesson(id, signal),
  });
}

export function useAdminExercise(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.exercise(id ?? ''),
    queryFn: ({ signal }) => adminApi.getExercise(id!, signal),
    enabled: id !== undefined,
  });
}

/**
 * After any content write: every admin view may show it (counts, trees,
 * usage), and so may the learner views (catalogue, lessons, practice).
 */
function invalidateContent(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      ['admin', 'learning', 'practice'].includes(String(query.queryKey[0])) &&
      query.queryKey[1] !== 'skills',
  });
}

/** Puts a returned detail in its cache, then refreshes everything else. */
function storeResult(queryClient: QueryClient, result: unknown) {
  if (result && typeof result === 'object' && 'id' in result) {
    const value = result as AdminCourse | AdminLesson | AdminExercise;
    if ('modules' in value) {
      queryClient.setQueryData(adminKeys.course(value.id), value);
    } else if ('contentMd' in value) {
      queryClient.setQueryData(adminKeys.lesson(value.id), value);
    } else if ('answerData' in value) {
      queryClient.setQueryData(adminKeys.exercise(value.id), value);
    }
  }
  return invalidateContent(queryClient);
}

/**
 * A content write from the CMS. Returned details (course, lesson, exercise)
 * go into their cache; all content queries are marked stale.
 */
export function useAdminMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => storeResult(queryClient, result),
  });
}
