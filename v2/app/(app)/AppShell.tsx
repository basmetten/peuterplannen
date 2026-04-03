'use client';

import { useCallback, useMemo, useEffect, useRef, useState, Suspense } from 'react';
import { useMachine } from '@xstate/react';
import { SheetStack, updateThemeColor } from '@silk-hq/components';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { MapContainer } from '@/features/map/MapContainer';
import { SilkSheet } from '@/features/sheet/SilkSheet';
import { StackedSheet } from '@/features/sheet/StackedSheet';
import { Sidebar, SIDEBAR_WIDTH, type DesktopSection } from '@/features/sidebar/Sidebar';
import { sheetMachine, SNAP_POINTS, type SheetSnap } from '@/features/sheet/sheetMachine';
import { useFilters, applyFilters } from '@/features/filters/useFilters';
import { CardListSkeleton } from '@/components/patterns/CardSkeleton';
import { DetailView } from '@/features/detail/DetailView';
import { ClusterList } from '@/features/carousel/ClusterList';
import { HomeContent } from '@/features/home/HomeContent';
import { MobileHomeContent } from '@/features/home/MobileHomeContent';
import { CategoryResultsContent } from '@/features/home/CategoryResultsContent';
import { FavoritesList } from '@/features/favorites/FavoritesList';
import { PlanView } from '@/features/plan/PlanView';
import { GuideDetailView } from '@/features/guides/GuideDetailView';
import { GuideListView } from '@/features/guides/GuideListView';
import type { LocationSummary } from '@/domain/types';
import type { BlogPostMeta } from '@/domain/blog';
import { useFavorites } from '@/hooks/useFavorites';
import { usePlan } from '@/hooks/usePlan';
import { useMapState } from '@/context/MapStateContext';
import { useMapFreeze } from '@/hooks/useMapFreeze';
import { SheetErrorBoundary } from '@/components/patterns/SheetErrorBoundary';
import { trackDetailOpen, trackSearch, trackFilterApply } from '@/lib/analytics';
import type { FilterState } from '@/features/filters/useFilters';
import type { LocationType } from '@/domain/enums';
import { LOCATION_TYPE_LABELS } from '@/domain/enums';
import { haversine } from '@/lib/geo';

