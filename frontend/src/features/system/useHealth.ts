import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/http';
import type { HealthResponse } from '../../types/api';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) =>
      api.get<HealthResponse>('/health', { auth: false, signal }),
    refetchInterval: 60_000,
    retry: false,
  });
}
