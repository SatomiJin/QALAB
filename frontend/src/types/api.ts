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
