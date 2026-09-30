import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  LESSON_STATUSES,
  type LessonStatus,
} from '../lesson-progress.repository.js';
import type { ContinueReason } from '../outline.js';
import {
  CONTENT_LANGUAGES,
  type ContentLanguage,
  TRANSLATION_STATUSES,
  type TranslationStatus,
} from '../../translation/content-translation.service.js';

export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** Language fields on every response that carries content text. */
export class LocalizedDto {
  @ApiProperty({ enum: CONTENT_LANGUAGES, description: 'Language asked for' })
  language: ContentLanguage;

  @ApiProperty({
    enum: TRANSLATION_STATUSES,
    description:
      '`none`: English. `manual`: translated by a person. `machine`: machine-translated, at least in part (QA terms, code and links kept in English). `unavailable`: shown in English because no translation could be made.',
  })
  translation: TranslationStatus;
}

export class SkillDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'fundamentals' })
  code: string;

  @ApiProperty({ example: 'QA Fundamentals' })
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ example: 1 })
  orderIndex: number;
}

export class SkillRefDto {
  @ApiProperty({ example: 'fundamentals' })
  code: string;

  @ApiProperty({ example: 'QA Fundamentals' })
  name: string;
}

export class LessonProgressDto {
  @ApiProperty({ enum: LESSON_STATUSES })
  status: LessonStatus;

  @ApiProperty({ minimum: 0, maximum: 100, example: 40 })
  progressPercent: number;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  startedAt: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  completedAt: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  lastAccessedAt: string | null;
}

export class CourseProgressDto {
  @ApiProperty({ example: 4 })
  totalLessons: number;

  @ApiProperty({ example: 1 })
  completedLessons: number;

  @ApiProperty({
    enum: LESSON_STATUSES,
    description:
      '`completed` when every lesson is completed, `in_progress` once any lesson is opened',
  })
  status: LessonStatus;
}

export class CourseSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'qa-fundamentals-first-steps' })
  slug: string;

  @ApiProperty({ example: 'QA fundamentals: first steps' })
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: SkillRefDto })
  skill: SkillRefDto;

  @ApiProperty({ example: 1 })
  orderIndex: number;

  @ApiProperty({ example: 31, description: 'Sum of lesson estimates' })
  estimatedMinutes: number;

  @ApiProperty({ type: CourseProgressDto })
  progress: CourseProgressDto;
}

export class LessonSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'why-we-test' })
  slug: string;

  @ApiProperty({ example: 'Why we test' })
  title: string;

  @ApiProperty({ example: 6 })
  estimatedMinutes: number;

  @ApiProperty({ type: LessonProgressDto })
  progress: LessonProgressDto;
}

export class ModuleDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'What testing is' })
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [LessonSummaryDto] })
  lessons: LessonSummaryDto[];
}

export class CourseDetailDto extends CourseSummaryDto {
  @ApiProperty({ type: [ModuleDto] })
  modules: ModuleDto[];

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'First lesson not completed yet; null when all are done',
  })
  nextLessonId: string | null;

  @ApiProperty({ enum: CONTENT_LANGUAGES })
  language: ContentLanguage;

  @ApiProperty({ enum: TRANSLATION_STATUSES })
  translation: TranslationStatus;
}

export class CoursePageDto extends LocalizedDto {
  @ApiProperty({ type: [CourseSummaryDto] })
  items: CourseSummaryDto[];

  @ApiProperty({ example: 1, description: 'Courses matching the filter' })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ enum: PAGE_SIZES })
  pageSize: PageSize;
}

export class CourseRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'qa-fundamentals-first-steps' })
  slug: string;

  @ApiProperty({ example: 'QA fundamentals: first steps' })
  title: string;
}

export class ModuleRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'What testing is' })
  title: string;
}

export class LessonRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Errors, defects and failures' })
  title: string;
}

export class LessonDto extends LocalizedDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'why-we-test' })
  slug: string;

  @ApiProperty({ example: 'Why we test' })
  title: string;

  @ApiProperty({ description: 'Lesson body in Markdown (GFM)' })
  contentMd: string;

  @ApiProperty({ example: 6 })
  estimatedMinutes: number;

  @ApiProperty({ type: CourseRefDto })
  course: CourseRefDto;

  @ApiProperty({ type: ModuleRefDto })
  module: ModuleRefDto;

  @ApiProperty({ type: LessonRefDto, nullable: true })
  previousLesson: LessonRefDto | null;

  @ApiProperty({ type: LessonRefDto, nullable: true })
  nextLesson: LessonRefDto | null;

  @ApiProperty({ type: LessonProgressDto })
  progress: LessonProgressDto;
}

export class ContinueLessonDto {
  @ApiProperty({
    enum: ['start', 'resume', 'next'],
    description:
      '`start`: no progress yet. `resume`: an unfinished lesson. `next`: the lesson after the last completed one.',
  })
  reason: ContinueReason;

  @ApiProperty({ format: 'uuid' })
  lessonId: string;

  @ApiProperty({ example: 'Errors, defects and failures' })
  lessonTitle: string;

  @ApiProperty({ example: 7 })
  estimatedMinutes: number;

  @ApiProperty({ type: CourseRefDto })
  course: CourseRefDto;

  @ApiProperty({ type: ModuleRefDto })
  module: ModuleRefDto;

  @ApiProperty({ type: LessonProgressDto })
  progress: LessonProgressDto;
}

export class ContinueDto extends LocalizedDto {
  @ApiProperty({
    type: ContinueLessonDto,
    nullable: true,
    description: 'Null when every published lesson is completed',
  })
  item: ContinueLessonDto | null;
}

const toNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

/** `?lang=` on endpoints that return content text. Default English. */
export class LanguageQueryDto {
  @ApiPropertyOptional({ enum: CONTENT_LANGUAGES, default: 'en' })
  @IsOptional()
  @IsIn(CONTENT_LANGUAGES)
  lang: ContentLanguage = 'en';
}

/** `?page=&pageSize=` (and `?lang=`) on paginated lists. */
export class PageQueryDto extends LanguageQueryDto {
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
}

export class ListCoursesQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    example: 'fundamentals',
    description: 'Skill code. Unknown codes return an empty page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'skill must be a skill code' })
  skill?: string;
}

/**
 * Records a visit. An empty body marks the lesson opened (in progress).
 * Progress never goes backwards and a completed lesson stays completed.
 */
export class UpdateLessonProgressDto {
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    description: 'How far the learner has read. Lower values are ignored.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional({
    description: '`true` marks the lesson completed. `false` has no effect.',
  })
  @IsOptional()
  @IsBoolean()
  complete?: boolean;
}
