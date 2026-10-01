import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsTimeZone, MaxLength } from 'class-validator';
import {
  ContinueLessonDto,
  CourseRefDto,
  CourseSummaryDto,
  LanguageQueryDto,
  LessonProgressDto,
  LessonRefDto,
  ListCoursesQueryDto,
  LocalizedDto,
  PAGE_SIZES,
  type PageSize,
} from '../../learning/dto/learning.dto.js';
import {
  LESSON_STATUSES,
  type LessonStatus,
} from '../../learning/lesson-progress.repository.js';
import { ExerciseStatsDto } from '../../practice/dto/practice.dto.js';
import {
  DIFFICULTIES,
  type Difficulty,
  EXERCISE_TYPES,
  type ExerciseType,
} from '../../practice/exercise-schema.js';
import { ACTIVITY_KINDS, type ActivityKind } from '../dashboard.repository.js';

export const TIME_ZONE_MAX_LENGTH = 64;

export class DashboardQueryDto extends LanguageQueryDto {
  @ApiPropertyOptional({
    example: 'Asia/Ho_Chi_Minh',
    default: 'UTC',
    description: 'IANA time zone for the streak days',
  })
  @IsOptional()
  @IsString()
  @MaxLength(TIME_ZONE_MAX_LENGTH)
  @IsTimeZone({ message: 'tz must be an IANA time zone' })
  tz: string = 'UTC';
}

export class ExerciseTotalsDto {
  @ApiProperty({ example: 12, description: 'Published exercises' })
  total: number;

  @ApiProperty({ example: 5, description: 'Exercises with an attempt' })
  attempted: number;

  @ApiProperty({ example: 3, description: 'Exercises with a passing attempt' })
  passed: number;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 74,
    description: 'Mean of the best score per attempted exercise',
  })
  averageScore: number | null;
}

export class OverallProgressDto {
  @ApiProperty({ example: 12 })
  totalLessons: number;

  @ApiProperty({ example: 4 })
  completedLessons: number;

  @ApiProperty({ example: 33, description: 'Completed lessons, in %' })
  percent: number;

  @ApiProperty({ type: ExerciseTotalsDto })
  exercises: ExerciseTotalsDto;
}

export class StreakDayDto {
  @ApiProperty({ example: '2026-09-30', description: 'Local date' })
  date: string;

  @ApiProperty()
  active: boolean;
}

export class StreakDto {
  @ApiProperty({
    example: 3,
    description:
      'Consecutive days with study up to today (or up to yesterday, if nothing yet today)',
  })
  current: number;

  @ApiProperty({ example: 5 })
  longest: number;

  @ApiProperty()
  activeToday: boolean;

  @ApiProperty({
    type: [StreakDayDto],
    description: 'The last 14 days, oldest first, ending today',
  })
  days: StreakDayDto[];
}

export class SkillProgressDto {
  @ApiProperty({ example: 'fundamentals' })
  code: string;

  @ApiProperty({ example: 'QA Fundamentals' })
  name: string;

  @ApiProperty({ example: 4 })
  totalLessons: number;

  @ApiProperty({ example: 1 })
  completedLessons: number;

  @ApiProperty({ example: 25, description: 'Completed lessons, in %' })
  percent: number;

  @ApiProperty({
    enum: LESSON_STATUSES,
    description: 'Same rule as a course',
  })
  status: LessonStatus;

  @ApiProperty({ type: ExerciseTotalsDto })
  exercises: ExerciseTotalsDto;
}

export class ExerciseRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: EXERCISE_TYPES })
  type: ExerciseType;
}

export class RetryExerciseDto extends ExerciseRefDto {
  @ApiProperty({ example: 40 })
  bestScore: number;
}

export class WeakSkillDto {
  @ApiProperty({ example: 'test_design' })
  code: string;

  @ApiProperty({ example: 'Test Design' })
  name: string;

  @ApiProperty({ example: 55 })
  averageScore: number;

  @ApiProperty({ example: 3 })
  attemptedExercises: number;

