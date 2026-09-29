import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import type { UserRole } from '../../auth/decorators/roles.decorator.js';
import {
  EXPERIENCE_LEVELS,
  type ExperienceLevel,
} from '../profiles.repository.js';

export const MAX_LEARNING_GOALS = 10;
export const MAX_LEARNING_GOAL_LENGTH = 200;

export class ProfileDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'learner@example.com' })
  email: string;

  @ApiProperty({ example: 'Minh' })
  displayName: string;

  @ApiProperty({ enum: EXPERIENCE_LEVELS, nullable: true })
  experienceLevel: ExperienceLevel | null;

  @ApiProperty({ type: [String], example: ['Write better bug reports'] })
  learningGoals: string[];

  @ApiProperty({ enum: ['learner', 'admin'] })
  role: UserRole;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

/** Fields a user may change. `role` is not accepted (400 unknown field). */
export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName?: string;

  @ApiPropertyOptional({ enum: EXPERIENCE_LEVELS, nullable: true })
  @IsOptional()
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: ExperienceLevel | null;

  @ApiPropertyOptional({
    type: [String],
    maxItems: MAX_LEARNING_GOALS,
    description: `Up to ${MAX_LEARNING_GOALS} goals, ${MAX_LEARNING_GOAL_LENGTH} characters each`,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((goal) => (typeof goal === 'string' ? goal.trim() : goal))
          .filter((goal) => goal !== '')
      : value,
  )
  @IsArray()
  @ArrayMaxSize(MAX_LEARNING_GOALS)
  @IsString({ each: true })
  @MaxLength(MAX_LEARNING_GOAL_LENGTH, { each: true })
  learningGoals?: string[];
}
