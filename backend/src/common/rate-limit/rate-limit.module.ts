import { Global, Module } from '@nestjs/common';
import { RateLimitGuard, RateLimitStore } from './rate-limit.guard.js';

/** One counter store for the whole app; `@RateLimit()` routes use the guard. */
@Global()
@Module({
  providers: [RateLimitStore, RateLimitGuard],
  exports: [RateLimitStore, RateLimitGuard],
})
export class RateLimitModule {}
