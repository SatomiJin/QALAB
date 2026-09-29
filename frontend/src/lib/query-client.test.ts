import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { shouldRetry } from './query-client';

const apiError = (statusCode: number) =>
  new ApiError({ statusCode, error: 'x', message: 'x' });

describe('shouldRetry', () => {
  it('retries network errors and 5xx', () => {
    expect(shouldRetry(0, apiError(0))).toBe(true);
    expect(shouldRetry(0, apiError(503))).toBe(true);
  });

  it('does not retry 4xx', () => {
    for (const status of [400, 401, 403, 404, 409, 429]) {
      expect(shouldRetry(0, apiError(status))).toBe(false);
    }
  });

  it('stops after the max retries', () => {
    expect(shouldRetry(2, apiError(503))).toBe(false);
  });

  it('does not retry unknown errors', () => {
    expect(shouldRetry(0, new Error('boom'))).toBe(false);
  });
});
