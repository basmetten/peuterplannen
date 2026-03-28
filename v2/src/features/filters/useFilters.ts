'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useMemo, useCallback } from 'react';
import { LOCATION_TYPES, WEATHER_OPTIONS } from '@/domain/enums';
import type { LocationType, Weather } from '@/domain/enums';
import type { LocationSummary } from '@/domain/types';

export interface FilterState {
  types: LocationType[];
  weather: Weather | null;
  query: string;
}

const DEFAULT_FILTERS: FilterState = {
  types: [],
  weather: null,
  query: '',
};

export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: FilterState = useMemo(() => ({
    types: parseEnumList(searchParams.get('types'), LOCATION_TYPES),
    weather: parseEnum(searchParams.get('weather'), WEATHER_OPTIONS),
    query: searchParams.get('q') ?? '',
  }), [searchParams]);

  const setFilters = useCallback((updates: Partial<FilterState>) => {
    const next = { ...filters, ...updates };
    const params = new URLSearchParams();

    if (next.types.length) params.set('types', next.types.join(','));
    if (next.weather) params.set('weather', next.weather);
    if (next.query) params.set('q', next.query);

    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [filters, router, pathname]);

  const toggleType = useCallback((type: LocationType) => {
    const current = filters.types;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFilters({ types: next });
  }, [filters.types, setFilters]);

  const setWeather = useCallback((weather: Weather | null) => {
    setFilters({ weather });
  }, [setFilters]);

  const setQuery = useCallback((query: string) => {
    setFilters({ query });
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const isFiltered = useMemo(() => {
    return filters.types.length > 0 || filters.weather !== null || filters.query !== '';
  }, [filters]);

  return { filters, toggleType, setWeather, setQuery, clearFilters, isFiltered };
}

/**
 * Apply filters to a list of location summaries (client-side filtering).
 */
export function applyFilters(locations: LocationSummary[], filters: FilterState): LocationSummary[] {
  let result = locations;

  if (filters.types.length > 0) {
    result = result.filter((loc) => filters.types.includes(loc.type));
  }

  if (filters.weather) {
    result = result.filter((loc) =>
      loc.weather === filters.weather || loc.weather === 'both',
    );
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter((loc) =>
      loc.name.toLowerCase().includes(q) ||
      loc.region.toLowerCase().includes(q) ||
      (loc.toddler_highlight?.toLowerCase().includes(q) ?? false),
    );
  }

  return result;
}

// Helpers
function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null {
  return value && allowed.includes(value as T) ? (value as T) : null;
}

function parseEnumList<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T[] {
  if (!value) return [];
  return value.split(',').filter((v): v is T => allowed.includes(v as T));
}
