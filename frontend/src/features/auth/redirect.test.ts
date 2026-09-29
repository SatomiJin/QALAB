import { describe, expect, it } from 'vitest';
import { loginPath, safeRedirect } from './redirect';

describe('safeRedirect', () => {
  it.each(['/profile', '/practice/quiz?x=1', '/admin/courses#top'])(
    'keeps the in-app path %s',
    (path) => {
      expect(safeRedirect(path)).toBe(path);
    },
  );

  it.each([
    null,
    undefined,
    '',
    'profile',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/auth/login',
    '/auth',
  ])('falls back to the dashboard for %j', (value) => {
    expect(safeRedirect(value)).toBe('/dashboard');
  });
});

describe('loginPath', () => {
  it('adds the return path', () => {
    expect(loginPath('/profile?tab=a')).toBe(
      '/auth/login?redirect=%2Fprofile%3Ftab%3Da',
    );
  });

  it('omits the default destination', () => {
    expect(loginPath('/dashboard')).toBe('/auth/login');
    expect(loginPath('//evil.example')).toBe('/auth/login');
  });
});
