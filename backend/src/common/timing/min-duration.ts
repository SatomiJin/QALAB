export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const systemClock: Clock = {
  now: () => performance.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Runs `work` and settles (resolves or rejects) no sooner than `minMs` after
 * it started. Auth endpoints that must not reveal whether an email exists use
 * it: Supabase answers fast for an unknown email and slowly when it sends
 * one, so without a floor the timing tells what the body hides.
 * `onOverrun` reports work that took longer than the floor (the floor is
 * then too low to hide the difference).
 */
export async function withMinDuration<T>(
  work: () => Promise<T>,
  minMs: number,
  options: { clock?: Clock; onOverrun?: (elapsedMs: number) => void } = {},
): Promise<T> {
  const clock = options.clock ?? systemClock;
  const startedAt = clock.now();
  try {
    return await work();
  } finally {
    const elapsed = clock.now() - startedAt;
    if (elapsed < minMs) await clock.sleep(minMs - elapsed);
    else if (minMs > 0) options.onOverrun?.(elapsed);
  }
}
