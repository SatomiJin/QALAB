import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('returns the API base URL without trailing slashes', () => {
    expect(
      parseEnv({ VITE_API_BASE_URL: 'http://localhost:3000/api/v1/' }),
    ).toEqual({
      apiBaseUrl: 'http://localhost:3000/api/v1',
    });
  });

  it.each([undefined, '', '   '])(
    'fails when VITE_API_BASE_URL is %j',
    (value) => {
      expect(() => parseEnv({ VITE_API_BASE_URL: value })).toThrow(
        'VITE_API_BASE_URL is not set',
      );
    },
  );

  it('fails for an invalid URL', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: 'localhost:3000' })).toThrow(
      'not a valid URL',
    );
  });
});
