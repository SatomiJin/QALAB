import { api } from '../../lib/http';
import type {
  MessageResponse,
  Profile,
  SessionResponse,
  UpdateProfileRequest,
} from '../../types/api';

// Public auth endpoints never send the access token and never trigger the
// 401 → refresh flow (a 401 from /auth/login means "wrong password").
const PUBLIC = { auth: false } as const;

export const authApi = {
  register: (body: { email: string; password: string; displayName: string }) =>
    api.post<MessageResponse>('/auth/register', body, PUBLIC),

  verifyEmail: (body: { tokenHash: string; type: 'email' | 'signup' }) =>
    api.post<SessionResponse>('/auth/verify-email', body, PUBLIC),

  resendVerification: (email: string) =>
    api.post<MessageResponse>('/auth/resend-verification', { email }, PUBLIC),

  login: (body: { email: string; password: string }) =>
    api.post<SessionResponse>('/auth/login', body, PUBLIC),

  refresh: (refreshToken: string) =>
    api.post<SessionResponse>('/auth/refresh', { refreshToken }, PUBLIC),

  logout: () => api.post<void>('/auth/logout'),

  forgotPassword: (email: string) =>
    api.post<MessageResponse>('/auth/forgot-password', { email }, PUBLIC),

  resetPassword: (body: { tokenHash: string; newPassword: string }) =>
    api.post<MessageResponse>('/auth/reset-password', body, PUBLIC),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.post<MessageResponse>('/auth/change-password', body),

  getMe: (signal?: AbortSignal) => api.get<Profile>('/me', { signal }),

  updateMe: (body: UpdateProfileRequest) => api.patch<Profile>('/me', body),
};
