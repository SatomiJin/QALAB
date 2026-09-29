import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthError, Session } from '@supabase/supabase-js';
import { AppConfigService } from '../config/app-config.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { AuthUser } from './auth-user.js';
import {
  ChangePasswordDto,
  LoginDto,
  MessageDto,
  RegisterDto,
  ResetPasswordDto,
  SessionDto,
  VerifyEmailDto,
} from './dto/auth.dto.js';

export const MESSAGES = {
  registered: 'Check your email to verify your account.',
  verificationSent:
    'If this email has an unverified account, a new verification link has been sent.',
  resetSent:
    'If an account exists for this email, a password reset link has been sent.',
  passwordReset: 'Your password has been reset. Sign in with the new password.',
  passwordChanged: 'Your password has been changed.',
  invalidCredentials: 'Invalid email or password',
  emailNotVerified: 'Email not verified',
  invalidRefreshToken: 'Invalid or expired refresh token',
  invalidVerifyLink: 'Verification link is invalid or has expired',
  invalidResetLink: 'Reset link is invalid or has expired',
  currentPasswordIncorrect: 'Current password is incorrect',
  samePassword: 'New password must be different from the current password',
  weakPassword: 'Password does not meet the password policy',
  tooManyRequests: 'Too many requests. Try again later.',
  unavailable: 'Authentication service is unavailable. Try again later.',
} as const;

function isRateLimited(error: AuthError): boolean {
  return error.status === 429 || (error.code ?? '').startsWith('over_');
}

/**
 * Errors that mean "not your fault": rate limits and Supabase outages.
 * Returns null for errors the caller should map itself.
 */
function upstreamError(error: AuthError): HttpException | null {
  if (isRateLimited(error)) {
    return new HttpException(
      MESSAGES.tooManyRequests,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (error.name === 'AuthRetryableFetchError' || (error.status ?? 0) >= 500) {
    return new ServiceUnavailableException(MESSAGES.unavailable);
  }
  return null;
}

function fieldError(field: string, message: string, summary = message) {
  return new BadRequestException({
    message: summary,
    details: [{ field, message }],
  });
}

function passwordError(error: AuthError, field: string): HttpException | null {
  if (error.code === 'same_password') {
    return fieldError(field, MESSAGES.samePassword);
  }
  if (error.code === 'weak_password') {
    return fieldError(field, MESSAGES.weakPassword);
  }
  return null;
}

export function toSessionDto(session: Session): SessionDto {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt:
      session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      emailVerified: Boolean(session.user.email_confirmed_at),
    },
  };
}

