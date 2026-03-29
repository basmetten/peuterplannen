'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useMemo, useCallback } from 'react';
import { LOCATION_TYPES, WEATHER_OPTIONS, PRICE_BANDS, AGE_PRESETS } from '@/domain/enums';
import type { LocationType, Weather, PriceBand, AgePresetKey } from '@/domain/enums';
import type { LocationSummary } from '@/domain/types';

export interface FilterState {
  types: LocationType[];
  weather: Weather | null;
  query: string;
  priceBands: PriceBand[];
  minScore: number | null;
  ageKey: AgePresetKey | null;
}

const VALID_SCORES = [7, 8, 9];
const VALID_AGE_KEYS = AGE_PRESETS.map((p) => p.key) as readonly string[];

export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: FilterState = useMemo(() => ({
    types: parseEnumList(searchParams.get('types'), LOCATION_TYPES),
    weather: parseEnum(searchParams.get('weather'), WEATHER_OPTIONS),
    query: searchParams.get('q') ?? '',
    priceBands: parseEnumList(searchParams.get('price'), PRICE_BANDS),
    minScore: parseScore(searchParams.get('score')),
    ageKey: parseEnum(searchParams.get('age'), VALID_AGE_KEYS) as AgePresetKey | null,
  }), [searchParams]);

  const setFilters = useCallback((updates: Partial<FilterState>) => {
    const next = { ...filters, ...updates };
    // Preserve unknown params (e.g. ?locatie=...) by starting from current URL
    const params = new URLSearchParams(window.location.search);

    if (next.types.length) params.set('types', next.types.join(','));
    else params.delete('types');
    if (next.weather) params.set('weather', next.weather);
    else params.delete('weather');
    if (next.query) params.set('q', next.query);
    else params.delete('q');
    if (next.priceBands.length) params.set('price', next.priceBands.join(','));
    else params.delete('price');
    if (next.minScore !== null) params.set('score', String(next.minScore));
    else params.delete('score');
    if (next.ageKey) params.set('age', next.ageKey);
    else params.delete('age');

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

  const togglePriceBand = useCallback((band: PriceBand) => {
    const current = filters.priceBands;
    const next = current.includes(band)
      ? current.filter((b) => b !== band)
      : [...current, band];
    setFilters({ priceBands: next });
  }, [filters.priceBands, setFilters]);

  const setMinScore = useCallback((score: number | null) => {
    setFilters({ minScore: score });
  }, [setFilters]);

  const setAgeKey = useCallback((key: AgePresetKey | null) => {
    setFilters({ ageKey: key });
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    // Preserve unknown params (e.g. ?locatie=...) when clearing filters
    const params = new URLSearchParams(window.location.search);
    params.delete('types');
    params.delete('weather');
    params.delete('q');
    params.delete('price');
    params.delete('score');
    params.delete('age');
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname]);

  const isFiltered = useMemo(() => {
    return (
      filters.types.length > 0 ||
      filters.weather !== null ||
      filters.query !== '' ||
      filters.priceBands.length > 0 ||
      filters.minScore !== null ||
      filters.ageKey !== null
    );
  }, [filters]);

  return {
    filters,
    toggleType,
    setWeather,
    setQuery,
    togglePriceBand,
    setMinScore,
    setAgeKey,
    clearFilters,
    isFiltered,
  };
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

  if (filters.priceBands.length > 0) {
    result = result.filter((loc) =>
      loc.price_band !== null && filters.priceBands.includes(loc.price_band),
    );
  }

  if (filters.minScore !== null) {
    const threshold = filters.minScore;
    result = result.filter((loc) =>
      loc.ai_suitability_score_10 !== null && loc.ai_suitability_score_10 >= threshold,
    );
  }

  if (filters.ageKey) {
    const preset = AGE_PRESETS.find((p) => p.key === filters.ageKey);
    if (preset) {
      result = result.filter((loc) => {
        const minAge = loc.min_age ?? 0;
        const maxAge = loc.max_age ?? 12;
        // Overlap: location's age range intersects with preset range
        return minAge <= preset.max && maxAge >= preset.min;
      });
    }
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

function parseScore(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return VALID_SCORES.includes(n) ? n : null;
}
