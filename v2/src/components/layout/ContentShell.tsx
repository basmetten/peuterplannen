import type { LocationSummary } from '@/domain/types';
import { MapUpdater } from './MapUpdater';
import { ContentSheetContainer } from './ContentSheetContainer';

/**
 * ContentShell — wraps server-rendered content (region hubs, detail pages,
 * blog posts) in an app-like visual: sidebar panel on desktop with the
 * persistent map visible to its right, draggable bottom sheet on mobile.
 *
 * Pass `mapLocations` + a region identifier to update the persistent map
 * in the layout with location markers. Without map props, the persistent
 * map shows no markers (neutral state).
 */

interface ContentShellProps {
  children: React.ReactNode;
  /** Locations to show as markers on the desktop map */
  mapLocations?: LocationSummary[];
  /** Single region slug — used to build /region/slug links for all markers */
  mapRegionSlug?: string;
  /** Region name → slug mapping — for pages with locations from multiple regions */
  mapRegionSlugMap?: Record<string, string>;
  /** Location ID to highlight with a larger marker */
  mapHighlightId?: number;
}

/** Build a Record<locationId, href> for map marker navigation */
function buildLocationHrefs(
  locations: LocationSummary[],
  regionSlug?: string,
  regionSlugMap?: Record<string, string>,
): Record<number, string> {
  const hrefs: Record<number, string> = {};
  for (const loc of locations) {
    const slug =
      regionSlug ??
      regionSlugMap?.[loc.region] ??
      loc.region.toLowerCase().replace(/\s+/g, '-');
    hrefs[loc.id] = `/${slug}/${loc.slug}`;
  }
  return hrefs;
}

export function ContentShell({
  children,
  mapLocations,
  mapRegionSlug,
  mapRegionSlugMap,
  mapHighlightId,
}: ContentShellProps) {
  const locationHrefs = mapLocations?.length
    ? buildLocationHrefs(mapLocations, mapRegionSlug, mapRegionSlugMap)
    : {};

  return (
    <>
      {/* Push location data to the persistent map in the layout */}
      <MapUpdater
        locations={mapLocations ?? []}
        locationHrefs={locationHrefs}
        highlightId={mapHighlightId}
      />

      <ContentSheetContainer hasMapLocations={!!mapLocations?.length}>
        {children}
      </ContentSheetContainer>
    </>
  );
}
