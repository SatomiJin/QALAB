import { api } from '../../lib/http';
import type {
  Attempt,
  AttemptPage,
  AttemptResult,
  ContentLanguage,
  Difficulty,
  Exercise,
  ExercisePage,
  ExerciseType,
  PageSize,
  SaveSelfAssessmentRequest,
  SubmitAttemptRequest,
} from '../../types/api';

export interface ExerciseListParams {
  types?: readonly ExerciseType[];
  skill?: string;
  difficulty?: Difficulty;
  lessonId?: string;
  page: number;
  pageSize: PageSize;
  lang: ContentLanguage;
}

export interface AttemptListParams {
  page: number;
  pageSize: PageSize;
  lang: ContentLanguage;
}

const exercisePath = (id: string) => `/exercises/${encodeURIComponent(id)}`;

export const practiceApi = {
  listExercises: (
    { types, ...params }: ExerciseListParams,
    signal?: AbortSignal,
  ) =>
    api.get<ExercisePage>('/exercises', {
      query: { ...params, type: types?.join(',') },
      signal,
    }),

  getExercise: (id: string, lang: ContentLanguage, signal?: AbortSignal) =>
    api.get<Exercise>(exercisePath(id), { query: { lang }, signal }),

  submitAttempt: (
    id: string,
    body: SubmitAttemptRequest,
    lang: ContentLanguage,
  ) =>
    api.post<AttemptResult>(`${exercisePath(id)}/attempts`, body, {
      query: { lang },
    }),

  listAttempts: (id: string, params: AttemptListParams, signal?: AbortSignal) =>
    api.get<AttemptPage>(`${exercisePath(id)}/attempts`, {
      query: { ...params },
      signal,
    }),

  saveSelfAssessment: (
    id: string,
    attemptId: string,
    body: SaveSelfAssessmentRequest,
  ) =>
    api.post<Attempt>(
      `${exercisePath(id)}/attempts/${encodeURIComponent(attemptId)}/self-assessment`,
      body,
    ),
};
