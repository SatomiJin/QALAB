const DEFAULT_REDIRECT = '/dashboard';

/**
 * Where to go after signing in. Only same-app paths are allowed, so a crafted
 * `?redirect=https://evil.example` link cannot send the user elsewhere.
 */
export function safeRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith('/')) return DEFAULT_REDIRECT;
  // `//host` and `/\host` are protocol-relative URLs in browsers.
  if (value.startsWith('//') || value.startsWith('/\\'))
    return DEFAULT_REDIRECT;
  if (value === '/auth' || value.startsWith('/auth/')) return DEFAULT_REDIRECT;
  return value;
}

/** Login URL that returns to `path` afterwards. */
export function loginPath(path?: string): string {
  const target = safeRedirect(path);
  return target === DEFAULT_REDIRECT
    ? '/auth/login'
    : `/auth/login?redirect=${encodeURIComponent(target)}`;
}
