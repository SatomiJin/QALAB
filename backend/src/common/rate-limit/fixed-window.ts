/** Result of counting one request against a limit. */
export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (for `Retry-After`), at least 1. */
  retryAfterSeconds: number;
}

/** How many expired windows to keep before sweeping them out. */
const SWEEP_THRESHOLD = 1000;

/**
 * Fixed-window counters per key, in memory: `limit` requests per `windowMs`,
 * then refused until the window ends. Pure (the clock is passed in), so it
 * is unit-tested without timers. One instance per process: on serverless
 * hosts each instance counts on its own (docs/deployment.md).
 */
export class FixedWindowCounter {
  private readonly windows = new Map<
    string,
    { count: number; resetAt: number }
  >();

  hit(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
  ): RateLimitResult {
    if (this.windows.size >= SWEEP_THRESHOLD) this.sweep(now);

    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, window);
    }
    window.count += 1;
    return {
      allowed: window.count <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  /** Drops windows that have ended, so the map does not grow forever. */
  private sweep(now: number): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }

  get size(): number {
    return this.windows.size;
  }
}
