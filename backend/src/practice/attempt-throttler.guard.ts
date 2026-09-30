import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../auth/auth-user.js';

/**
 * Rate limit for attempt submission, per user rather than per IP (the global
 * `JwtAuthGuard` has already set `req.user`). Uses the `attempts` throttler;
 * routes skip the `default` (auth) one.
 */
@Injectable()
export class AttemptThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const { user, ip } = req as unknown as AuthenticatedRequest;
    return user ? `user:${user.id}` : `ip:${ip ?? ''}`;
  }
}
