import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { AdminUser } from '../../types/api';
import { type AdminUserListParams, usersApi } from './users-api';

export const usersKeys = {
  all: ['adminUsers'] as const,
  lists: () => ['adminUsers', 'list'] as const,
  list: (params: AdminUserListParams) =>
    ['adminUsers', 'list', params] as const,
  user: (id: string) => ['adminUsers', 'user', id] as const,
};

export function useAdminUsers(params: AdminUserListParams) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: ({ signal }) => usersApi.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: usersKeys.user(id),
    queryFn: ({ signal }) => usersApi.get(id, signal),
  });
}

/** A role or status change: the returned user goes into its cache, lists refresh. */
export function useUserMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<AdminUser>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      queryClient.setQueryData(usersKeys.user(user.id), user);
      return queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}
