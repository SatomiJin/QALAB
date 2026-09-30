import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PAGE_SIZES, type PageSize } from '../../learning/dto/learning.dto.js';
import {
  DIFFICULTIES,
  type Difficulty,
  EXERCISE_TYPES,
  type ExerciseType,
} from '../../practice/exercise-schema.js';
import { CONTENT_STATUSES, type ContentStatus } from '../content-rules.js';

/** Same limits as the DB checks and `frontend/src/types/api.ts`. */
export const CONTENT_LIMITS = {
  titleLength: 160,
  slugLength: 100,
  descriptionLength: 2000,
  contentLength: 100_000,
  minutesMin: 1,
  minutesMax: 600,
  questionLength: 2000,
  explanationLength: 10_000,
  reorderItems: 500,
} as const;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MESSAGE =
  'slug must be lowercase letters, digits and single dashes (e.g. boundary-values)';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const toNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

// Shared request fields -----------------------------------------------------

class TitleFields {
  @ApiProperty({ maxLength: CONTENT_LIMITS.titleLength })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_LIMITS.titleLength)
  title: string;
}

class SlugFields extends TitleFields {
  @ApiProperty({
    maxLength: CONTENT_LIMITS.slugLength,
    example: 'boundary-values',
    description: 'Lowercase a-z, 0-9 and single dashes',
  })
  @Transform(trim)
  @IsString()
  @MaxLength(CONTENT_LIMITS.slugLength)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug: string;
}

const statusProperty = {
  enum: CONTENT_STATUSES,
  description:
    'Learners see an item only when it and every parent are `published`',
};

// Courses -------------------------------------------------------------------

export class ListAdminCoursesQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  page: number = 1;

  @ApiPropertyOptional({ enum: PAGE_SIZES, default: 20 })
  @Transform(toNumber)
  @IsOptional()
  @IsIn(PAGE_SIZES, { message: 'pageSize must be one of 20, 50, 100' })
  pageSize: PageSize = 20;

  @ApiPropertyOptional({
    example: 'fundamentals',
    description: 'Skill code. Unknown codes return an empty page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'skill must be a skill code' })
  skill?: string;

  @ApiPropertyOptional({ enum: CONTENT_STATUSES })
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

export class CreateCourseDto extends SlugFields {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  skillId: string;

  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.descriptionLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.descriptionLength)
  description?: string;
}

/**
 * Every field optional; an empty body returns the course unchanged. The
 * status changes only through publish / unpublish / archive.
 */
export class UpdateCourseDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Moves the course to the end of that skill',
  })
  @IsOptional()
  @IsUUID()
  skillId?: string;

  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.titleLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_LIMITS.titleLength)
  title?: string;

  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.slugLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.slugLength)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.descriptionLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.descriptionLength)
  description?: string;
}

export class ReorderDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'Every child of the parent exactly once, in the new order (first = 1)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(CONTENT_LIMITS.reorderItems)
  @IsUUID('all', { each: true })
  ids: string[];
}

export class ReorderCoursesDto extends ReorderDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Courses are ordered within a skill',
  })
  @IsUUID()
  skillId: string;
}

// Modules -------------------------------------------------------------------

export class CreateModuleDto extends TitleFields {
  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.descriptionLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.descriptionLength)
  description?: string;

  @ApiPropertyOptional({ ...statusProperty, default: 'draft' })
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

export class UpdateModuleDto {
  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.titleLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_LIMITS.titleLength)
  title?: string;

  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.descriptionLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.descriptionLength)
  description?: string;

  @ApiPropertyOptional(statusProperty)
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

// Lessons -------------------------------------------------------------------

export class CreateLessonDto extends SlugFields {
  @ApiPropertyOptional({
    maxLength: CONTENT_LIMITS.contentLength,
    description: 'Markdown (GFM), no raw HTML rendered',
  })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.contentLength)
  contentMd?: string;

  @ApiPropertyOptional({
    minimum: CONTENT_LIMITS.minutesMin,
    maximum: CONTENT_LIMITS.minutesMax,
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(CONTENT_LIMITS.minutesMin)
  @Max(CONTENT_LIMITS.minutesMax)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ ...statusProperty, default: 'draft' })
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

