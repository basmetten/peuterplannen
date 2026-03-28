'use client';

import { useCallback, useMemo, useEffect, useRef, useState, Suspense } from 'react';
import { useMachine } from '@xstate/react';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { MapContainer } from '@/features/map/MapContainer';
import { Sheet } from '@/features/sheet/Sheet';
import { Sidebar, SIDEBAR_WIDTH } from '@/features/sidebar/Sidebar';
import { sheetMachine, SNAP_POINTS, type SheetSnap } from '@/features/sheet/sheetMachine';
import { FilterBar } from '@/features/filters/FilterBar';
import { SearchInput } from '@/features/filters/SearchInput';
import { useFilters, applyFilters } from '@/features/filters/useFilters';
import { LocationCard } from '@/components/patterns/LocationCard';
import { CardListSkeleton } from '@/components/patterns/CardSkeleton';
import { EmptyFilterState } from '@/components/patterns/EmptyState';
import { DetailView } from '@/features/detail/DetailView';
import { CarouselOverlay } from '@/features/carousel/CarouselOverlay';
import { TabBar, type TabId } from '@/components/layout/TabBar';
import { FavoritesList } from '@/features/favorites/FavoritesList';
import type { LocationSummary } from '@/domain/types';

interface AppShellProps {
  initialLocations: LocationSummary[];
}

// --- URL helpers ---

function locationToParam(loc: LocationSummary): string {
  return `${encodeURIComponent(loc.region.toLowerCase())}/${encodeURIComponent(loc.slug)}`;
}

function findByParam(locations: LocationSummary[], param: string): LocationSummary | undefined {
  const slashIdx = param.indexOf('/');
  if (slashIdx < 0) return undefined;
  const region = decodeURIComponent(param.slice(0, slashIdx)).toLowerCase();
  const slug = decodeURIComponent(param.slice(slashIdx + 1));
  return locations.find(
    (l) => l.region.toLowerCase() === region && l.slug === slug,
  );
}

// --- Main component ---

