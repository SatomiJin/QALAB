import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt (used by Supabase Auth) only reads the first 72 bytes.
export const PASSWORD_MAX_LENGTH = 72;

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

function PasswordField(): PropertyDecorator {
  return (target, key) => {
    ApiProperty({
      example: 'correct-horse-battery',
      minLength: PASSWORD_MIN_LENGTH,
      maxLength: PASSWORD_MAX_LENGTH,
    })(target, key);
    IsString()(target, key);
    MinLength(PASSWORD_MIN_LENGTH)(target, key);
    MaxLength(PASSWORD_MAX_LENGTH)(target, key);
  };
}

function EmailField(): PropertyDecorator {
  return (target, key) => {
    ApiProperty({ example: 'learner@example.com', maxLength: 254 })(
      target,
      key,
    );
    Transform(normalizeEmail)(target, key);
    IsEmail()(target, key);
    MaxLength(254)(target, key);
  };
}

function TokenHashField(): PropertyDecorator {
  return (target, key) => {
    ApiProperty({ description: 'The `token_hash` from the email link' })(
      target,
      key,
    );
    IsString()(target, key);
    IsNotEmpty()(target, key);
    MaxLength(512)(target, key);
  };
}

export class RegisterDto {
  @EmailField()
  email: string;

  @PasswordField()
  password: string;

  @ApiProperty({ example: 'Minh', minLength: 1, maxLength: 80 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName: string;
}

export class LoginDto {
  @EmailField()
  email: string;

  // Login does not enforce the password policy: it only has to match.
  @ApiProperty({ example: 'correct-horse-battery' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}

export class EmailDto {
  @EmailField()
  email: string;
}

export const VERIFY_EMAIL_TYPES = ['signup', 'email'] as const;

export class VerifyEmailDto {
  @TokenHashField()
  tokenHash: string;

  @ApiProperty({ enum: VERIFY_EMAIL_TYPES, example: 'email' })
  @IsIn(VERIFY_EMAIL_TYPES)
  type: (typeof VERIFY_EMAIL_TYPES)[number];
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}

export class ResetPasswordDto {
  @TokenHashField()
  tokenHash: string;

  @PasswordField()
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword: string;

  @PasswordField()
  newPassword: string;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'learner@example.com' })
  email: string;

  @ApiProperty()
  emailVerified: boolean;
}

export class SessionDto {
  @ApiProperty({ description: 'JWT for `Authorization: Bearer`' })
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ description: 'Access token expiry, Unix epoch seconds' })
  expiresAt: number;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class MessageDto {
  @ApiProperty({ example: 'Check your email to verify your account.' })
  message: string;
}