export class UpdateLessonDto {
  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.titleLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_LIMITS.titleLength)
  title?: string;

  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.slugLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.slugLength)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.contentLength })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.contentLength)
  contentMd?: string;

  @ApiPropertyOptional({
    minimum: CONTENT_LIMITS.minutesMin,
    maximum: CONTENT_LIMITS.minutesMax,
  })
  @IsOptional()
  @IsInt()
  @Min(CONTENT_LIMITS.minutesMin)
  @Max(CONTENT_LIMITS.minutesMax)
  estimatedMinutes?: number;

  @ApiPropertyOptional(statusProperty)
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

// Exercises -----------------------------------------------------------------

const promptDataDescription =
  'Public data, per type. `multiple_choice`: `{ options: [{ id, text }] (2-8), multiple }`. `classification`: `{ categories: [{ id, text }] (2-6), items: [{ id, text }] (2-20) }`. Free-text types: `{}`. Ids: lowercase a-z, 0-9, - or _.';
const answerDataDescription =
  'Answer key, per type, checked against the prompt. `multiple_choice`: `{ correct: [optionId] }`. `classification`: `{ mapping: { [itemId]: categoryId } }` (every item). `test_case`: `{ requiredFields, expectedConcepts, modelAnswer, rubric }`. `bug_report`: `{ requiredFields, expectedSeverity, expectedPriority, expectedConcepts, modelAnswer, rubric }`. `scenario`: `{ expectedConcepts (≥ 1), modelAnswer, rubric }`. Concepts: `{ concept, keywords: string[] }`.';

export class CreateExerciseDto {
  @ApiProperty({ enum: EXERCISE_TYPES, description: 'Cannot change later' })
  @IsIn(EXERCISE_TYPES)
  type: ExerciseType;

  @ApiProperty({
    maxLength: CONTENT_LIMITS.questionLength,
    description: 'The task, Markdown',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_LIMITS.questionLength)
  question: string;

  @ApiProperty({ type: Object, description: promptDataDescription })
  @IsObject()
  promptData: Record<string, unknown>;

  @ApiProperty({ type: Object, description: answerDataDescription })
  @IsObject()
  answerData: Record<string, unknown>;

  @ApiPropertyOptional({
    maxLength: CONTENT_LIMITS.explanationLength,
    description: 'Shown after an attempt, Markdown',
  })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.explanationLength)
  explanation?: string;

  @ApiPropertyOptional({ enum: DIFFICULTIES, default: 'easy' })
  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: Difficulty;

  @ApiPropertyOptional({ ...statusProperty, default: 'draft' })
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

/**
 * Every field optional. A new `promptData` is checked with the answer key
 * (the new one if given, else the stored one). Once learners have attempted
 * the exercise, option / item / category ids cannot change.
 */
export class UpdateExerciseDto {
  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.questionLength })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_LIMITS.questionLength)
  question?: string;

  @ApiPropertyOptional({ type: Object, description: promptDataDescription })
  @IsOptional()
  @IsObject()
  promptData?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object, description: answerDataDescription })
  @IsOptional()
  @IsObject()
  answerData?: Record<string, unknown>;

  @ApiPropertyOptional({ maxLength: CONTENT_LIMITS.explanationLength })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_LIMITS.explanationLength)
  explanation?: string;

  @ApiPropertyOptional({ enum: DIFFICULTIES })
  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: Difficulty;

  @ApiPropertyOptional(statusProperty)
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

// Responses -----------------------------------------------------------------

export class AdminSkillRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'fundamentals' })
  code: string;

  @ApiProperty({ example: 'QA Fundamentals' })
  name: string;
}

export class AdminRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty(statusProperty)
  status: ContentStatus;
}

