import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authStorage } from '../../lib/auth-storage';
import { api } from '../../lib/http';
import type { SessionResponse } from '../../types/api';
import { authApi } from './auth-api';
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  ME_QUERY_KEY,
} from './auth-context';
import { refreshSession, storeSession } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(() =>
    authStorage.getRefreshToken() ? 'checking' : 'signedOut',
  );

  // Restore the session after a reload: only the refresh token survives.
  useEffect(() => {
    if (status !== 'checking') return;
    let active = true;
    void refreshSession().then((ok) => {
      if (active) setStatus(ok ? 'signedIn' : 'signedOut');
    });
    return () => {
      active = false;
    };
  }, [status]);

  const [signedOutByUser, setSignedOutByUser] = useState(false);

  const endSession = useCallback(
    (byUser = false) => {
      authStorage.clear();
      queryClient.clear();
      setSignedOutByUser(byUser);
      setStatus('signedOut');
    },
    [queryClient],
  );

  // A request failed with 401 and refreshing did not help.
  useEffect(() => {
    api.setUnauthorizedHandler(() => endSession());
    return () => api.setUnauthorizedHandler(null);
  }, [endSession]);

  const profileQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: ({ signal }) => authApi.getMe(signal),
    enabled: status === 'signedIn',
    staleTime: 5 * 60_000,
  });

  const startSession = useCallback(
    (session: SessionResponse) => {
      storeSession(session);
      queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
      setSignedOutByUser(false);
      setStatus('signedIn');
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // The local session is cleared either way.
    }
    endSession(true);
  }, [endSession]);

  const { data: profile, isPending, isError, error, refetch } = profileQuery;
  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      signedOutByUser,
      profile,
      profileQuery: {
        isPending,
        isError,
        error,
        refetch: () => void refetch(),
      },
      isAdmin: profile?.role === 'admin',
      startSession,
      signOut,
    }),
    [
      status,
      signedOutByUser,
      profile,
      isPending,
      isError,
      error,
      refetch,
      startSession,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
