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
import { DetailView } from '@/features/detail/DetailView';
import type { LocationSummary } from '@/domain/types';

interface AppShellProps {
  initialLocations: LocationSummary[];
}

export function AppShell({ initialLocations }: AppShellProps) {
  const [sheetState, sheetSend] = useMachine(sheetMachine);
  const { filters, toggleType, setWeather, setQuery } = useFilters();

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
              filters={filters}
              onTypeToggle={toggleType}
              onWeatherChange={setWeather}
              onQueryChange={setQuery}
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

/** Browse sheet content: search + filters + card list */
function BrowseContent({
  locations,
  filters,
  onTypeToggle,
  onWeatherChange,
  onQueryChange,
  onCardTap,
  onSearchFocus,
  selectedId,
}: {
  locations: LocationSummary[];
  filters: ReturnType<typeof useFilters>['filters'];
  onTypeToggle: (type: import('@/domain/enums').LocationType) => void;
  onWeatherChange: (weather: import('@/domain/enums').Weather | null) => void;
  onQueryChange: (query: string) => void;
  onCardTap: (location: LocationSummary) => void;
  onSearchFocus: () => void;
  selectedId: number | null;
}) {
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

      {/* Result count */}
      <div className="px-4 py-2">
        <p className="text-[13px] tracking-[0.002em] text-label-secondary">
          {locations.length} locaties
        </p>
      </div>

      {/* Card list */}
      <div className="flex flex-col gap-2 px-4 pb-4">
        {locations.map((loc) => (
          <LocationCard
            key={loc.id}
            location={loc}
            onTap={onCardTap}
            isSelected={loc.id === selectedId}
          />
        ))}
      </div>
    </div>
  );
}