export function AppShell({ initialLocations }: AppShellProps) {
  const isDesktop = useIsDesktop();
  const [sheetState, sheetSend] = useMachine(sheetMachine);
  const { filters, toggleType, setWeather, setQuery, clearFilters, isFiltered } = useFilters();
  const [activeTab, setActiveTab] = useState<TabId>('ontdek');

  const { snap, detailId, carouselLocationIds, carouselActiveId } = sheetState.context;
  const isDetailOpen = sheetState.matches('detail');
  const isCarouselOpen = sheetState.matches('carousel');

  // Prevent circular URL ↔ state updates
  const isNavigatingRef = useRef(false);
  const initializedRef = useRef(false);

  // Filter locations client-side
  const filteredLocations = useMemo(
    () => applyFilters(initialLocations, filters),
    [initialLocations, filters],
  );

  // Track viewport height for accurate sheet padding (handles resize + orientation change)
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setViewportHeight(vv ? vv.height : window.innerHeight);
    if (vv) {
      vv.addEventListener('resize', update);
      return () => vv.removeEventListener('resize', update);
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Map bottom padding (mobile only — desktop has no sheet)
  const bottomPadding = useMemo(() => {
    if (isDesktop) return 0;
    return (SNAP_POINTS[snap] / 100) * viewportHeight;
  }, [snap, isDesktop, viewportHeight]);

  // --- URL deep linking: initial load ---

  useEffect(() => {
    if (initializedRef.current || initialLocations.length === 0) return;
    initializedRef.current = true;

    const url = new URL(window.location.href);
    const locatie = url.searchParams.get('locatie');
    if (!locatie) return;

    const loc = findByParam(initialLocations, locatie);
    if (!loc) return;

    // Set up history so back has a "browse" entry to return to
    const browseUrl = new URL(window.location.href);
    browseUrl.searchParams.delete('locatie');
    window.history.replaceState({ mode: 'browse' }, '', browseUrl.toString());
    window.history.pushState({ mode: 'detail', id: loc.id }, '', url.toString());

    sheetSend({ type: 'OPEN_DETAIL', id: loc.id });
  }, [initialLocations, sheetSend]);

  // --- URL deep linking: back/forward ---

  useEffect(() => {
    const handler = () => {
      const url = new URL(window.location.href);
      const locatie = url.searchParams.get('locatie');

      isNavigatingRef.current = true;

      if (locatie) {
        const loc = findByParam(initialLocations, locatie);
        if (loc) sheetSend({ type: 'OPEN_DETAIL', id: loc.id });
      } else {
        sheetSend({ type: 'CLOSE_DETAIL' });
      }

      requestAnimationFrame(() => {
        isNavigatingRef.current = false;
      });
    };

    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [initialLocations, sheetSend]);

  // Push locatie to URL when detail opens via user action
  const pushDetailUrl = useCallback((location: LocationSummary) => {
    if (isNavigatingRef.current) return;
    const url = new URL(window.location.href);
    url.searchParams.set('locatie', locationToParam(location));
    window.history.pushState({ mode: 'detail', id: location.id }, '', url.toString());
  }, []);

  // --- Handlers ---

  const handleMarkerClick = useCallback((location: LocationSummary) => {
    sheetSend({ type: 'OPEN_DETAIL', id: location.id });
    pushDetailUrl(location);
  }, [sheetSend, pushDetailUrl]);

  const handleMapClick = useCallback(() => {
    if (isCarouselOpen) {
      sheetSend({ type: 'CAROUSEL_CLOSE' });
    } else if (isDetailOpen) {
      window.history.back(); // popstate → CLOSE_DETAIL
    } else if (!isDesktop && snap !== 'peek') {
      sheetSend({ type: 'SNAP_TO', target: 'peek' });
    }
  }, [isCarouselOpen, isDetailOpen, isDesktop, snap, sheetSend]);

  const handleSnapChange = useCallback((newSnap: SheetSnap) => {
    if (isDetailOpen) {
      if (newSnap === 'hidden' || newSnap === 'peek') {
        window.history.back(); // popstate → CLOSE_DETAIL
      } else {
        sheetSend({ type: 'DRAG_END', snapTo: newSnap });
      }
    } else {
      sheetSend({ type: 'DRAG_END', snapTo: newSnap });
    }
  }, [isDetailOpen, sheetSend]);

  const handleCardTap = useCallback((location: LocationSummary) => {
    sheetSend({ type: 'OPEN_DETAIL', id: location.id });
    pushDetailUrl(location);
  }, [sheetSend, pushDetailUrl]);

  const handleDetailClose = useCallback(() => {
    window.history.back(); // popstate → CLOSE_DETAIL
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (!isDesktop && snap === 'peek') {
      sheetSend({ type: 'SNAP_TO', target: 'half' });
    }
  }, [isDesktop, snap, sheetSend]);

  // --- Carousel handlers (mobile only) ---

  const handleClusterExpand = useCallback((locations: LocationSummary[]) => {
    sheetSend({ type: 'CAROUSEL_OPEN', locationIds: locations.map((l) => l.id) });
  }, [sheetSend]);

  const handleCarouselCardTap = useCallback((location: LocationSummary) => {
    sheetSend({ type: 'OPEN_DETAIL', id: location.id });
    pushDetailUrl(location);
  }, [sheetSend, pushDetailUrl]);

  const handleCarouselActiveChange = useCallback((locationId: number) => {
    sheetSend({ type: 'CAROUSEL_SWIPE', locationId });
  }, [sheetSend]);

  // Resolve carousel IDs to LocationSummary objects for rendering
  const carouselLocations = useMemo(() => {
    if (!carouselLocationIds) return [];
    return carouselLocationIds
      .map((id) => initialLocations.find((l) => l.id === id))
      .filter((l): l is LocationSummary => l !== undefined);
  }, [carouselLocationIds, initialLocations]);

  // --- Tab change handler ---

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);

    if (tab === 'kaart') {
      // Collapse sheet to peek to show the map
      if (!isDesktop) {
        sheetSend({ type: 'SNAP_TO', target: 'peek' });
      }
    } else if (tab === 'ontdek' || tab === 'bewaard') {
      // Expand sheet to half if it's at peek
      if (!isDesktop && snap === 'peek') {
        sheetSend({ type: 'SNAP_TO', target: 'half' });
      }
    }
  }, [isDesktop, snap, sheetSend]);

  // --- Shared content (rendered in sidebar or sheet) ---

  const getSheetContent = () => {
    // Detail view always takes priority
    if (isDetailOpen && detailId) {
      return <DetailView locationId={detailId} onClose={handleDetailClose} />;
    }

    // Tab-based content (mobile only — desktop always shows browse in sidebar)
    if (!isDesktop) {
      switch (activeTab) {
        case 'bewaard':
          return (
            <FavoritesList
              locations={initialLocations}
              onCardTap={handleCardTap}
              selectedId={detailId}
            />
          );
        case 'plan':
          return <PlanPlaceholder />;
        default:
          break;
      }
    }

    return (
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
    );
  };

  const content = getSheetContent();

  return (
    <>
      {/* Map — always visible, offset on desktop */}
      <MapContainer
        locations={filteredLocations}
        selectedId={detailId}
        carouselActiveId={carouselActiveId}
        onMarkerClick={handleMarkerClick}
        onMapClick={handleMapClick}
        onClusterExpand={isDesktop ? undefined : handleClusterExpand}
        bottomPadding={bottomPadding}
        leftOffset={isDesktop ? SIDEBAR_WIDTH : 0}
      />

      {/* Carousel overlay — mobile only, map-level, not part of sheet */}
      {!isDesktop && (
        <CarouselOverlay
          locations={carouselLocations}
          activeId={carouselActiveId}
          onCardTap={handleCarouselCardTap}
          onActiveChange={handleCarouselActiveChange}
          visible={isCarouselOpen}
        />
      )}

      {/* Desktop: persistent sidebar. Mobile: draggable bottom sheet + tab bar */}
      {isDesktop ? (
        <Sidebar>{content}</Sidebar>
      ) : (
        <>
          <Suspense>
            <Sheet snap={snap} onSnapChange={handleSnapChange}>
              {content}
            </Sheet>
          </Suspense>
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        </>
      )}
    </>
  );
}

// --- Browse content (shared between sidebar and sheet) ---

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

// --- Plan tab placeholder ---

function PlanPlaceholder() {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-label-tertiary">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </div>
      <h3 className="text-[17px] font-semibold tracking-[-0.025em] text-label">
        Dagplanner
      </h3>
      <p className="mt-2 text-[15px] leading-[1.5] tracking-normal text-label-secondary">
        Binnenkort beschikbaar
      </p>
    </div>
  );
}

// --- Suspense fallback ---

export function AppShellSkeleton() {
  return (
    <>
      {/* Map placeholder */}
      <div className="absolute inset-0 bg-bg-secondary" />

      {/* Sheet skeleton (mobile) */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 bg-bg-primary md:bottom-auto md:left-0 md:top-0 md:w-[380px] md:border-r md:border-separator"
        style={{
          height: '100%',
          transform: 'translateY(75%)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        {/* Handle (mobile only) */}
        <div className="flex items-center justify-center py-2 md:hidden">
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
