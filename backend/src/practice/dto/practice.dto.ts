import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  CourseRefDto,
  LessonRefDto,
  LocalizedDto,
  PAGE_SIZES,
  PageQueryDto,
  type PageSize,
  SkillRefDto,
} from '../../learning/dto/learning.dto.js';
import {
  DIFFICULTIES,
  type Difficulty,
  EXERCISE_TYPES,
  type ExerciseType,
} from '../exercise-schema.js';

export class LabelDto {
  @ApiProperty({ example: 'a' })
  id: string;

  @ApiProperty({ example: 'Boundary value analysis' })
  text: string;
}

/**
 * Public data needed to answer. `multiple_choice`: `options`, `multiple`.
 * `classification`: `categories`, `items`. Free-text types: empty.
 */
export class ExercisePromptDto {
  @ApiPropertyOptional({ type: [LabelDto] })
  options?: LabelDto[];

  @ApiPropertyOptional({
    description: 'More than one option may be correct (multiple_choice)',
  })
  multiple?: boolean;

  @ApiPropertyOptional({ type: [LabelDto] })
  categories?: LabelDto[];

  @ApiPropertyOptional({ type: [LabelDto] })
  items?: LabelDto[];
}

/** The current user's attempts at an exercise, summarised. */
export class ExerciseStatsDto {
  @ApiProperty({ example: 2 })
  attemptCount: number;

  @ApiProperty({ nullable: true, type: Number, example: 80 })
  bestScore: number | null;

  @ApiProperty({ nullable: true, type: Number, example: 60 })
  lastScore: number | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  lastAttemptedAt: string | null;

  @ApiProperty({ description: 'At least one attempt was correct / passed' })
  passed: boolean;
}

export class ExerciseSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: EXERCISE_TYPES })
  type: ExerciseType;

  @ApiProperty({ enum: DIFFICULTIES })
  difficulty: Difficulty;

  @ApiProperty({ description: 'The task, in Markdown (GFM)' })
  question: string;

  @ApiProperty({ type: LessonRefDto })
  lesson: LessonRefDto;

  @ApiProperty({ type: CourseRefDto })
  course: CourseRefDto;

  @ApiProperty({ type: SkillRefDto })
  skill: SkillRefDto;

  @ApiProperty({ type: ExerciseStatsDto })
  stats: ExerciseStatsDto;
}

export class ExercisePageDto extends LocalizedDto {
  @ApiProperty({ type: [ExerciseSummaryDto] })
  items: ExerciseSummaryDto[];

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ enum: PAGE_SIZES })
  pageSize: PageSize;
}

export class ExerciseDto extends ExerciseSummaryDto {
  @ApiProperty({ type: ExercisePromptDto })
  prompt: ExercisePromptDto;

  @ApiProperty({ enum: ['en', 'vi'] })
  language: LocalizedDto['language'];

  @ApiProperty({ enum: ['none', 'manual', 'machine', 'unavailable'] })
  translation: LocalizedDto['translation'];
}

export class SelfAssessmentValueDto {
  @ApiProperty({ type: [String], description: 'Rubric ids ticked' })
  checked: string[];
}

export class AttemptDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  exerciseId: string;

  @ApiProperty({ minimum: 0, maximum: 100, example: 75 })
  score: number;

  @ApiProperty({
    description:
      'Choice types: every answer right. Free-text types: score ≥ 70.',
  })
  isCorrect: boolean;

  @ApiProperty({
    type: Object,
    description:
      'The answer as graded (normalised: trimmed, empty steps removed)',
  })
  answer: Record<string, unknown>;

  @ApiProperty({
    type: Object,
    description:
      'Per type (`type` field): options / items right or wrong, required fields present, concepts matched, severity and priority match, score parts',
  })
  feedback: Record<string, unknown>;

  @ApiProperty({ type: SelfAssessmentValueDto, nullable: true })
  selfAssessment: SelfAssessmentValueDto | null;

  @ApiProperty({ format: 'date-time' })
  attemptedAt: string;
}

/** Shown once the learner has attempted the exercise. */
export class ReviewDto {
  @ApiProperty({ description: 'Why the answer is what it is, Markdown' })
  explanation: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Free-text types: a model answer, Markdown',
  })
  modelAnswer: string | null;

  @ApiProperty({
    type: [LabelDto],
    description: 'Free-text types: self-assessment checklist',
  })
  rubric: LabelDto[];
}

export class AttemptResultDto extends LocalizedDto {
  @ApiProperty({ type: AttemptDto })
  attempt: AttemptDto;

  @ApiProperty({ type: ReviewDto })
  review: ReviewDto;
}

export class AttemptPageDto extends LocalizedDto {
  @ApiProperty({ type: [AttemptDto], description: 'Newest first' })
  items: AttemptDto[];

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ enum: PAGE_SIZES })
  pageSize: PageSize;

  @ApiProperty({
    type: ReviewDto,
    nullable: true,
    description: 'Null until the first attempt',
  })
  review: ReviewDto | null;
}

export class ListExercisesQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    type: String,
    example: 'multiple_choice,classification',
    description: `One type or several, comma-separated: ${EXERCISE_TYPES.join(', ')}`,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(EXERCISE_TYPES.length)
  @IsIn(EXERCISE_TYPES, {
    each: true,
    message: `type must be one or more of ${EXERCISE_TYPES.join(', ')}`,
  })
  type?: ExerciseType[];

  @ApiPropertyOptional({
    example: 'test_design',
    description: 'Skill code. Unknown codes return an empty page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'skill must be a skill code' })
  skill?: string;

  @ApiPropertyOptional({ enum: DIFFICULTIES })
  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: Difficulty;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Only this lesson. A lesson you cannot see returns an empty page.',
  })
  @IsOptional()
  @IsUUID()
  lessonId?: string;
}

export class SubmitAttemptDto {
  @ApiProperty({
    type: Object,
    description:
      'Per type. `multiple_choice`: `{ selected: string[] }`. `classification`: `{ mapping: { [itemId]: categoryId } }` (every item). `test_case`: `{ testCaseId, title, preconditions, testData, steps: string[], expectedResult, priority, testType }`. `bug_report`: `{ bugId, title, environment, preconditions, stepsToReproduce: string[], actualResult, expectedResult, severity, priority, attachment }`. `scenario`: `{ text }`. Structured forms may be incomplete but not empty.',
    example: { selected: ['b'] },
  })
  @IsObject()
  answer: Record<string, unknown>;
}

export class SaveSelfAssessmentDto {
  @ApiProperty({
    type: [String],
    description: 'Rubric ids ticked (may be empty)',
  })
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  checked: string[];
}
