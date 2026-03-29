'use client';

import { LOCATION_TYPE_LABELS, PRICE_BAND_LABELS, AGE_PRESETS } from '@/domain/enums';
import type { LocationType, Weather, PriceBand, AgePresetKey } from '@/domain/enums';

interface EmptyFilterProps {
  activeTypes: LocationType[];
  activeWeather: Weather | null;
  activePriceBands: PriceBand[];
  activeMinScore: number | null;
  activeAgeKey: AgePresetKey | null;
  query: string;
  onClearFilters: () => void;
  onRemoveType: (type: LocationType) => void;
  onClearWeather: () => void;
  onRemovePriceBand: (band: PriceBand) => void;
  onClearScore: () => void;
  onClearAge: () => void;
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
  activePriceBands,
  activeMinScore,
  activeAgeKey,
  query,
  onClearFilters,
  onRemoveType,
  onClearWeather,
  onRemovePriceBand,
  onClearScore,
  onClearAge,
  onClearQuery,
}: EmptyFilterProps) {
  const hasAnyFilter =
    activeTypes.length > 0 ||
    activeWeather !== null ||
    activePriceBands.length > 0 ||
    activeMinScore !== null ||
    activeAgeKey !== null ||
    query.length > 0;

  const agePreset = activeAgeKey ? AGE_PRESETS.find((p) => p.key === activeAgeKey) : null;

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
      {query ? (
        <h3 className="mb-1 text-[17px] font-semibold tracking-[-0.025em] text-label">
          Geen resultaat voor &lsquo;{query}&rsquo;
        </h3>
      ) : (
        <h3 className="mb-1 text-[17px] font-semibold tracking-[-0.025em] text-label">
          Geen locaties gevonden
        </h3>
      )}

      <p className="mb-5 text-[15px] leading-[1.4] text-label-secondary">
        {query
          ? 'Probeer een andere zoekterm of pas je filters aan.'
          : 'Probeer minder filters voor meer resultaten.'}
      </p>

      {/* Active filter pills (removable) */}
      {hasAnyFilter && (
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {activeTypes.map((type) => (
            <RemovablePill key={type} label={LOCATION_TYPE_LABELS[type]} onRemove={() => onRemoveType(type)} />
          ))}

          {activeWeather !== null && (
            <RemovablePill label={WEATHER_LABELS[activeWeather]} onRemove={onClearWeather} />
          )}

          {activePriceBands.map((band) => (
            <RemovablePill key={band} label={PRICE_BAND_LABELS[band]} onRemove={() => onRemovePriceBand(band)} />
          ))}

          {activeMinScore !== null && (
            <RemovablePill label={`Score ${activeMinScore}+`} onRemove={onClearScore} />
          )}

          {agePreset && (
            <RemovablePill label={agePreset.label} onRemove={onClearAge} />
          )}

          {query && (
            <RemovablePill label={`\u201C${query}\u201D`} onRemove={onClearQuery} />
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

/* --- Removable pill --- */

function RemovablePill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-pill bg-bg-secondary px-3 py-1.5 text-[13px] font-medium text-label-secondary transition-colors hover:bg-separator/40"
    >
      {label}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-label-tertiary">
        <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
