import { ApiError } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';
import { api } from '../../lib/http';
import type { SessionResponse } from '../../types/api';
import { authApi } from './auth-api';

export function storeSession(session: SessionResponse): void {
  authStorage.setTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  });
}

let inFlight: Promise<boolean> | null = null;

/**
 * Exchanges the stored refresh token for a new session. Shared by the API
 * client (401 / near expiry) and the start-up restore, so they never send
 * the same single-use refresh token twice.
 */
export function refreshSession(): Promise<boolean> {
  inFlight ??= (async () => {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) return false;
    try {
      storeSession(await authApi.refresh(refreshToken));
      return true;
    } catch (error) {
      // Only a rejected token ends the session; a network blip keeps it
      // so the next attempt can still succeed.
      if (error instanceof ApiError && error.status === 401) {
        authStorage.clear();
      }
      return false;
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

api.setRefreshHandler(refreshSession);
