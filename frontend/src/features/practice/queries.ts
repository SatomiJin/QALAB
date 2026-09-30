import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  Attempt,
  AttemptResult,
  ContentLanguage,
  SubmitAttemptRequest,
} from '../../types/api';
import {
  type AttemptListParams,
  type ExerciseListParams,
  practiceApi,
} from './practice-api';

export const practiceKeys = {
  all: ['practice'] as const,
  exercises: (params: ExerciseListParams) =>
    ['practice', 'exercises', params] as const,
  exercise: (id: string, lang: ContentLanguage) =>
    ['practice', 'exercise', id, lang] as const,
  attempts: (id: string, params: AttemptListParams) =>
    ['practice', 'attempts', id, params] as const,
};

export function useExercises(params: ExerciseListParams) {
  return useQuery({
    queryKey: practiceKeys.exercises(params),
    queryFn: ({ signal }) => practiceApi.listExercises(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useExercise(id: string, lang: ContentLanguage) {
  return useQuery({
    queryKey: practiceKeys.exercise(id, lang),
    queryFn: ({ signal }) => practiceApi.getExercise(id, lang, signal),
    placeholderData: (previous) => (previous?.id === id ? previous : undefined),
  });
}

export function useAttempts(id: string, params: AttemptListParams) {
  return useQuery({
    queryKey: practiceKeys.attempts(id, params),
    queryFn: ({ signal }) => practiceApi.listAttempts(id, params, signal),
    placeholderData: keepPreviousData,
  });
}

/** Stats on lists and the exercise, and the history, change after a write. */
function invalidatePractice(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: practiceKeys.all });
}

export function useSubmitAttempt(exerciseId: string, lang: ContentLanguage) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitAttemptRequest) =>
      practiceApi.submitAttempt(exerciseId, body, lang),
    onSuccess: (_result: AttemptResult) => void invalidatePractice(queryClient),
  });
}

export function useSaveSelfAssessment(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      attemptId,
      checked,
    }: {
      attemptId: string;
      checked: string[];
    }) => practiceApi.saveSelfAssessment(exerciseId, attemptId, { checked }),
    onSuccess: (_attempt: Attempt) => void invalidatePractice(queryClient),
  });
}
