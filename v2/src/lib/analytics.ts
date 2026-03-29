/**
 * Analytics module — GA4 event tracking
 *
 * Event taxonomy follows docs/v2/seo-analytics.md §9.
 * All events are typed for consistency and autocomplete.
 */

type PageType =
  | 'home'
  | 'region'
  | 'combo'
  | 'detail'
  | 'guide'
  | 'guides_overview'
  | 'partner'
  | 'legal';

/* ─── gtag type augmentation ─── */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/* ─── Core ─── */

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag(...args);
}

/** Send any custom event to GA4 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
) {
  gtag('event', name, properties);
}

/* ─── Discovery events ─── */

export function trackPageView(
  pageType: PageType,
  extra?: { region?: string; location_id?: number },
) {
  trackEvent('page_view', { page_type: pageType, ...extra });
}

export function trackSearch(query: string, resultCount: number) {
  trackEvent('search_query', { query, result_count: resultCount });
}

export function trackFilterApply(
  filterType: string,
  filterValue: string,
  resultCount: number,
) {
  trackEvent('filter_apply', {
    filter_type: filterType,
    filter_value: filterValue,
    result_count: resultCount,
  });
}

export function trackFilterClear(filterType: string) {
  trackEvent('filter_clear', { filter_type: filterType });
}

/* ─── Engagement events ─── */

export function trackMarkerTap(
  locationId: number,
  locationType: string,
  region: string,
) {
  trackEvent('marker_tap', {
    location_id: locationId,
    location_type: locationType,
    region,
  });
}

export function trackCardTap(
  locationId: number,
  source: 'list' | 'nearby' | 'collection',
) {
  trackEvent('card_tap', { location_id: locationId, source });
}

export function trackDetailOpen(
  locationId: number,
  source: 'search' | 'map' | 'card' | 'direct',
) {
  trackEvent('detail_open', { location_id: locationId, source });
}

/* ─── Conversion events ─── */

export function trackFavoriteToggle(
  locationId: number,
  action: 'add' | 'remove',
  totalFavorites: number,
) {
  trackEvent('favorite_toggle', {
    location_id: locationId,
    action,
    total_favorites: totalFavorites,
  });
}

export function trackPlanToggle(
  locationId: number,
  action: 'add' | 'remove',
) {
  trackEvent(action === 'add' ? 'plan_add' : 'plan_remove', {
    location_id: locationId,
  });
}

export function trackAffiliateClick(
  provider: string,
  locationId: number,
  destinationUrl: string,
) {
  trackEvent('affiliate_click', {
    provider,
    location_id: locationId,
    destination_url: destinationUrl,
  });
}

export function trackWebsiteClick(
  locationId: number,
  destinationUrl: string,
) {
  trackEvent('website_click', {
    location_id: locationId,
    destination_url: destinationUrl,
  });
}

export function trackRouteClick(
  locationId: number,
  provider: 'google_maps' | 'apple_maps',
) {
  trackEvent('route_click', {
    location_id: locationId,
    provider,
  });
}

/* ─── Map interaction events ─── */

/** Map pan — debounced, fires after user stops panning */
export function trackMapPan(lat: number, lng: number, zoom: number): void {
  trackEvent('map_pan', { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000, zoom: Math.round(zoom) });
}

/** Map zoom change */
export function trackMapZoom(zoom: number, direction: 'in' | 'out'): void {
  trackEvent('map_zoom', { zoom: Math.round(zoom), direction });
}

/** Detail view scroll depth milestone */
export function trackDetailScrollDepth(locationId: number, depth: number): void {
  trackEvent('detail_scroll_depth', { location_id: locationId, depth_pct: depth });
}
