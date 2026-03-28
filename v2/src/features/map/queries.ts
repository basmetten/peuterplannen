import { queryOptions } from '@tanstack/react-query';
import type { LocationSummary } from '@/domain/types';
import type { Location } from '@/domain/types';

export const locationQueries = {
  all: () =>
    queryOptions<LocationSummary[]>({
      queryKey: ['locations'],
      queryFn: async () => {
        const r = await fetch('/api/locations');
        if (!r.ok) throw new Error(`Failed to fetch locations: ${r.statusText}`);
        return r.json();
      },
      staleTime: 10 * 60 * 1000,
    }),

  detail: (id: number) =>
    queryOptions<Location>({
      queryKey: ['location', id],
      queryFn: async () => {
        const r = await fetch(`/api/locations/${id}`);
        if (!r.ok) throw new Error(`Failed to fetch location ${id}: ${r.statusText}`);
        return r.json();
      },
      staleTime: 5 * 60 * 1000,
      enabled: id > 0,
    }),
};
