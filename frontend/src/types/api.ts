/** Mirrors backend `ErrorResponseDto`. */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: ApiErrorDetail[];
}

/** Mirrors backend `HealthResponseDto`. */
export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}

/** Mirrors backend `MessageDto`. */
export interface MessageResponse {
  message: string;
}

/** Mirrors backend `AuthUserDto`. */
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

/** Mirrors backend `SessionDto`. */
export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  /** Unix epoch seconds. */
  expiresAt: number;
  user: AuthUser;
}

export const EXPERIENCE_LEVELS = [
  'beginner',
  'some_qa',
  'working_qa',
  'automation_qa',
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export type UserRole = 'learner' | 'admin';

/** Mirrors backend `ProfileDto`. */
export interface Profile {
  id: string;
  email: string;
  displayName: string;
  experienceLevel: ExperienceLevel | null;
  learningGoals: string[];
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors backend `UpdateProfileDto`. */
export interface UpdateProfileRequest {
  displayName?: string;
  experienceLevel?: ExperienceLevel | null;
  learningGoals?: string[];
}

/** Password policy, mirrors backend `PASSWORD_MIN_LENGTH`/`MAX_LENGTH`. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const MAX_LEARNING_GOALS = 10;
export const MAX_LEARNING_GOAL_LENGTH = 200;

// Learning (Phase 2) ---------------------------------------------------------

export const LESSON_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

/** Languages content can be requested in (`?lang=`). */
export type ContentLanguage = 'en' | 'vi';

/**
 * `none`: English. `manual`: translated by a person. `machine`:
 * machine-translated, at least in part. `unavailable`: shown in English
 * because no translation could be made.
 */
export type TranslationStatus = 'none' | 'manual' | 'machine' | 'unavailable';

/** Mirrors backend `LocalizedDto`: on every response with content text. */
export interface Localized {
  language: ContentLanguage;
  translation: TranslationStatus;
}

/** Mirrors backend `PAGE_SIZES`. */
export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 20;

/** Mirrors backend `SkillDto`. */
export interface Skill {
  id: string;
  code: string;
  name: string;
  description: string;
  orderIndex: number;
}

/** Mirrors backend `LessonProgressDto`. */
export interface LessonProgress {
  status: LessonStatus;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
}

/** Mirrors backend `CourseProgressDto`. */
export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  status: LessonStatus;
}

/** Mirrors backend `CourseSummaryDto`. */
export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  skill: { code: string; name: string };
  orderIndex: number;
  estimatedMinutes: number;
  progress: CourseProgress;
}

/** Mirrors backend `LessonSummaryDto`. */
export interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  progress: LessonProgress;
}

/** Mirrors backend `CoursePageDto`. */
export interface CoursePage extends Localized {
  items: CourseSummary[];
  total: number;
  page: number;
  pageSize: PageSize;
}

/** Mirrors backend `CourseDetailDto`. */
export interface CourseDetail extends CourseSummary, Localized {
  modules: {
    id: string;
    title: string;
    description: string;
    lessons: LessonSummary[];
  }[];
  nextLessonId: string | null;
}

export interface LessonRef {
  id: string;
  title: string;
}

/** Mirrors backend `LessonDto`. */
export interface Lesson extends Localized {
  id: string;
  slug: string;
  title: string;
  contentMd: string;
  estimatedMinutes: number;
  course: { id: string; slug: string; title: string };
  module: { id: string; title: string };
  previousLesson: LessonRef | null;
  nextLesson: LessonRef | null;
  progress: LessonProgress;
}

/** Mirrors backend `ContinueLessonDto`. */
export interface ContinueItem {
  reason: 'start' | 'resume' | 'next';
  lessonId: string;
  lessonTitle: string;
  estimatedMinutes: number;
  course: { id: string; slug: string; title: string };
  module: { id: string; title: string };
  progress: LessonProgress;
}

/** Mirrors backend `ContinueDto`. */
export interface ContinueResponse extends Localized {
  item: ContinueItem | null;
}

/** Mirrors backend `UpdateLessonProgressDto`. */
export interface UpdateLessonProgressRequest {
  /** 0–100, whole numbers. Lower than the saved value is ignored. */
  progressPercent?: number;
  complete?: boolean;
}
