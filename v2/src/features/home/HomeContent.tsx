'use client';

import { useMemo } from 'react';
import { SearchCommand } from '@/features/search/SearchCommand';
import { CategoryGrid } from '@/components/patterns/CategoryGrid';
import { FilterBar } from '@/features/filters/FilterBar';
import { LocationCard } from '@/components/patterns/LocationCard';
import { EmptyFilterState } from '@/components/patterns/EmptyState';
import { HorizontalCardStrip } from '@/components/patterns/HorizontalCardStrip';
import { OptimizedImage } from '@/components/patterns/OptimizedImage';
import { GuideCard } from '@/components/patterns/GuideCard';
import { LOCATION_TYPE_LABELS, TYPE_COLORS } from '@/domain/enums';
import type { LocationType } from '@/domain/enums';
import type { LocationSummary } from '@/domain/types';
import type { BlogPostMeta } from '@/domain/blog';
import type { FilterState } from '@/features/filters/useFilters';
import type { SheetSnap } from '@/features/sheet/sheetMachine';
import { useFavorites } from '@/hooks/useFavorites';
import { usePlan } from '@/hooks/usePlan';

interface HomeContentProps {
  filteredLocations: LocationSummary[];
  initialLocations: LocationSummary[];
  filters: FilterState;
  isFiltered: boolean;
  guides: BlogPostMeta[];
  snap: SheetSnap;
  onTypeToggle: (type: LocationType) => void;
  onWeatherChange: (weather: import('@/domain/enums').Weather | null) => void;
  onQueryChange: (query: string) => void;
  onPriceBandToggle: (band: import('@/domain/enums').PriceBand) => void;
  onScoreChange: (score: number | null) => void;
  onAgeChange: (key: import('@/domain/enums').AgePresetKey | null) => void;
  onClearFilters: () => void;
  onCardTap: (location: LocationSummary) => void;
  onSearchFocus: () => void;
  onGuideTap: (slug: string) => void;
  onFavoritesTap: () => void;
  onPlanTap: () => void;
  selectedId: number | null;
}

