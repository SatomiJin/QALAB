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

// Practice (Phase 3) ---------------------------------------------------------

export const EXERCISE_TYPES = [
  'multiple_choice',
  'classification',
  'test_case',
  'bug_report',
  'scenario',
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Mirrors backend `PRIORITIES`, `SEVERITIES`, `TEST_TYPES`. */
export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const SEVERITIES = ['critical', 'major', 'minor', 'trivial'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const TEST_TYPES = [
  'functional',
  'negative',
  'boundary',
  'regression',
  'smoke',
  'usability',
  'performance',
  'security',
] as const;
export type TestType = (typeof TEST_TYPES)[number];

/** Mirrors backend `ANSWER_LIMITS`. */
export const ANSWER_LIMITS = {
  idLength: 50,
  titleLength: 200,
  textLength: 2000,
  steps: 30,
  stepLength: 500,
  scenarioLength: 5000,
  attachmentLength: 500,
} as const;

/** Free-text types pass at this score (backend `PASS_SCORE`). */
export const PASS_SCORE = 70;

export interface Label {
  id: string;
  text: string;
}

/** Mirrors backend `ExercisePromptDto`. Empty for free-text types. */
export interface ExercisePrompt {
  options?: Label[];
  multiple?: boolean;
  categories?: Label[];
  items?: Label[];
}

/** Mirrors backend `ExerciseStatsDto`: your attempts at the exercise. */
export interface ExerciseStats {
  attemptCount: number;
  bestScore: number | null;
  lastScore: number | null;
  lastAttemptedAt: string | null;
  passed: boolean;
}

/** Mirrors backend `ExerciseSummaryDto`. */
export interface ExerciseSummary {
  id: string;
  type: ExerciseType;
  difficulty: Difficulty;
  /** Markdown. */
  question: string;
  lesson: LessonRef;
  course: { id: string; slug: string; title: string };
  skill: { code: string; name: string };
  stats: ExerciseStats;
}

/** Mirrors backend `ExercisePageDto`. */
export interface ExercisePage extends Localized {
  items: ExerciseSummary[];
  total: number;
  page: number;
  pageSize: PageSize;
}

/** Mirrors backend `ExerciseDto`. Never contains the answer key. */
export interface Exercise extends ExerciseSummary, Localized {
  prompt: ExercisePrompt;
}

export interface TestCaseAnswer {
  testCaseId: string;
  title: string;
  preconditions: string;
  testData: string;
  steps: string[];
  expectedResult: string;
  priority: Priority | null;
  testType: TestType | null;
}

export interface BugReportAnswer {
  bugId: string;
  title: string;
  environment: string;
  preconditions: string;
  stepsToReproduce: string[];
  actualResult: string;
  expectedResult: string;
  severity: Severity | null;
  priority: Priority | null;
  attachment: string;
}

export interface AnswerByType {
  multiple_choice: { selected: string[] };
  classification: { mapping: Record<string, string> };
  test_case: TestCaseAnswer;
  bug_report: BugReportAnswer;
  scenario: { text: string };
}

export type TestCaseField = keyof TestCaseAnswer;
export type BugReportField = keyof BugReportAnswer;

export interface ConceptResult {
  concept: string;
  matched: boolean;
}

export interface ScorePart {
  part: 'fields' | 'concepts' | 'severity' | 'priority';
  score: number;
  weight: number;
}

export interface MatchResult<T extends string> {
  expected: T;
  given: T | null;
  match: boolean;
}

/** Mirrors backend `Feedback` (per type, `type` discriminates). */
export type Feedback =
  | {
      type: 'multiple_choice';
      options: { id: string; selected: boolean; correct: boolean }[];
    }
  | {
      type: 'classification';
      items: {
        id: string;
        chosen: string;
        correct: string;
        isCorrect: boolean;
      }[];
      correctCount: number;
      total: number;
    }
  | {
      type: 'test_case';
      parts: ScorePart[];
      fields: { field: TestCaseField; present: boolean }[];
      concepts: ConceptResult[];
    }
  | {
      type: 'bug_report';
      parts: ScorePart[];
      fields: { field: BugReportField; present: boolean }[];
      severity: MatchResult<Severity>;
      priority: MatchResult<Priority>;
      concepts: ConceptResult[];
    }
  | { type: 'scenario'; parts: ScorePart[]; concepts: ConceptResult[] };

/** Mirrors backend `AttemptDto`. */
export interface Attempt {
  id: string;
  exerciseId: string;
  score: number;
  isCorrect: boolean;
  answer: Record<string, unknown>;
  feedback: Feedback;
  selfAssessment: { checked: string[] } | null;
  attemptedAt: string;
}

/** Mirrors backend `ReviewDto`: shown after an attempt. */
export interface Review {
  explanation: string;
  modelAnswer: string | null;
  rubric: Label[];
}

/** Mirrors backend `AttemptResultDto`. */
export interface AttemptResult extends Localized {
  attempt: Attempt;
  review: Review;
}

/** Mirrors backend `AttemptPageDto`. */
export interface AttemptPage extends Localized {
  items: Attempt[];
  total: number;
  page: number;
  pageSize: PageSize;
  review: Review | null;
}

/** Mirrors backend `SubmitAttemptDto`. */
export interface SubmitAttemptRequest {
  answer: AnswerByType[ExerciseType];
}

/** Mirrors backend `SaveSelfAssessmentDto`. */
export interface SaveSelfAssessmentRequest {
  checked: string[];
}

// Admin CMS (Phase 4) --------------------------------------------------------

export const CONTENT_STATUSES = ['draft', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Mirrors backend `CONTENT_LIMITS` (and the DB checks). */
export const CONTENT_LIMITS = {
  titleLength: 160,
  slugLength: 100,
  descriptionLength: 2000,
  contentLength: 100_000,
  minutesMin: 1,
  minutesMax: 600,
  questionLength: 2000,
  explanationLength: 10_000,
} as const;

/** Mirrors backend `SLUG_PATTERN`. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Mirrors backend `LABEL_ID`: option / item / category / rubric ids. */
export const LABEL_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export interface AdminSkillRef {
  id: string;
  code: string;
  name: string;
}

export interface AdminRef {
  id: string;
  title: string;
  status: ContentStatus;
}

export interface AdminCourseRef extends AdminRef {
  slug: string;
}

interface AdminNode {
  id: string;
  status: ContentStatus;
  orderIndex: number;
  /** Learner progress or attempts here or below: archive, never delete. */
  inUse: boolean;
}

/** Public prompt data as stored (`prompt_data`). */
export type PromptData = ExercisePrompt;

export interface Concept {
  concept: string;
  keywords: string[];
}

/** Answer key (`answer_data`), per type. Mirrors backend `AnswerKeyByType`. */
export interface AnswerData {
  correct?: string[];
  mapping?: Record<string, string>;
  requiredFields?: string[];
  expectedSeverity?: Severity;
  expectedPriority?: Priority;
  expectedConcepts?: Concept[];
  modelAnswer?: string;
  rubric?: Label[];
}

export interface AdminExerciseSummary extends AdminNode {
  type: ExerciseType;
  difficulty: Difficulty;
  question: string;
  promptData: PromptData;
}

export interface AdminLessonSummary extends AdminNode {
  slug: string;
  title: string;
  estimatedMinutes: number;
  exercises: AdminExerciseSummary[];
}

export interface AdminModule extends AdminNode {
  title: string;
  description: string;
  lessons: AdminLessonSummary[];
}

export interface AdminCourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: ContentStatus;
  orderIndex: number;
  skill: AdminSkillRef;
  moduleCount: number;
  lessonCount: number;
  publishedLessonCount: number;
  updatedAt: string;
}

export interface AdminCoursePage {
  items: AdminCourseSummary[];
  total: number;
  page: number;
  pageSize: PageSize;
}

export interface AdminCourse extends AdminNode {
  slug: string;
  title: string;
  description: string;
  skill: AdminSkillRef;
  canPublish: boolean;
  createdAt: string;
  updatedAt: string;
  modules: AdminModule[];
}

export interface AdminLesson extends AdminNode {
  slug: string;
  title: string;
  contentMd: string;
  estimatedMinutes: number;
  visibleToLearners: boolean;
  module: AdminRef;
  course: AdminCourseRef;
  exercises: AdminExerciseSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminExercise extends AdminExerciseSummary {
  answerData: AnswerData | null;
  explanation: string;
  visibleToLearners: boolean;
  lesson: AdminRef;
  module: AdminRef;
  course: AdminCourseRef;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseRequest {
  skillId: string;
  title: string;
  slug: string;
  description?: string;
}

export type UpdateCourseRequest = Partial<CreateCourseRequest>;

export interface CreateModuleRequest {
  title: string;
  description?: string;
  status?: ContentStatus;
}

export type UpdateModuleRequest = Partial<CreateModuleRequest>;

export interface CreateLessonRequest {
  title: string;
  slug: string;
  contentMd?: string;
  estimatedMinutes?: number;
  status?: ContentStatus;
}

export type UpdateLessonRequest = Partial<CreateLessonRequest>;

export interface CreateExerciseRequest {
  type: ExerciseType;
  question: string;
  promptData: PromptData;
  answerData: AnswerData;
  explanation?: string;
  difficulty?: Difficulty;
  status?: ContentStatus;
}

export type UpdateExerciseRequest = Partial<
  Omit<CreateExerciseRequest, 'type'>
>;

export interface ReorderRequest {
  ids: string[];
}
