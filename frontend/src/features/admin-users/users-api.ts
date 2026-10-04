import { api } from '../../lib/http';
import type {
  AdminUser,
  AdminUserPage,
  ChangeRoleRequest,
  PageSize,
  UserRole,
  UserStatus,
} from '../../types/api';

export interface AdminUserListParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page: number;
  pageSize: PageSize;
}

const id = (value: string) => encodeURIComponent(value);

export const usersApi = {
  list: (params: AdminUserListParams, signal?: AbortSignal) =>
    api.get<AdminUserPage>('/admin/users', { query: { ...params }, signal }),

  get: (userId: string, signal?: AbortSignal) =>
    api.get<AdminUser>(`/admin/users/${id(userId)}`, { signal }),

  changeRole: (userId: string, body: ChangeRoleRequest) =>
    api.patch<AdminUser>(`/admin/users/${id(userId)}/role`, body),

  setDisabled: (userId: string, disabled: boolean) =>
    api.post<AdminUser>(
      `/admin/users/${id(userId)}/${disabled ? 'disable' : 'enable'}`,
    ),
};
