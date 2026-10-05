import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminGlossaryTerm } from '../../types/api';
import { glossaryApi } from './glossary-api';

export const glossaryKeys = {
  all: ['glossary'] as const,
  admin: ['glossary', 'admin'] as const,
  adminTerm: (id: string) => ['glossary', 'admin', id] as const,
};

/**
 * Published terms, shared by the glossary page and the lesson links. The
 * glossary changes rarely, so it is kept fresh for a few minutes; admin
 * writes invalidate it.
 */
export function useGlossary({ enabled = true } = {}) {
  return useQuery({
    queryKey: glossaryKeys.all,
    queryFn: ({ signal }) => glossaryApi.list(signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}

// Usage counts come from lesson text that the CMS edits elsewhere, so admin
// views refetch on every visit (derived data, like the dashboard).
export function useAdminGlossary() {
  return useQuery({
    queryKey: glossaryKeys.admin,
    queryFn: ({ signal }) => glossaryApi.adminList(signal),
    staleTime: 0,
  });
}

export function useAdminGlossaryTerm(id: string | undefined) {
  return useQuery({
    queryKey: glossaryKeys.adminTerm(id ?? ''),
    queryFn: ({ signal }) => glossaryApi.adminGet(id!, signal),
    enabled: id !== undefined,
    staleTime: 0,
  });
}

/** A glossary write: the returned term goes into its cache, every glossary query refreshes. */
export function useGlossaryMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<AdminGlossaryTerm>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (term) => {
      queryClient.setQueryData(glossaryKeys.adminTerm(term.id), term);
      return queryClient.invalidateQueries({
        queryKey: glossaryKeys.all,
        predicate: (query) => query.queryKey[2] !== term.id,
      });
    },
  });
}

/** Delete: the deleted term's own query is not refetched (it would be a 404). */
export function useDeleteGlossaryTerm(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => glossaryApi.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.all,
        predicate: (query) => query.queryKey[2] !== id,
      }),
  });
}
