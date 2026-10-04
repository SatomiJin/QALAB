import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  USER_ROLES,
  type UserRole,
} from '../../auth/decorators/roles.decorator.js';
import { SkillProgressDto } from '../../dashboard/dto/dashboard.dto.js';
import { PAGE_SIZES, type PageSize } from '../../learning/dto/learning.dto.js';
import {
  EXERCISE_TYPES,
  type ExerciseType,
} from '../../practice/exercise-schema.js';
import {
  EXPERIENCE_LEVELS,
  type ExperienceLevel,
} from '../../profile/profiles.repository.js';
import { AUDIT_ACTIONS, type AuditAction } from '../admin-users.repository.js';
import { USER_STATUSES, type UserStatus } from '../user-rules.js';

/** Same limit as `frontend/src/types/api.ts`. */
export const USER_SEARCH_MAX_LENGTH = 100;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const toNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

// Requests ---------------------------------------------------------------------

export class ListAdminUsersQueryDto {
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
    maxLength: USER_SEARCH_MAX_LENGTH,
    description: 'Part of the email or display name (case-insensitive)',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(USER_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: USER_STATUSES,
    description:
      '`disabled`: banned by an admin; `unverified`: email not confirmed; `active`: neither',
  })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;
}

export class ChangeRoleDto {
  @ApiProperty({ enum: USER_ROLES })
  @IsIn(USER_ROLES)
  role: UserRole;
}

// Responses ---------------------------------------------------------------------

export class AdminUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ana@example.com' })
  email: string;

  @ApiProperty({ example: 'Ana' })
  displayName: string;

  @ApiProperty({ enum: USER_ROLES })
  role: UserRole;

  @ApiProperty({ enum: USER_STATUSES })
  status: UserStatus;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty({ description: 'Banned: cannot sign in or refresh a session' })
  disabled: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastSignInAt: string | null;

  @ApiProperty({ description: 'Completed lessons that are published' })
  lessonsCompleted: number;

  @ApiProperty({ description: 'Exercises with at least one attempt' })
  exercisesAttempted: number;
}

export class AdminUserPageDto {
  @ApiProperty({ type: [AdminUserSummaryDto] })
  items: AdminUserSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty({ enum: PAGE_SIZES })
  pageSize: PageSize;
}

export class AdminUserAttemptDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  exerciseId: string;

  @ApiProperty({ enum: EXERCISE_TYPES, nullable: true })
  exerciseType: ExerciseType | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The exercise question (Markdown, English)',
  })
  question: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  lessonId: string | null;

  @ApiProperty({ example: 80 })
  score: number;

  @ApiProperty()
  isCorrect: boolean;

  @ApiProperty({ format: 'date-time' })
  attemptedAt: string;
}

export class AuditActorDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  displayName: string;
}

export class AdminAuditEntryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: AUDIT_ACTIONS })
  action: AuditAction;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'learner',
    description: 'Role or status before',
  })
  from: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'admin',
    description: 'Role or status after',
  })
  to: string | null;

  @ApiProperty({
    type: AuditActorDto,
    nullable: true,
    description: 'null when the admin account no longer exists',
  })
  actor: AuditActorDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class AdminUserDto extends AdminUserSummaryDto {
  @ApiProperty({ enum: EXPERIENCE_LEVELS, nullable: true })
  experienceLevel: ExperienceLevel | null;

  @ApiProperty({ type: [String] })
  learningGoals: string[];

  @ApiProperty({
    type: [SkillProgressDto],
    description: 'Same figures as the learner dashboard',
  })
  skills: SkillProgressDto[];

  @ApiProperty({
    type: [AdminUserAttemptDto],
    description: 'Latest 10 attempts, scores only (no answers)',
  })
  recentAttempts: AdminUserAttemptDto[];

  @ApiProperty({
    type: [AdminAuditEntryDto],
    description: 'Latest 50 role and status changes, newest first',
  })
  auditLog: AdminAuditEntryDto[];
}
