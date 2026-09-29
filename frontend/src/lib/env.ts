export interface AppEnv {
  apiBaseUrl: string;
}

/** Validates build-time env. Throws with a readable message when invalid. */
export function parseEnv(raw: Record<string, string | undefined>): AppEnv {
  const apiBaseUrl = raw.VITE_API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is not set. Copy frontend/.env.example to frontend/.env.',
    );
  }

  // `new URL('localhost:3000')` parses "localhost:" as a scheme, so the
  // protocol must be checked explicitly.
  if (
    !URL.canParse(apiBaseUrl) ||
    !/^https?:$/.test(new URL(apiBaseUrl).protocol)
  ) {
    throw new Error(
      `VITE_API_BASE_URL is not a valid URL: "${apiBaseUrl}" (expected http:// or https://)`,
    );
  }

  return { apiBaseUrl: apiBaseUrl.replace(/\/+$/, '') };
}
