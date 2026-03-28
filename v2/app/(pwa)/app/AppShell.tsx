'use client';

import { useCallback, useMemo, Suspense } from 'react';
import { useMachine } from '@xstate/react';
import { MapContainer } from '@/features/map/MapContainer';
import { Sheet } from '@/features/sheet/Sheet';
import { sheetMachine, SNAP_POINTS, type SheetSnap } from '@/features/sheet/sheetMachine';
import { FilterBar } from '@/features/filters/FilterBar';
import { SearchInput } from '@/features/filters/SearchInput';
import { useFilters, applyFilters } from '@/features/filters/useFilters';
import { LocationCard } from '@/components/patterns/LocationCard';
import { CardListSkeleton } from '@/components/patterns/CardSkeleton';
import { EmptyFilterState } from '@/components/patterns/EmptyState';
import { DetailView } from '@/features/detail/DetailView';
import type { LocationSummary } from '@/domain/types';

interface AppShellProps {
  initialLocations: LocationSummary[];
}

export function AppShell({ initialLocations }: AppShellProps) {
  const [sheetState, sheetSend] = useMachine(sheetMachine);
  const { filters, toggleType, setWeather, setQuery, clearFilters, isFiltered } = useFilters();

  const { snap, detailId } = sheetState.context;
  const isDetailOpen = sheetState.matches('detail');

  // Filter locations client-side
  const filteredLocations = useMemo(
    () => applyFilters(initialLocations, filters),
    [initialLocations, filters],
  );

  // Map bottom padding based on sheet state
  const bottomPadding = useMemo(() => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    return (SNAP_POINTS[snap] / 100) * vh;
  }, [snap]);

  // Handlers
  const handleMarkerClick = useCallback((location: LocationSummary) => {
    sheetSend({ type: 'OPEN_DETAIL', id: location.id });
  }, [sheetSend]);

  const handleMapClick = useCallback(() => {
    if (isDetailOpen) {
      sheetSend({ type: 'CLOSE_DETAIL' });
    } else if (snap !== 'peek') {
      sheetSend({ type: 'SNAP_TO', target: 'peek' });
    }
  }, [isDetailOpen, snap, sheetSend]);

  const handleSnapChange = useCallback((newSnap: SheetSnap) => {
    if (isDetailOpen) {
      if (newSnap === 'hidden' || newSnap === 'peek') {
        sheetSend({ type: 'CLOSE_DETAIL' });
      } else {
        sheetSend({ type: 'DRAG_END', snapTo: newSnap });
      }
    } else {
      sheetSend({ type: 'DRAG_END', snapTo: newSnap });
    }
  }, [isDetailOpen, sheetSend]);

  const handleCardTap = useCallback((location: LocationSummary) => {
    sheetSend({ type: 'OPEN_DETAIL', id: location.id });
  }, [sheetSend]);

  const handleDetailClose = useCallback(() => {
    sheetSend({ type: 'CLOSE_DETAIL' });
  }, [sheetSend]);

  const handleSearchFocus = useCallback(() => {
    if (snap === 'peek') {
      sheetSend({ type: 'SNAP_TO', target: 'half' });
    }
  }, [snap, sheetSend]);

  return (
    <>
      {/* Map (always visible behind sheet) */}
      <MapContainer
        locations={filteredLocations}
        selectedId={detailId}
        onMarkerClick={handleMarkerClick}
        onMapClick={handleMapClick}
        bottomPadding={bottomPadding}
      />

      {/* Sheet */}
      <Suspense>
        <Sheet
          snap={snap}
          onSnapChange={handleSnapChange}
        >
          {isDetailOpen && detailId ? (
            <DetailView locationId={detailId} onClose={handleDetailClose} />
          ) : (
            <BrowseContent
              locations={filteredLocations}
              totalCount={initialLocations.length}
              filters={filters}
              isFiltered={isFiltered}
              onTypeToggle={toggleType}
              onWeatherChange={setWeather}
              onQueryChange={setQuery}
              onClearFilters={clearFilters}
              onCardTap={handleCardTap}
              onSearchFocus={handleSearchFocus}
              selectedId={detailId}
            />
          )}
        </Sheet>
      </Suspense>
    </>
  );
}

/** Browse sheet content: search + filters + card list + empty state */
function BrowseContent({
  locations,
  totalCount,
  filters,
  isFiltered,
  onTypeToggle,
  onWeatherChange,
  onQueryChange,
  onClearFilters,
  onCardTap,
  onSearchFocus,
  selectedId,
}: {
  locations: LocationSummary[];
  totalCount: number;
  filters: ReturnType<typeof useFilters>['filters'];
  isFiltered: boolean;
  onTypeToggle: (type: import('@/domain/enums').LocationType) => void;
  onWeatherChange: (weather: import('@/domain/enums').Weather | null) => void;
  onQueryChange: (query: string) => void;
  onClearFilters: () => void;
  onCardTap: (location: LocationSummary) => void;
  onSearchFocus: () => void;
  selectedId: number | null;
}) {
  const isEmpty = locations.length === 0 && isFiltered;

  return (
    <div>
      {/* Search */}
      <SearchInput
        value={filters.query}
        onChange={onQueryChange}
        onFocus={onSearchFocus}
      />

      {/* Filters */}
      <FilterBar
        activeTypes={filters.types}
        activeWeather={filters.weather}
        onTypeToggle={onTypeToggle}
        onWeatherChange={onWeatherChange}
      />

      {/* Divider */}
      <div className="hairline" />

      {isEmpty ? (
        /* Empty state */
        <EmptyFilterState
          activeTypes={filters.types}
          activeWeather={filters.weather}
          query={filters.query}
          onClearFilters={onClearFilters}
          onRemoveType={onTypeToggle}
          onClearWeather={() => onWeatherChange(null)}
          onClearQuery={() => onQueryChange('')}
        />
      ) : (
        <>
          {/* Result count */}
          <div className="px-4 py-2">
            <p className="text-[13px] tracking-[0.002em] text-label-secondary">
              {locations.length === totalCount
                ? `${locations.length} locaties`
                : `${locations.length} van ${totalCount} locaties`}
            </p>
          </div>

          {/* Card list with stagger animation */}
          <div className="flex flex-col gap-2 px-4 pb-4">
            {locations.map((loc, i) => (
              <div
                key={loc.id}
                className="animate-[fadeSlideIn_300ms_ease-out_both]"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <LocationCard
                  location={loc}
                  onTap={onCardTap}
                  isSelected={loc.id === selectedId}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Suspense fallback for the initial app shell load */
export function AppShellSkeleton() {
  return (
    <>
      {/* Map placeholder */}
      <div className="absolute inset-0 bg-bg-secondary" />

      {/* Sheet skeleton */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 bg-bg-primary"
        style={{
          height: '100%',
          transform: 'translateY(75%)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        {/* Handle */}
        <div className="flex items-center justify-center py-2">
          <div className="h-[5px] w-9 rounded-full" style={{ background: 'rgba(160, 130, 110, 0.30)' }} />
        </div>

        {/* Search skeleton */}
        <div className="px-4 pb-3">
          <div className="h-[44px] w-full animate-pulse rounded-pill bg-bg-secondary" />
        </div>

        {/* Filter chips skeleton */}
        <div className="flex gap-2 px-4 pb-3">
          {[80, 96, 64, 72, 80].map((w, i) => (
            <div
              key={i}
              className="h-[32px] animate-pulse rounded-pill bg-bg-secondary"
              style={{ width: w, animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>

        <div className="hairline" />

        <CardListSkeleton count={4} />
      </div>
    </>
  );
}
