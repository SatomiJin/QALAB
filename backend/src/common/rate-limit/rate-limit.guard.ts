import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../auth/auth-user.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { FixedWindowCounter } from './fixed-window.js';

/**
 * Named limits, per minute:
 * - `auth`: each `/auth/*` endpoint, per client IP (`AUTH_RATE_LIMIT`).
 * - `attempts`: attempt submission, per user (`ATTEMPT_RATE_LIMIT`; the
 *   global `JwtAuthGuard` has already set `req.user`).
 */
export type RateLimitName = 'auth' | 'attempts';

const RATE_LIMIT_KEY = 'rateLimit';
const WINDOW_MS = 60_000;
export const RATE_LIMIT_MESSAGE = 'Too many requests. Try again later.';

/** Applies a named rate limit to a controller or route. */
export const RateLimit = (name: RateLimitName) =>
  applyDecorators(SetMetadata(RATE_LIMIT_KEY, name), UseGuards(RateLimitGuard));

/** Counters shared by every guarded route of the process. */
@Injectable()
export class RateLimitStore {
  readonly counter = new FixedWindowCounter();
}

/**
 * Counts the request against its route's named limit and answers `429` with
 * `Retry-After` once the limit is reached. Each route has its own budget.
 * (Replaces `@nestjs/throttler`, which is CommonJS and `require()`s the ESM
 * `@nestjs/common` 12: that crashes on hosts whose loader cannot require ES
 * modules, such as Vercel Functions.)
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
    private readonly store: RateLimitStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const name = this.reflector.getAllAndOverride<RateLimitName | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!name) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();
    // `req.ip` honours TRUST_PROXY_HOPS (the client IP behind the host's proxy).
    const who =
      name === 'attempts' && req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const limit =
      name === 'auth'
        ? this.config.authRateLimit
        : this.config.attemptRateLimit;

    const result = this.store.counter.hit(
      `${name}:${route}:${who}`,
      limit,
      WINDOW_MS,
      Date.now(),
    );
    if (result.allowed) return true;

    http
      .getResponse<Response>()
      .setHeader('Retry-After', String(result.retryAfterSeconds));
    throw new HttpException(RATE_LIMIT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
  }
}
