import { createContext, useContext } from 'react';
import type { Profile, SessionResponse } from '../../types/api';

export const ME_QUERY_KEY = ['me'] as const;

/**
 * `checking`: restoring a session from the stored refresh token on load.
 * `signedIn`: tokens are available; `profile` loads separately.
 */
export type AuthStatus = 'checking' | 'signedIn' | 'signedOut';

export interface AuthContextValue {
  status: AuthStatus;
  /** The user pressed "Sign out" (vs. the session expiring). */
  signedOutByUser: boolean;
  profile: Profile | undefined;
  profileQuery: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
  };
  isAdmin: boolean;
  /** Stores the session returned by login / verify-email. */
  startSession: (session: SessionResponse) => void;
  /** Revokes the session on the server (best effort) and clears it locally. */
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
