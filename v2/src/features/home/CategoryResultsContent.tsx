'use client';

import { useState, useMemo } from 'react';
import { LOCATION_TYPE_LABELS, TYPE_COLORS } from '@/domain/enums';
import type { LocationType, Weather, PriceBand, AgePresetKey } from '@/domain/enums';
import type { LocationSummary } from '@/domain/types';
import { CATEGORY_ICONS } from '@/domain/category-icons';
import { LocationCard } from '@/components/patterns/LocationCard';
import { FilterBar } from '@/features/filters/FilterBar';
import { EmptyFilterState } from '@/components/patterns/EmptyState';
import { applyFilters } from '@/features/filters/useFilters';

type SortMode = 'score' | 'az';

interface CategoryResultsContentProps {
  category: LocationType;
  allLocations: LocationSummary[];
  onCardTap: (location: LocationSummary) => void;
  onClose: () => void;
}

/**
 * Content for the category results stacked sheet.
 * Shows filtered locations with local filter state (not URL-driven).
 */
export function CategoryResultsContent({
  category,
  allLocations,
  onCardTap,
  onClose,
}: CategoryResultsContentProps) {
  // Local filter state (not URL-driven — this is a transient sheet)
  const [weather, setWeather] = useState<Weather | null>(null);
  const [priceBands, setPriceBands] = useState<PriceBand[]>([]);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [ageKey, setAgeKey] = useState<AgePresetKey | null>(null);
  const [sort, setSort] = useState<SortMode>('score');

  const filtered = useMemo(() => {
    const base = applyFilters(allLocations, {
      types: [category],
      weather,
      query: '',
      priceBands,
      minScore,
      ageKey,
    });

    if (sort === 'az') {
      return [...base].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    }
    // Default: best score first
    return [...base].sort((a, b) => (b.ai_suitability_score_10 ?? 0) - (a.ai_suitability_score_10 ?? 0));
  }, [allLocations, category, weather, priceBands, minScore, ageKey, sort]);

  const isFiltered = weather !== null || priceBands.length > 0 || minScore !== null || ageKey !== null;

  const togglePriceBand = (band: PriceBand) => {
    setPriceBands(prev =>
      prev.includes(band) ? prev.filter(p => p !== band) : [...prev, band],
    );
  };

  const color = TYPE_COLORS[category];
  const label = LOCATION_TYPE_LABELS[category];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="white">
            {CATEGORY_ICONS[category]}
          </svg>
        </div>
        <h2 className="flex-1 text-[20px] font-semibold text-label">{label}</h2>
      </div>

      {/* Filter pills — FilterBar handles its own horizontal scroll */}
      <FilterBar
        activeWeather={weather}
        activePriceBands={priceBands}
        activeMinScore={minScore}
        activeAgeKey={ageKey}
        onWeatherChange={setWeather}
        onPriceBandToggle={togglePriceBand}
        onScoreChange={setMinScore}
        onAgeChange={setAgeKey}
      />

      {/* Sort toggle */}
      <div className="flex items-center justify-between px-4 pb-2">
        <p className="text-[13px] text-label-secondary">
          {filtered.length} {filtered.length === 1 ? 'locatie' : 'locaties'}
        </p>
        <div className="flex gap-1">
          <SortButton active={sort === 'score'} onTap={() => setSort('score')}>
            Beste score
          </SortButton>
          <SortButton active={sort === 'az'} onTap={() => setSort('az')}>
            A–Z
          </SortButton>
        </div>
      </div>

      <div className="hairline" />

      {/* Results */}
      {filtered.length === 0 && isFiltered ? (
        <EmptyFilterState
          activeTypes={[category]}
          activeWeather={weather}
          activePriceBands={priceBands}
          activeMinScore={minScore}
          activeAgeKey={ageKey}
          query=""
          onClearFilters={() => {
            setWeather(null);
            setPriceBands([]);
            setMinScore(null);
            setAgeKey(null);
          }}
          onRemoveType={() => {}}
          onClearWeather={() => setWeather(null)}
          onRemovePriceBand={togglePriceBand}
          onClearScore={() => setMinScore(null)}
          onClearAge={() => setAgeKey(null)}
          onClearQuery={() => {}}
        />
      ) : (
        <div className="card-list flex flex-col gap-2 px-4 py-3">
          {filtered.map(loc => (
            <LocationCard
              key={loc.id}
              location={loc}
              onTap={onCardTap}
              isSelected={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SortButton({
  active,
  onTap,
  children,
}: {
  active: boolean;
  onTap: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`rounded-pill px-3 py-1 text-[12px] font-medium transition-colors ${
        active
          ? 'bg-label text-bg-primary'
          : 'bg-bg-secondary text-label-secondary'
      }`}
    >
      {children}
    </button>
  );
}
