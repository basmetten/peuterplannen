'use client';

import { LOCATION_TYPE_LABELS } from '@/domain/enums';
import type { LocationType, Weather } from '@/domain/enums';

interface EmptyFilterProps {
  activeTypes: LocationType[];
  activeWeather: Weather | null;
  query: string;
  onClearFilters: () => void;
  onRemoveType: (type: LocationType) => void;
  onClearWeather: () => void;
  onClearQuery: () => void;
}

const WEATHER_LABELS: Record<Weather, string> = {
  indoor: 'Binnen',
  outdoor: 'Buiten',
  both: 'Beide',
};

/**
 * Empty state shown when filters produce no results.
 * Shows active filters as removable pills + clear-all CTA.
 * Never blames the user; always offers a next action.
 */
export function EmptyFilterState({
  activeTypes,
  activeWeather,
  query,
  onClearFilters,
  onRemoveType,
  onClearWeather,
  onClearQuery,
}: EmptyFilterProps) {
  const hasTypeFilters = activeTypes.length > 0;
  const hasWeatherFilter = activeWeather !== null;
  const hasQuery = query.length > 0;

  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {/* Illustration: simple binoculars icon */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          className="text-label-tertiary"
        >
          <circle cx="6" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="18" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 12V7a3 3 0 0 1 6 0v5M12 12V7a3 3 0 0 1 6 0v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Message */}
      {hasQuery ? (
        <h3 className="mb-1 text-[17px] font-semibold tracking-[-0.025em] text-label">
          Geen resultaat voor &lsquo;{query}&rsquo;
        </h3>
      ) : (
        <h3 className="mb-1 text-[17px] font-semibold tracking-[-0.025em] text-label">
          Geen locaties gevonden
        </h3>
      )}

      <p className="mb-5 text-[15px] leading-[1.4] text-label-secondary">
        {hasQuery
          ? 'Probeer een andere zoekterm of pas je filters aan.'
          : 'Probeer minder filters voor meer resultaten.'}
      </p>

      {/* Active filter pills (removable) */}
      {(hasTypeFilters || hasWeatherFilter || hasQuery) && (
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {activeTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onRemoveType(type)}
              className="inline-flex items-center gap-1 rounded-pill bg-bg-secondary px-3 py-1.5 text-[13px] font-medium text-label-secondary transition-colors hover:bg-separator/40"
            >
              {LOCATION_TYPE_LABELS[type]}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-label-tertiary">
                <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          ))}

          {hasWeatherFilter && (
            <button
              type="button"
              onClick={onClearWeather}
              className="inline-flex items-center gap-1 rounded-pill bg-bg-secondary px-3 py-1.5 text-[13px] font-medium text-label-secondary transition-colors hover:bg-separator/40"
            >
              {WEATHER_LABELS[activeWeather]}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-label-tertiary">
                <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {hasQuery && (
            <button
              type="button"
              onClick={onClearQuery}
              className="inline-flex items-center gap-1 rounded-pill bg-bg-secondary px-3 py-1.5 text-[13px] font-medium text-label-secondary transition-colors hover:bg-separator/40"
            >
              &ldquo;{query}&rdquo;
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-label-tertiary">
                <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Clear all button */}
      <button
        type="button"
        onClick={onClearFilters}
        className="rounded-pill bg-accent px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-active"
      >
        Wis alle filters
      </button>
    </div>
  );
}