interface AppShellProps {
  initialLocations: LocationSummary[];
  initialGuides: BlogPostMeta[];
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

export function AppShell({ initialLocations, initialGuides }: AppShellProps) {
  const isDesktop = useIsDesktop();
  const { setAppMapActive } = useMapState();
  const [sheetState, sheetSend] = useMachine(sheetMachine);
  const { filters, toggleType, setWeather, setQuery, togglePriceBand, setMinScore, setAgeKey, clearFilters, isFiltered } = useFilters();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('pp-sidebar-collapsed');
    if (saved === 'true') setSidebarCollapsed(true);
  }, []);

  // Layer state (stack navigation — replaces mode switcher)
  const [showFavorites, setShowFavorites] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [guideSlug, setGuideSlug] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<LocationType | null>(null);
  const [showGuideList, setShowGuideList] = useState(false);

  // Desktop nav section
  const [desktopSection, setDesktopSection] = useState<DesktopSection>('browse');

  // Favorites/plan counts for nav badges
  const { count: favCount } = useFavorites();
  const { planIds } = usePlan();
  const planCount = planIds.length;

  // Map ref for freeze/unfreeze during sheet animations
  const mapInstanceRef = useRef<import('maplibre-gl').Map | null>(null);
  const { freeze: freezeMap, unfreeze: unfreezeMap } = useMapFreeze(mapInstanceRef);

  // Map dim overlay opacity — driven by Silk onTravel per-frame callback
  const mapDimRef = useRef<HTMLDivElement>(null);

  // Per-frame travel handler: dims the map as browse sheet rises from peek→full
  const handleTravelProgress = useCallback(
    (progress: number, progressAtDetents: Record<number, number>) => {
      const el = mapDimRef.current;
      if (!el) return;
      // Start dimming after peek detent, max dim at full
      const peekProgress = progressAtDetents[1] ?? 0.25;
      const dimProgress = Math.max(0, (progress - peekProgress) / (1 - peekProgress));
      el.style.opacity = String(dimProgress * 0.12);
    },
    [],
  );

  // Freeze map during sheet travel for GPU stability
  const handleTravelStatusChange = useCallback(
    (status: string) => {
      if (status === 'entering' || status === 'stepping') {
        freezeMap();
      } else if (status === 'idleInside' || status === 'idleOutside') {
        unfreezeMap();
      }
    },
    [freezeMap, unfreezeMap],
  );

  const { snap, detailId, carouselLocationIds, carouselActiveId } = sheetState.context;
  const isDetailOpen = sheetState.matches('detail');
  const isCarouselOpen = sheetState.matches('carousel');

  // Signal to layout that AppShell has its own map — prevents PersistentMap from mounting
  useEffect(() => {
    setAppMapActive(true);
    return () => setAppMapActive(false);
  }, [setAppMapActive]);

  // Sync iOS status bar theme-color with sheet stacking state
  useEffect(() => {
    if (isDetailOpen || showFavorites || showPlan || guideSlug) {
      // Slightly darker when stacked sheet is open (matches the dimmed backdrop)
      updateThemeColor('#E2D8CF');
    } else {
      // Default: match the map tile edge color
      updateThemeColor('#E8DED5');
    }
  }, [isDetailOpen, showFavorites, showPlan, guideSlug]);

  // Prevent circular URL ↔ state updates
  const isNavigatingRef = useRef(false);
  const initializedRef = useRef(false);

  // Refs for layer state — used by popstate handler to avoid stale closures
  const activeCategoryFilterRef = useRef(activeCategoryFilter);
  activeCategoryFilterRef.current = activeCategoryFilter;
  const showGuideListRef = useRef(showGuideList);
  showGuideListRef.current = showGuideList;

  // Filter locations client-side
  const filteredLocations = useMemo(
    () => applyFilters(initialLocations, filters),
    [initialLocations, filters],
  );

  // Nearby locations for detail view
  const nearbyLocations = useMemo(() => {
    if (!detailId) return [];
    const current = initialLocations.find(l => l.id === detailId);
    if (!current) return [];
    return initialLocations
      .filter(l => l.id !== detailId)
      .map(l => ({
        ...l,
        distance: haversine(current.lat, current.lng, l.lat, l.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }, [detailId, initialLocations]);

  // Map always shows full filtered set (no mode-based filtering)
  const mapLocations = filteredLocations;

  // Track viewport height for accurate sheet padding
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

  // Map bottom padding (mobile only)
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

    const browseUrl = new URL(window.location.href);
    browseUrl.searchParams.delete('locatie');
    window.history.replaceState({ mode: 'browse' }, '', browseUrl.toString());
    window.history.pushState({ mode: 'detail', id: loc.id }, '', url.toString());

    sheetSend({ type: 'OPEN_DETAIL', id: loc.id });
  }, [initialLocations, sheetSend]);

  // --- URL deep linking: back/forward ---

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const state = e.state as Record<string, unknown> | null;

      // Handle layer-based back navigation (category, guide list)
      if (state?.layer === 'category') {
        setActiveCategoryFilter(state.type as LocationType);
        return;
      }
      if (state?.layer === 'guideList') {
        setShowGuideList(true);
        return;
      }

      // Close any open layer sheets on generic back (use refs to avoid stale closures)
      if (activeCategoryFilterRef.current) {
        setActiveCategoryFilter(null);
        return;
      }
      if (showGuideListRef.current) {
        setShowGuideList(false);
        return;
      }

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
      window.history.back();
    } else if (!isDesktop && snap !== 'peek') {
      sheetSend({ type: 'SNAP_TO', target: 'peek' });
    }
  }, [isCarouselOpen, isDetailOpen, isDesktop, snap, sheetSend]);

  const handleSnapChange = useCallback((newSnap: SheetSnap) => {
    freezeMap();
    setTimeout(unfreezeMap, 500);

    if (isDetailOpen) {
      if (newSnap === 'peek') {
        window.history.back();
      } else {
        sheetSend({ type: 'DRAG_END', snapTo: newSnap });
      }
    } else {
      sheetSend({ type: 'DRAG_END', snapTo: newSnap });
    }
  }, [isDetailOpen, sheetSend, freezeMap, unfreezeMap]);

  const handleCardTap = useCallback((location: LocationSummary) => {
    trackDetailOpen(location.id, 'card');
    freezeMap();
    sheetSend({ type: 'OPEN_DETAIL', id: location.id });
    pushDetailUrl(location);
    setTimeout(() => {
      unfreezeMap();
      const map = mapInstanceRef.current;
      if (map) {
        map.flyTo({
          center: [location.lng, location.lat],
          zoom: Math.max(map.getZoom(), 13),
          duration: 600,
        });
      }
    }, 450);
  }, [sheetSend, pushDetailUrl, freezeMap, unfreezeMap]);

  const handleDetailClose = useCallback(() => {
    window.history.back();
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (!isDesktop && snap === 'peek') {
      sheetSend({ type: 'SNAP_TO', target: 'half' });
    }
  }, [isDesktop, snap, sheetSend]);

  // --- Analytics ---

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!filters.query) return;
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      trackSearch(filters.query, filteredLocations.length);
    }, 800);
    return () => clearTimeout(searchTimerRef.current);
  }, [filters.query]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevFiltersRef = useRef<FilterState>(filters);
  useEffect(() => {
    const prev = prevFiltersRef.current;
    prevFiltersRef.current = filters;
    if (prev === filters) return;

    const count = filteredLocations.length;
    filters.types
      .filter((t) => !prev.types.includes(t))
      .forEach((t) => trackFilterApply('type', t, count));
    if (filters.weather && filters.weather !== prev.weather)
      trackFilterApply('weather', filters.weather, count);
    filters.priceBands
      .filter((p) => !prev.priceBands.includes(p))
      .forEach((p) => trackFilterApply('price', p, count));
    if (filters.minScore !== null && filters.minScore !== prev.minScore)
      trackFilterApply('score', `${filters.minScore}+`, count);
    if (filters.ageKey && filters.ageKey !== prev.ageKey)
      trackFilterApply('age', filters.ageKey, count);
  }, [filters, filteredLocations.length]);

  // --- Carousel handlers ---

  const handleClusterExpand = useCallback((locations: LocationSummary[]) => {
    sheetSend({ type: 'CAROUSEL_OPEN', locationIds: locations.map((l) => l.id) });
  }, [sheetSend]);

  const handleCarouselCardTap = useCallback((location: LocationSummary) => {
    trackDetailOpen(location.id, 'card');
    sheetSend({ type: 'OPEN_DETAIL', id: location.id });
    pushDetailUrl(location);
  }, [sheetSend, pushDetailUrl]);

  // --- Sidebar collapse toggle ---

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('pp-sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  // --- Layer handlers (stack navigation) ---

  const handleGuideLocationTap = useCallback((location: LocationSummary) => {
    setGuideSlug(null);
    setTimeout(() => {
      trackDetailOpen(location.id, 'card');
      freezeMap();
      sheetSend({ type: 'OPEN_DETAIL', id: location.id });
      pushDetailUrl(location);
      setTimeout(() => {
        unfreezeMap();
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo({
            center: [location.lng, location.lat],
            zoom: Math.max(map.getZoom(), 13),
            duration: 600,
          });
        }
      }, 450);
    }, 50);
  }, [sheetSend, pushDetailUrl, freezeMap, unfreezeMap]);

  const handleGuideTap = useCallback((slug: string) => {
    setGuideSlug(slug);
  }, []);

  const handleFavoritesTap = useCallback(() => {
    setShowFavorites(true);
  }, []);

  const handlePlanTap = useCallback(() => {
    setShowPlan(true);
  }, []);

  const handleCategoryTap = useCallback((type: LocationType) => {
    setActiveCategoryFilter(type);
    window.history.pushState({ layer: 'category', type }, '');
  }, []);

  const handleGuideListTap = useCallback(() => {
    setShowGuideList(true);
    window.history.pushState({ layer: 'guideList' }, '');
  }, []);

  // Cluster locations (memoized for both mobile and desktop)
  const clusterLocations = useMemo(() => {
    if (!carouselLocationIds) return [];
    return carouselLocationIds
      .map(id => initialLocations.find(l => l.id === id))
      .filter((l): l is LocationSummary => l !== undefined)
      .sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return (b.ai_suitability_score_10 ?? 0) - (a.ai_suitability_score_10 ?? 0);
      });
  }, [carouselLocationIds, initialLocations]);

  // HomeContent props (shared between mobile and desktop)
  const homeContentProps = {
    filteredLocations,
    initialLocations,
    filters,
    isFiltered,
    guides: initialGuides,
    snap: isDesktop ? 'full' as const : snap,
    onTypeToggle: toggleType,
    onWeatherChange: setWeather,
    onQueryChange: setQuery,
    onPriceBandToggle: togglePriceBand,
    onScoreChange: setMinScore,
    onAgeChange: setAgeKey,
    onClearFilters: clearFilters,
    onCardTap: handleCardTap,
    onSearchFocus: handleSearchFocus,
    onGuideTap: handleGuideTap,
    onFavoritesTap: handleFavoritesTap,
    onPlanTap: handlePlanTap,
    selectedId: detailId,
  };

  return (
    <>
      {/* Map — always visible, offset on desktop */}
      <MapContainer
        locations={mapLocations}
        selectedId={detailId}
        carouselActiveId={carouselActiveId}
        onMarkerClick={handleMarkerClick}
        onMapClick={handleMapClick}
        onClusterExpand={handleClusterExpand}
        bottomPadding={bottomPadding}
        leftOffset={isDesktop && !sidebarCollapsed ? SIDEBAR_WIDTH : 0}
        mapInstanceRef={mapInstanceRef}
      />

      {/* Map dim overlay — opacity driven per-frame by Silk onTravel (mobile only) */}
      {!isDesktop && (
        <div
          ref={mapDimRef}
          className="pointer-events-none fixed inset-0 z-[29] bg-black"
          style={{ opacity: 0 }}
          aria-hidden
        />
      )}

      {/* Desktop sidebar collapse toggle */}
      {isDesktop && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="fixed z-40 flex h-8 w-8 items-center justify-center rounded-xl bg-bg-primary shadow-card transition-[left] duration-200 ease-out"
          style={{
            left: sidebarCollapsed ? 16 : SIDEBAR_WIDTH + 16,
            top: 16,
          }}
          aria-label={sidebarCollapsed ? 'Zijbalk tonen' : 'Zijbalk verbergen'}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d={sidebarCollapsed ? 'M7.5 5L12.5 10L7.5 15' : 'M12.5 5L7.5 10L12.5 15'}
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Desktop: persistent sidebar with browse↔detail slide transition */}
      {isDesktop ? (
        <Sidebar
          collapsed={sidebarCollapsed}
          activeSection={desktopSection}
          onSectionChange={setDesktopSection}
          favCount={favCount}
          planCount={planCount}
        >
          <div className="relative flex-1 overflow-hidden">
            {/* Content panel — always rendered to preserve scroll position */}
            <div
              className="absolute inset-0 overflow-y-auto overscroll-contain transition-transform duration-150 ease-out"
              style={{ transform: isDetailOpen || guideSlug ? 'translateX(-30%)' : 'translateX(0)' }}
              aria-hidden={isDetailOpen || guideSlug !== null}
              inert={isDetailOpen || guideSlug !== null || undefined}
            >
              {isCarouselOpen && clusterLocations.length > 0 ? (
                <ClusterList
                  locations={clusterLocations}
                  onCardTap={handleCarouselCardTap}
                  onClose={() => sheetSend({ type: 'CAROUSEL_CLOSE' })}
                />
              ) : desktopSection === 'guides' ? (
                <GuideListView
                  guides={initialGuides}
                  onGuideTap={handleGuideTap}
                />
              ) : desktopSection === 'favorites' ? (
                <FavoritesList
                  locations={initialLocations}
                  onCardTap={handleCardTap}
                  selectedId={detailId}
                />
              ) : desktopSection === 'plan' ? (
                <PlanView
                  locations={initialLocations}
                  onCardTap={handleCardTap}
                  selectedId={detailId}
                />
              ) : (
                <HomeContent {...homeContentProps} />
              )}
            </div>

            {/* Detail panel — slides over from right */}
            <div
              className="absolute inset-0 overflow-y-auto overscroll-contain bg-bg-primary transition-transform duration-150 ease-out"
              style={{ transform: isDetailOpen ? 'translateX(0)' : 'translateX(100%)' }}
              aria-hidden={!isDetailOpen}
              inert={!isDetailOpen || undefined}
            >
              {isDetailOpen && detailId && (
                <SheetErrorBoundary>
                  <DetailView
                    locationId={detailId}
                    onClose={handleDetailClose}
                    nearbyLocations={nearbyLocations}
                    onNearbyTap={handleCardTap}
                  />
                </SheetErrorBoundary>
              )}
            </div>

            {/* Guide detail panel — slides over from right */}
            <div
              className="absolute inset-0 overflow-y-auto overscroll-contain bg-bg-primary transition-transform duration-150 ease-out"
              style={{ transform: guideSlug ? 'translateX(0)' : 'translateX(100%)' }}
              aria-hidden={!guideSlug}
              inert={!guideSlug || undefined}
            >
              {guideSlug && (
                <GuideDetailView
                  slug={guideSlug}
                  allGuides={initialGuides}
                  locations={initialLocations}
                  onClose={() => setGuideSlug(null)}
                  onLocationTap={handleGuideLocationTap}
                  onGuideTap={handleGuideTap}
                />
              )}
            </div>
          </div>
        </Sidebar>
      ) : (
        <Suspense>
          <SheetStack.Root>
            {/* Stacking dim overlay — dims map when detail/guide sheets stack above browse sheet */}
            <SheetStack.Outlet
              stackingAnimation={{
                opacity: [0, 0.15] as [number, number],
              }}
              asChild
            >
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 29,
                  background: 'black',
                  pointerEvents: 'none',
                  opacity: 0,
                }}
                aria-hidden
              />
            </SheetStack.Outlet>

            {/* Layer 0: Home browse sheet — always present, Apple Maps launchpad */}
            <SilkSheet
              snap={snap}
              onSnapChange={handleSnapChange}
              onTravelProgress={handleTravelProgress}
              onTravelStatusChange={handleTravelStatusChange}
            >
              <MobileHomeContent
                snap={snap}
                locations={initialLocations}
                guides={initialGuides}
                onCardTap={handleCardTap}
                onSearchFocus={handleSearchFocus}
                onQueryChange={setQuery}
                onCategoryTap={handleCategoryTap}
                onGuideListTap={handleGuideListTap}
                onFavoritesTap={handleFavoritesTap}
                onPlanTap={handlePlanTap}
              />
            </SilkSheet>

            {/* Category results sheet — opens when a quick-filter row is tapped */}
            <StackedSheet
              presented={activeCategoryFilter !== null}
              onClose={() => setActiveCategoryFilter(null)}
              swipe={false}
              title={activeCategoryFilter ? LOCATION_TYPE_LABELS[activeCategoryFilter] : 'Resultaten'}
            >
              {activeCategoryFilter && (
                <CategoryResultsContent
                  category={activeCategoryFilter}
                  allLocations={initialLocations}
                  onCardTap={handleCardTap}
                  onClose={() => setActiveCategoryFilter(null)}
                />
              )}
            </StackedSheet>

            {/* Guide list sheet — opens when Gidsen entry row is tapped */}
            <StackedSheet presented={showGuideList} onClose={() => setShowGuideList(false)} swipe={false} title="Gidsen">
              {showGuideList && (
                <GuideListView
                  guides={initialGuides}
                  onGuideTap={handleGuideTap}
                />
              )}
            </StackedSheet>

            {/* Layer 1+: Stacked sheets (with a11y titles via sheetRole="dialog") */}
            <StackedSheet presented={isDetailOpen} onClose={handleDetailClose} title="Locatie details">
              {isDetailOpen && detailId && (
                <SheetErrorBoundary>
                  <DetailView
                    locationId={detailId}
                    onClose={handleDetailClose}
                    nearbyLocations={nearbyLocations}
                    onNearbyTap={handleCardTap}
                  />
                </SheetErrorBoundary>
              )}
            </StackedSheet>

            <StackedSheet presented={isCarouselOpen} onClose={() => sheetSend({ type: 'CAROUSEL_CLOSE' })} title="Locaties in dit gebied">
              {isCarouselOpen && clusterLocations.length > 0 && (
                <ClusterList
                  locations={clusterLocations}
                  onCardTap={handleCarouselCardTap}
                  onClose={() => sheetSend({ type: 'CAROUSEL_CLOSE' })}
                />
              )}
            </StackedSheet>

            <StackedSheet presented={showFavorites} onClose={() => setShowFavorites(false)} title="Bewaarde locaties">
              {showFavorites && (
                <FavoritesList
                  locations={initialLocations}
                  onCardTap={handleCardTap}
                  selectedId={detailId}
                />
              )}
            </StackedSheet>

            <StackedSheet presented={showPlan} onClose={() => setShowPlan(false)} title="Dagplan">
              {showPlan && (
                <PlanView
                  locations={initialLocations}
                  onCardTap={handleCardTap}
                  selectedId={detailId}
                />
              )}
            </StackedSheet>

            <StackedSheet presented={guideSlug !== null} onClose={() => setGuideSlug(null)} swipe={false} title="Gids">
              {guideSlug && (
                <GuideDetailView
                  slug={guideSlug}
                  allGuides={initialGuides}
                  locations={initialLocations}
                  onClose={() => setGuideSlug(null)}
                  onLocationTap={handleGuideLocationTap}
                  onGuideTap={handleGuideTap}
                />
              )}
            </StackedSheet>
          </SheetStack.Root>
        </Suspense>
      )}
    </>
  );
}

// --- Suspense fallback ---

export function AppShellSkeleton() {
  return (
    <>
      <div className="absolute inset-0 bg-bg-secondary" />
      <div
        className="fixed inset-x-0 bottom-0 z-30 overflow-hidden rounded-t-2xl shadow-sheet md:bottom-auto md:left-0 md:top-0 md:w-[380px] md:rounded-none md:border-r md:border-separator md:shadow-none"
        style={{ height: '100%', transform: 'translateY(75%)' }}
      >
        <div className="flex items-center justify-center bg-bg-primary py-2 md:hidden">
          <div className="h-[5px] w-9 rounded-full" style={{ background: 'rgba(160, 130, 110, 0.30)' }} />
        </div>
        <div className="bg-bg-primary">
          <div className="px-4 pb-3 pt-1">
            <div className="h-[44px] w-full animate-pulse rounded-pill bg-bg-secondary" />
          </div>
          <div className="hairline" />
          <CardListSkeleton count={4} />
        </div>
      </div>
    </>
  );
}
