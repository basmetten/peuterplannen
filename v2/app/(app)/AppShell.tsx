'use client';

import { useCallback, useMemo, useEffect, useRef, useState, Suspense } from 'react';
import { useMachine } from '@xstate/react';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useFavorites } from '@/hooks/useFavorites';
import { usePlan } from '@/hooks/usePlan';
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
import { SheetModeSwitcher, type SheetMode } from '@/components/layout/SheetModeSwitcher';
import { FavoritesList } from '@/features/favorites/FavoritesList';
import { PlanView } from '@/features/plan/PlanView';
import type { LocationSummary } from '@/domain/types';
import { trackDetailOpen, trackSearch, trackFilterApply } from '@/lib/analytics';
import type { FilterState } from '@/features/filters/useFilters';

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
  const { filters, toggleType, setWeather, setQuery, togglePriceBand, setMinScore, setAgeKey, clearFilters, isFiltered } = useFilters();
  const [sheetMode, setSheetMode] = useState<SheetMode>('ontdek');
  const { favorites } = useFavorites();
  const { planIds } = usePlan();

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

  // Mode-aware map locations: filter markers based on active mode
  const mapLocations = useMemo(() => {
    switch (sheetMode) {
      case 'bewaard':
        return initialLocations.filter((loc) => favorites.has(loc.id));
      case 'plan':
        return planIds
          .map((id) => initialLocations.find((l) => l.id === id))
          .filter((l): l is LocationSummary => l !== undefined);
      default:
        return filteredLocations;
    }
  }, [sheetMode, initialLocations, filteredLocations, favorites, planIds]);

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
    trackDetailOpen(location.id, 'map');
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
    trackDetailOpen(location.id, 'card');
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

  // --- Analytics: debounced search tracking ---

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!filters.query) return;
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      trackSearch(filters.query, filteredLocations.length);
    }, 800);
    return () => clearTimeout(searchTimerRef.current);
  }, [filters.query]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Analytics: filter change tracking ---

  const prevFiltersRef = useRef<FilterState>(filters);
  useEffect(() => {
    const prev = prevFiltersRef.current;
    prevFiltersRef.current = filters;
    if (prev === filters) return;

    const count = filteredLocations.length;

    // Type filter additions
    filters.types
      .filter((t) => !prev.types.includes(t))
      .forEach((t) => trackFilterApply('type', t, count));

    // Weather change
    if (filters.weather && filters.weather !== prev.weather) {
      trackFilterApply('weather', filters.weather, count);
    }

    // Price band additions
    filters.priceBands
      .filter((p) => !prev.priceBands.includes(p))
      .forEach((p) => trackFilterApply('price', p, count));

    // Score change
    if (filters.minScore !== null && filters.minScore !== prev.minScore) {
      trackFilterApply('score', `${filters.minScore}+`, count);
    }

    // Age change
    if (filters.ageKey && filters.ageKey !== prev.ageKey) {
      trackFilterApply('age', filters.ageKey, count);
    }
  }, [filters, filteredLocations.length]);

  // --- Carousel handlers (mobile only) ---

  const handleClusterExpand = useCallback((locations: LocationSummary[]) => {
    sheetSend({ type: 'CAROUSEL_OPEN', locationIds: locations.map((l) => l.id) });
  }, [sheetSend]);

  const handleCarouselCardTap = useCallback((location: LocationSummary) => {
    trackDetailOpen(location.id, 'card');
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

  // --- Mode change handler ---

  const handleModeChange = useCallback((mode: SheetMode) => {
    setSheetMode(mode);
    // No sheet snap manipulation — mode just changes content, map viewport preserved
  }, []);

  // --- Shared content (rendered in sidebar or sheet) ---

  const getSheetContent = () => {
    // Detail view always takes priority
    if (isDetailOpen && detailId) {
      return <DetailView locationId={detailId} onClose={handleDetailClose} />;
    }

    // Mode-based content
    switch (sheetMode) {
      case 'bewaard':
        return (
          <FavoritesList
            locations={initialLocations}
            onCardTap={handleCardTap}
            selectedId={detailId}
          />
        );
      case 'plan':
        return (
          <PlanView
            locations={initialLocations}
            onCardTap={handleCardTap}
            selectedId={detailId}
          />
        );
      default:
        break;
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
        onPriceBandToggle={togglePriceBand}
        onScoreChange={setMinScore}
        onAgeChange={setAgeKey}
        onClearFilters={clearFilters}
        onCardTap={handleCardTap}
        onSearchFocus={handleSearchFocus}
        selectedId={detailId}
      />
    );
  };

  const content = getSheetContent();

  // Mode pills: visible when not in detail view
  const modeSwitcher = !isDetailOpen ? (
    <SheetModeSwitcher activeMode={sheetMode} onModeChange={handleModeChange} />
  ) : null;

  return (
    <>
      {/* Map — always visible, offset on desktop */}
      <MapContainer
        locations={mapLocations}
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

      {/* Desktop: persistent sidebar. Mobile: draggable bottom sheet (no tab bar) */}
      {isDesktop ? (
        <Sidebar>
          <SidebarTabs activeMode={sheetMode} onModeChange={handleModeChange} />
          {content}
        </Sidebar>
      ) : (
        <Suspense>
          <Sheet snap={snap} onSnapChange={handleSnapChange} stickyHeader={modeSwitcher}>
            {content}
          </Sheet>
        </Suspense>
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
  onPriceBandToggle,
  onScoreChange,
  onAgeChange,
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
  onPriceBandToggle: (band: import('@/domain/enums').PriceBand) => void;
  onScoreChange: (score: number | null) => void;
  onAgeChange: (key: import('@/domain/enums').AgePresetKey | null) => void;
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
        activePriceBands={filters.priceBands}
        activeMinScore={filters.minScore}
        activeAgeKey={filters.ageKey}
        onTypeToggle={onTypeToggle}
        onWeatherChange={onWeatherChange}
        onPriceBandToggle={onPriceBandToggle}
        onScoreChange={onScoreChange}
        onAgeChange={onAgeChange}
      />

      {/* Divider */}
      <div className="hairline" />

      {isEmpty ? (
        /* Empty state */
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

// --- Desktop sidebar tabs (segmented control) ---

const SIDEBAR_TABS: { id: SheetMode; label: string }[] = [
  { id: 'ontdek', label: 'Ontdek' },
  { id: 'bewaard', label: 'Bewaard' },
  { id: 'plan', label: 'Plan' },
];

function SidebarTabs({
  activeMode,
  onModeChange,
}: {
  activeMode: SheetMode;
  onModeChange: (mode: SheetMode) => void;
}) {
  return (
    <div className="px-4 pb-2 pt-3">
      <div className="flex rounded-[10px] bg-bg-secondary p-0.5">
        {SIDEBAR_TABS.map((tab) => {
          const isActive = tab.id === activeMode;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onModeChange(tab.id)}
              className={`flex-1 rounded-[8px] px-3 py-1.5 text-[13px] font-medium tracking-[0.002em] transition-all duration-fast ${
                isActive
                  ? 'bg-bg-primary text-label shadow-sm'
                  : 'text-label-secondary hover:text-label'
              }`}
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
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

        {/* Mode pills skeleton */}
        <div className="flex justify-center gap-2 px-4 py-1.5 md:hidden">
          {[64, 72, 52].map((w, i) => (
            <div
              key={i}
              className="h-[32px] animate-pulse rounded-full bg-bg-secondary"
              style={{ width: w }}
            />
          ))}
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
