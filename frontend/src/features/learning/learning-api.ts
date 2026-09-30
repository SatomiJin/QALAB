import { api } from '../../lib/http';
import type {
  ContentLanguage,
  ContinueResponse,
  CourseDetail,
  CoursePage,
  Lesson,
  LessonProgress,
  PageSize,
  Skill,
  UpdateLessonProgressRequest,
} from '../../types/api';

export interface CourseListParams {
  skill?: string;
  page: number;
  pageSize: PageSize;
  lang: ContentLanguage;
}

export const learningApi = {
  listSkills: (signal?: AbortSignal) => api.get<Skill[]>('/skills', { signal }),

  listCourses: (
    { skill, page, pageSize, lang }: CourseListParams,
    signal?: AbortSignal,
  ) =>
    api.get<CoursePage>('/courses', {
      query: { skill, page, pageSize, lang },
      signal,
    }),

  getCourse: (slug: string, lang: ContentLanguage, signal?: AbortSignal) =>
    api.get<CourseDetail>(`/courses/${encodeURIComponent(slug)}`, {
      query: { lang },
      signal,
    }),

  getLesson: (id: string, lang: ContentLanguage, signal?: AbortSignal) =>
    api.get<Lesson>(`/lessons/${encodeURIComponent(id)}`, {
      query: { lang },
      signal,
    }),

  recordProgress: (id: string, body: UpdateLessonProgressRequest) =>
    api.post<LessonProgress>(
      `/lessons/${encodeURIComponent(id)}/progress`,
      body,
    ),

  getContinue: (lang: ContentLanguage, signal?: AbortSignal) =>
    api.get<ContinueResponse>('/continue', { query: { lang }, signal }),
};