/**
 * Wraps Supabase Auth. Every call uses a fresh anonymous client so sessions
 * never leak between requests. Never log emails, passwords or tokens.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: AppConfigService,
  ) {}

  private redirect(path: string): string {
    return `${this.config.frontendUrl.replace(/\/+$/, '')}${path}`;
  }

  private logFailure(action: string, error: AuthError): void {
    // Supabase messages describe the failure (e.g. "Error sending
    // confirmation email"); strip anything that looks like an email.
    const detail = error.message
      .replace(/[^\s@]+@[^\s@]+/g, '<email>')
      .slice(0, 200);
    this.logger.warn(
      `${action} failed: ${error.code ?? error.name} (${error.status ?? '-'}): ${detail}`,
    );
  }

  async register(dto: RegisterDto): Promise<MessageDto> {
    const { error } = await this.supabase.anon().auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: { display_name: dto.displayName },
        emailRedirectTo: this.redirect('/auth/verify'),
      },
    });

    if (error) {
      this.logFailure('register', error);
      const mapped = upstreamError(error) ?? passwordError(error, 'password');
      if (mapped) throw mapped;
      // An existing email must look exactly like a new signup.
      if (
        error.code !== 'user_already_exists' &&
        error.code !== 'email_exists'
      ) {
        if (error.code === 'email_address_invalid') {
          throw fieldError('email', 'email must be an email');
        }
        throw new ServiceUnavailableException(MESSAGES.unavailable);
      }
    }

    return { message: MESSAGES.registered };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<SessionDto> {
    const { data, error } = await this.supabase.anon().auth.verifyOtp({
      token_hash: dto.tokenHash,
      type: dto.type,
    });

    if (error) {
      this.logFailure('verify-email', error);
      throw (
        upstreamError(error) ??
        new BadRequestException(MESSAGES.invalidVerifyLink)
      );
    }
    if (!data.session) {
      throw new BadRequestException(MESSAGES.invalidVerifyLink);
    }
    return toSessionDto(data.session);
  }

  async resendVerification(email: string): Promise<MessageDto> {
    const { error } = await this.supabase.anon().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: this.redirect('/auth/verify') },
    });
    // Always the same answer, so the response does not reveal accounts.
    if (error) this.logFailure('resend-verification', error);
    return { message: MESSAGES.verificationSent };
  }

  async login(dto: LoginDto): Promise<SessionDto> {
    const { data, error } = await this.supabase
      .anon()
      .auth.signInWithPassword({ email: dto.email, password: dto.password });

    if (error) {
      this.logFailure('login', error);
      const upstream = upstreamError(error);
      if (upstream) throw upstream;
      // Supabase checks the password before confirmation, so this is only
      // reachable with the right password: it does not enumerate accounts.
      if (error.code === 'email_not_confirmed') {
        throw new ForbiddenException(MESSAGES.emailNotVerified);
      }
      throw new UnauthorizedException(MESSAGES.invalidCredentials);
    }
    return toSessionDto(data.session);
  }

  async refresh(refreshToken: string): Promise<SessionDto> {
    const { data, error } = await this.supabase
      .anon()
      .auth.refreshSession({ refresh_token: refreshToken });

    if (error) {
      this.logFailure('refresh', error);
      throw (
        upstreamError(error) ??
        new UnauthorizedException(MESSAGES.invalidRefreshToken)
      );
    }
    if (!data.session) {
      throw new UnauthorizedException(MESSAGES.invalidRefreshToken);
    }
    return toSessionDto(data.session);
  }

  /** Revokes the current session, so its refresh token stops working. */
  async logout(user: AuthUser): Promise<void> {
    const { error } = await this.supabase
      .service()
      .auth.admin.signOut(user.accessToken, 'local');

    // An already-revoked session is the outcome we want.
    if (error && error.status !== 401 && error.status !== 404) {
      this.logFailure('logout', error);
      throw (
        upstreamError(error) ??
        new ServiceUnavailableException(MESSAGES.unavailable)
      );
    }
  }

  async forgotPassword(email: string): Promise<MessageDto> {
    const { error } = await this.supabase
      .anon()
      .auth.resetPasswordForEmail(email, {
        redirectTo: this.redirect('/auth/reset-password'),
      });
    if (error) this.logFailure('forgot-password', error);
    return { message: MESSAGES.resetSent };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageDto> {
    const client = this.supabase.anon();
    const { error: verifyError } = await client.auth.verifyOtp({
      token_hash: dto.tokenHash,
      type: 'recovery',
    });
    if (verifyError) {
      this.logFailure('reset-password', verifyError);
      throw (
        upstreamError(verifyError) ??
        new BadRequestException(MESSAGES.invalidResetLink)
      );
    }

    // The client now holds the short-lived recovery session (in memory).
    const { error } = await client.auth.updateUser({
      password: dto.newPassword,
    });
    if (error) {
      this.logFailure('reset-password update', error);
      throw (
        upstreamError(error) ??
        passwordError(error, 'newPassword') ??
        new BadRequestException(MESSAGES.invalidResetLink)
      );
    }

    // Sign out every device: whoever had the old password is out.
    const { error: signOutError } = await client.auth.signOut({
      scope: 'global',
    });
    if (signOutError) this.logFailure('reset-password sign-out', signOutError);

    return { message: MESSAGES.passwordReset };
  }

  async changePassword(
    user: AuthUser,
    dto: ChangePasswordDto,
  ): Promise<MessageDto> {
    // Re-check the current password with a temporary session.
    const client = this.supabase.anon();
    const { error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password: dto.currentPassword,
    });
    if (signInError) {
      this.logFailure('change-password check', signInError);
      throw (
        upstreamError(signInError) ??
        fieldError(
          'currentPassword',
          'currentPassword is incorrect',
          MESSAGES.currentPasswordIncorrect,
        )
      );
    }

    const { error } = await client.auth.updateUser({
      password: dto.newPassword,
    });

    // Drop the temporary session whatever happened above.
    const { error: signOutError } = await client.auth.signOut({
      scope: 'local',
    });
    if (signOutError) this.logFailure('change-password sign-out', signOutError);

    if (error) {
      this.logFailure('change-password update', error);
      throw (
        upstreamError(error) ??
        passwordError(error, 'newPassword') ??
        new ServiceUnavailableException(MESSAGES.unavailable)
      );
    }
    return { message: MESSAGES.passwordChanged };
  }
}