export function HomeContent({
  filteredLocations,
  initialLocations,
  filters,
  isFiltered,
  guides,
  onTypeToggle,
  onWeatherChange,
  onQueryChange,
  onPriceBandToggle,
  onScoreChange,
  onAgeChange,
  onClearFilters,
  onCardTap,
  onSearchFocus,
  onGuideTap,
  onFavoritesTap,
  onPlanTap,
  selectedId,
  snap,
}: HomeContentProps) {
  const { favorites, count: favCount } = useFavorites();
  const { planIds } = usePlan();
  const isEmpty = filteredLocations.length === 0 && isFiltered;

  // Favorites preview (first 4)
  const favPreview = useMemo(() => {
    return initialLocations.filter(l => favorites.has(l.id)).slice(0, 4);
  }, [initialLocations, favorites]);

  // Plan preview (first 3)
  const planPreview = useMemo(() => {
    return planIds
      .slice(0, 3)
      .map(id => initialLocations.find(l => l.id === id))
      .filter((l): l is LocationSummary => l !== undefined);
  }, [initialLocations, planIds]);

  return (
    <div className="w-full min-w-0 max-w-[100vw]">
      {/* Search */}
      <SearchCommand
        locations={initialLocations}
        onSelect={onCardTap}
        onQueryChange={onQueryChange}
        onFocus={onSearchFocus}
      />

      {/* Everything below search is hidden at peek — only search bar + drag handle visible */}
      {snap !== 'peek' && (
        <>
          {/* Categories — hidden during search */}
          {!filters.query && (
            <>
              <CategoryGrid
                activeTypes={filters.types}
                onTypeToggle={onTypeToggle}
              />

              {/* Guides strip */}
              {guides.length > 0 && (
                <SectionStrip title="Gidsen" className="mt-1">
                  <HorizontalCardStrip className="px-4">
                    {guides.map(guide => (
                      <GuideCard
                        key={guide.slug}
                        guide={guide}
                        onTap={onGuideTap}
                      />
                    ))}
                  </HorizontalCardStrip>
                </SectionStrip>
              )}

              {/* Bewaard preview */}
              {favCount > 0 && (
                <SectionStrip
                  title={`Bewaard (${favCount})`}
                  action="Bekijk alle"
                  onAction={onFavoritesTap}
                >
                  <HorizontalCardStrip className="px-4">
                    {favPreview.map(loc => (
                      <SmallLocationCard key={loc.id} location={loc} onTap={onCardTap} />
                    ))}
                  </HorizontalCardStrip>
                </SectionStrip>
              )}

              {/* Plan preview */}
              {planIds.length > 0 && (
                <SectionStrip
                  title={`Je plan (${planIds.length})`}
                  action="Bekijk alle"
                  onAction={onPlanTap}
                >
                  <HorizontalCardStrip className="px-4">
                    {planPreview.map((loc, i) => (
                      <SmallLocationCard key={loc.id} location={loc} onTap={onCardTap} index={i + 1} />
                    ))}
                  </HorizontalCardStrip>
                </SectionStrip>
              )}
            </>
          )}

          {/* Filters */}
          <FilterBar
        activeWeather={filters.weather}
        activePriceBands={filters.priceBands}
        activeMinScore={filters.minScore}
        activeAgeKey={filters.ageKey}
        onWeatherChange={onWeatherChange}
        onPriceBandToggle={onPriceBandToggle}
        onScoreChange={onScoreChange}
        onAgeChange={onAgeChange}
      />

      <div className="hairline" />

      {isEmpty ? (
        <EmptyFilterState
          activeTypes={filters.types}
          activeWeather={filters.weather}
          activePriceBands={filters.priceBands}
          activeMinScore={filters.minScore}
          activeAgeKey={filters.ageKey}
          query={filters.query}
          onClearFilters={onClearFilters}
          onRemoveType={onTypeToggle}
          onClearWeather={() => onWeatherChange(null)}
          onRemovePriceBand={onPriceBandToggle}
          onClearScore={() => onScoreChange(null)}
          onClearAge={() => onAgeChange(null)}
          onClearQuery={() => onQueryChange('')}
        />
      ) : (
        <>
          <div className="px-4 py-2">
            <p className="text-[13px] tracking-[0.002em] text-label-secondary">
              {filteredLocations.length === initialLocations.length
                ? `${filteredLocations.length} locaties`
                : `${filteredLocations.length} van ${initialLocations.length} locaties`}
            </p>
          </div>
          <div className="card-list flex flex-col gap-2 px-4 pb-4">
            {filteredLocations.map(loc => (
              <LocationCard
                key={loc.id}
                location={loc}
                onTap={onCardTap}
                isSelected={loc.id === selectedId}
              />
            ))}
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}

// --- Section strip with title + optional action ---

function SectionStrip({
  title,
  action,
  onAction,
  className = '',
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`pb-3 ${className}`}>
      <div className="flex items-center justify-between px-4 pb-2">
        <h2 className="text-[15px] font-semibold text-label">{title}</h2>
        {action && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="min-h-[44px] flex items-center px-2 text-[13px] font-medium text-accent"
          >
            {action} ›
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

// --- Small card for preview strips ---

function SmallLocationCard({
  location,
  onTap,
  index,
}: {
  location: LocationSummary;
  onTap: (loc: LocationSummary) => void;
  index?: number;
}) {
  const typeLabel = LOCATION_TYPE_LABELS[location.type] ?? location.type;
  const typeColor = TYPE_COLORS[location.type] ?? 'var(--color-label-secondary)';

  return (
    <button
      type="button"
      onClick={() => onTap(location)}
      className="w-[140px] flex-shrink-0 overflow-hidden rounded-2xl bg-bg-secondary text-left transition-transform active:scale-[0.97]"
    >
      {location.photo_url ? (
        <OptimizedImage
          src={location.photo_url}
          alt={location.name}
          size="card"
          className="h-[80px] w-full object-cover"
        />
      ) : (
        <div className="flex h-[80px] w-full items-center justify-center bg-bg-secondary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-label-quaternary">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      )}
      <div className="p-2">
        {index !== undefined && (
          <span
            className="mb-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {index}
          </span>
        )}
        <h3 className="line-clamp-1 text-[12px] font-medium leading-tight text-label">
          {location.name}
        </h3>
        <span className="text-[11px] text-label-secondary" style={{ color: typeColor }}>
          {typeLabel}
        </span>
      </div>
    </button>
  );
}
