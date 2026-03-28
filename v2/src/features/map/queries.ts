import { queryOptions } from '@tanstack/react-query';
import type { LocationSummary } from '@/domain/types';
import type { Location } from '@/domain/types';

export const locationQueries = {
  all: () =>
    queryOptions<LocationSummary[]>({
      queryKey: ['locations'],
      queryFn: () => fetch('/api/locations').then((r) => r.json()),
      staleTime: 10 * 60 * 1000,
    }),

  detail: (id: number) =>
    queryOptions<Location>({
      queryKey: ['location', id],
      queryFn: () => fetch(`/api/locations/${id}`).then((r) => r.json()),
      staleTime: 5 * 60 * 1000,
      enabled: id > 0,
    }),
};
