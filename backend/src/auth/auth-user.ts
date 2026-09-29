import type { Request } from 'express';

/** Identity taken from a verified access token. Never from the request body. */
export interface AuthUser {
  id: string;
  email: string;
  /** Supabase session id (`session_id` claim). */
  sessionId: string | null;
  /** The raw bearer token, used to create a user-scoped Supabase client. */
  accessToken: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