  @ApiProperty({ example: 1 })
  passedExercises: number;

  @ApiProperty({
    type: RetryExerciseDto,
    nullable: true,
    description: 'The failed exercise with the lowest best score',
  })
  retry: RetryExerciseDto | null;
}

export class WeakConceptDto {
  @ApiProperty({ example: 'Boundary values' })
  concept: string;

  @ApiProperty({ example: 2, description: 'Best answers that missed it' })
  missed: number;

  @ApiProperty({ example: 3, description: 'Best answers checked for it' })
  checked: number;
}

export class WeakAreasDto {
  @ApiProperty({
    type: [WeakSkillDto],
    description: 'Skills below the pass mark (70), lowest first, at most 3',
  })
  skills: WeakSkillDto[];

  @ApiProperty({
    type: [WeakConceptDto],
    description: 'Concepts most often missed in free-text answers, at most 5',
  })
  concepts: WeakConceptDto[];
}

export class ActivityDto {
  @ApiProperty({ enum: ACTIVITY_KINDS })
  kind: ActivityKind;

  @ApiProperty({ format: 'date-time' })
  occurredAt: string;

  @ApiProperty({ type: LessonRefDto })
  lesson: LessonRefDto;

  @ApiProperty({ type: CourseRefDto })
  course: CourseRefDto;

  @ApiProperty({ type: ExerciseRefDto, nullable: true })
  exercise: ExerciseRefDto | null;

  @ApiProperty({ nullable: true, type: Number, description: 'Attempts only' })
  score: number | null;

  @ApiProperty({ nullable: true, type: Boolean, description: 'Attempts only' })
  isCorrect: boolean | null;
}

export class DashboardDto extends LocalizedDto {
  @ApiProperty({ type: OverallProgressDto })
  overall: OverallProgressDto;

  @ApiProperty({ type: StreakDto })
  streak: StreakDto;

  @ApiProperty({
    type: ContinueLessonDto,
    nullable: true,
    description: 'Same choice as GET /continue',
  })
  continue: ContinueLessonDto | null;

  @ApiProperty({
    type: [SkillProgressDto],
    description: 'Every skill, in order',
  })
  skills: SkillProgressDto[];

  @ApiProperty({ type: WeakAreasDto })
  weakAreas: WeakAreasDto;

  @ApiProperty({
    type: [ActivityDto],
    description: 'The latest 10 events on published content, newest first',
  })
  recentActivity: ActivityDto[];

  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' })
  timeZone: string;
}

// Progress page ---------------------------------------------------------------

export class ProgressQueryDto extends ListCoursesQueryDto {}

export class ExerciseResultDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: EXERCISE_TYPES })
  type: ExerciseType;

  @ApiProperty({ enum: DIFFICULTIES })
  difficulty: Difficulty;

  @ApiProperty({ description: 'Markdown' })
  question: string;

  @ApiProperty({ type: ExerciseStatsDto })
  stats: ExerciseStatsDto;
}

export class LessonResultDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Why we test' })
  title: string;

  @ApiProperty({ example: 6 })
  estimatedMinutes: number;

  @ApiProperty({ type: LessonProgressDto })
  progress: LessonProgressDto;

  @ApiProperty({ type: [ExerciseResultDto] })
  exercises: ExerciseResultDto[];
}

export class ModuleResultDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'What testing is' })
  title: string;

  @ApiProperty({ type: [LessonResultDto] })
  lessons: LessonResultDto[];
}

export class CourseResultDto extends CourseSummaryDto {
  @ApiProperty({ type: ExerciseTotalsDto })
  exercises: ExerciseTotalsDto;

  @ApiProperty({ type: [ModuleResultDto] })
  modules: ModuleResultDto[];
}

export class ProgressPageDto extends LocalizedDto {
  @ApiProperty({ type: [CourseResultDto] })
  items: CourseResultDto[];

  @ApiProperty({ example: 1, description: 'Courses matching the filter' })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ enum: PAGE_SIZES })
  pageSize: PageSize;
}
