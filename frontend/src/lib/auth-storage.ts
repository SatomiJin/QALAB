export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix epoch seconds. */
  expiresAt: number;
}

const REFRESH_TOKEN_KEY = 'qalab.refreshToken';

// Access token lives in memory only; the refresh token survives reloads.
let accessToken: string | null = null;
let expiresAt: number | null = null;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Storage may be unavailable (private mode, blocked site data).
  }
}

export const authStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },

  getRefreshToken(): string | null {
    return readStorage(REFRESH_TOKEN_KEY);
  },

  getExpiresAt(): number | null {
    return expiresAt;
  },

  setTokens(tokens: StoredTokens): void {
    accessToken = tokens.accessToken;
    expiresAt = tokens.expiresAt;
    writeStorage(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  clear(): void {
    accessToken = null;
    expiresAt = null;
    writeStorage(REFRESH_TOKEN_KEY, null);
  },
};