export class AdminCourseRefDto extends AdminRefDto {
  @ApiProperty({ example: 'qa-fundamentals-first-steps' })
  slug: string;
}

class AdminNodeDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty(statusProperty)
  status: ContentStatus;

  @ApiProperty({ example: 1 })
  orderIndex: number;

  @ApiProperty({
    description:
      'Learner progress or attempts exist here or below: archive instead of delete',
  })
  inUse: boolean;
}

export class AdminExerciseSummaryDto extends AdminNodeDto {
  @ApiProperty({ enum: EXERCISE_TYPES })
  type: ExerciseType;

  @ApiProperty({ enum: DIFFICULTIES })
  difficulty: Difficulty;

  @ApiProperty({ description: 'Markdown' })
  question: string;

  @ApiProperty({
    type: Object,
    description: 'Public prompt data (options, items, categories)',
  })
  promptData: Record<string, unknown>;
}

export class AdminLessonSummaryDto extends AdminNodeDto {
  @ApiProperty({ example: 'why-we-test' })
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ example: 6 })
  estimatedMinutes: number;

  @ApiProperty({ type: [AdminExerciseSummaryDto] })
  exercises: AdminExerciseSummaryDto[];
}

export class AdminModuleDto extends AdminNodeDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [AdminLessonSummaryDto] })
  lessons: AdminLessonSummaryDto[];
}

export class AdminCourseSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'qa-fundamentals-first-steps' })
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty(statusProperty)
  status: ContentStatus;

  @ApiProperty({ example: 1, description: 'Order within the skill' })
  orderIndex: number;

  @ApiProperty({ type: AdminSkillRefDto })
  skill: AdminSkillRefDto;

  @ApiProperty({ example: 2 })
  moduleCount: number;

  @ApiProperty({ example: 4 })
  lessonCount: number;

  @ApiProperty({
    example: 3,
    description: 'Published lessons in published modules',
  })
  publishedLessonCount: number;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class AdminCoursePageDto {
  @ApiProperty({ type: [AdminCourseSummaryDto] })
  items: AdminCourseSummaryDto[];

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ enum: PAGE_SIZES })
  pageSize: PageSize;
}

export class AdminCourseDto extends AdminNodeDto {
  @ApiProperty({ example: 'qa-fundamentals-first-steps' })
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: AdminSkillRefDto })
  skill: AdminSkillRefDto;

  @ApiProperty({
    description:
      'At least one published lesson in a published module (required to publish)',
  })
  canPublish: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;

  @ApiProperty({ type: [AdminModuleDto] })
  modules: AdminModuleDto[];
}

export class AdminLessonDto extends AdminNodeDto {
  @ApiProperty({ example: 'why-we-test' })
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ description: 'Markdown (GFM)' })
  contentMd: string;

  @ApiProperty({ example: 6 })
  estimatedMinutes: number;

  @ApiProperty({
    description: 'The lesson, its module and its course are published',
  })
  visibleToLearners: boolean;

  @ApiProperty({ type: AdminRefDto })
  module: AdminRefDto;

  @ApiProperty({ type: AdminCourseRefDto })
  course: AdminCourseRefDto;

  @ApiProperty({ type: [AdminExerciseSummaryDto] })
  exercises: AdminExerciseSummaryDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class AdminExerciseDto extends AdminExerciseSummaryDto {
  @ApiProperty({
    type: Object,
    nullable: true,
    description: 'The answer key (admins only). Null if it is missing.',
  })
  answerData: Record<string, unknown> | null;

  @ApiProperty({ description: 'Shown after an attempt, Markdown' })
  explanation: string;

  @ApiProperty({
    description: 'The exercise and its lesson, module and course are published',
  })
  visibleToLearners: boolean;

  @ApiProperty({ type: AdminRefDto })
  lesson: AdminRefDto;

  @ApiProperty({ type: AdminRefDto })
  module: AdminRefDto;

  @ApiProperty({ type: AdminCourseRefDto })
  course: AdminCourseRefDto;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}
