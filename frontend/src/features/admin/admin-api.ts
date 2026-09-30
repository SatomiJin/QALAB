import { api } from '../../lib/http';
import type {
  AdminCourse,
  AdminCoursePage,
  AdminExercise,
  AdminLesson,
  AdminModule,
  ContentStatus,
  CreateCourseRequest,
  CreateExerciseRequest,
  CreateLessonRequest,
  CreateModuleRequest,
  PageSize,
  ReorderRequest,
  UpdateCourseRequest,
  UpdateExerciseRequest,
  UpdateLessonRequest,
  UpdateModuleRequest,
} from '../../types/api';

export interface AdminCourseListParams {
  skill?: string;
  status?: ContentStatus;
  page: number;
  pageSize: PageSize;
}

const id = (value: string) => encodeURIComponent(value);

export type CourseStatusAction = 'publish' | 'unpublish' | 'archive';

export const adminApi = {
  listCourses: (params: AdminCourseListParams, signal?: AbortSignal) =>
    api.get<AdminCoursePage>('/admin/courses', {
      query: { ...params },
      signal,
    }),

  getCourse: (courseId: string, signal?: AbortSignal) =>
    api.get<AdminCourse>(`/admin/courses/${id(courseId)}`, { signal }),

  createCourse: (body: CreateCourseRequest) =>
    api.post<AdminCourse>('/admin/courses', body),

  updateCourse: (courseId: string, body: UpdateCourseRequest) =>
    api.patch<AdminCourse>(`/admin/courses/${id(courseId)}`, body),

  setCourseStatus: (courseId: string, action: CourseStatusAction) =>
    api.post<AdminCourse>(`/admin/courses/${id(courseId)}/${action}`),

  deleteCourse: (courseId: string) =>
    api.delete<void>(`/admin/courses/${id(courseId)}`),

  reorderCourses: (skillId: string, ids: string[]) =>
    api.patch<void>('/admin/courses/reorder', { skillId, ids }),

  createModule: (courseId: string, body: CreateModuleRequest) =>
    api.post<AdminModule>(`/admin/courses/${id(courseId)}/modules`, body),

  updateModule: (moduleId: string, body: UpdateModuleRequest) =>
    api.patch<AdminModule>(`/admin/modules/${id(moduleId)}`, body),

  deleteModule: (moduleId: string) =>
    api.delete<void>(`/admin/modules/${id(moduleId)}`),

  reorderModules: (courseId: string, body: ReorderRequest) =>
    api.patch<void>(`/admin/courses/${id(courseId)}/modules/reorder`, body),

  createLesson: (moduleId: string, body: CreateLessonRequest) =>
    api.post<AdminLesson>(`/admin/modules/${id(moduleId)}/lessons`, body),

  getLesson: (lessonId: string, signal?: AbortSignal) =>
    api.get<AdminLesson>(`/admin/lessons/${id(lessonId)}`, { signal }),

  updateLesson: (lessonId: string, body: UpdateLessonRequest) =>
    api.patch<AdminLesson>(`/admin/lessons/${id(lessonId)}`, body),

  deleteLesson: (lessonId: string) =>
    api.delete<void>(`/admin/lessons/${id(lessonId)}`),

  reorderLessons: (moduleId: string, body: ReorderRequest) =>
    api.patch<void>(`/admin/modules/${id(moduleId)}/lessons/reorder`, body),

  createExercise: (lessonId: string, body: CreateExerciseRequest) =>
    api.post<AdminExercise>(`/admin/lessons/${id(lessonId)}/exercises`, body),

  getExercise: (exerciseId: string, signal?: AbortSignal) =>
    api.get<AdminExercise>(`/admin/exercises/${id(exerciseId)}`, { signal }),

  updateExercise: (exerciseId: string, body: UpdateExerciseRequest) =>
    api.patch<AdminExercise>(`/admin/exercises/${id(exerciseId)}`, body),

  deleteExercise: (exerciseId: string) =>
    api.delete<void>(`/admin/exercises/${id(exerciseId)}`),

  reorderExercises: (lessonId: string, body: ReorderRequest) =>
    api.patch<void>(`/admin/lessons/${id(lessonId)}/exercises/reorder`, body),
};
