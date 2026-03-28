import Link from 'next/link';
import type { LocationSummary } from '@/domain/types';
import { MapUpdater } from './MapUpdater';

/**
 * ContentShell — wraps server-rendered content (region hubs, detail pages,
 * blog posts) in an app-like visual: sidebar panel on desktop with the
 * persistent map visible to its right, scrollable full-width on mobile.
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

      {/* Sidebar panel — full width on mobile, 420px on desktop */}
      <aside className="absolute inset-y-0 left-0 z-10 flex w-full flex-col overflow-y-auto bg-bg-primary md:w-[420px] md:border-r md:border-separator md:shadow-lg">
        <div className="flex-1">{children}</div>

        {/* Footer */}
        <footer className="border-t border-separator px-4 py-6">
          <Link
            href="/partner"
            className="block text-[14px] font-medium text-accent hover:underline"
          >
            Heb je een locatie? Beheer je listing →
          </Link>
          <div className="mt-3 flex gap-3 text-[12px] text-label-tertiary">
            <Link href="/privacy" className="hover:text-label-secondary">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-label-secondary">
              Voorwaarden
            </Link>
            <span>·</span>
            <Link href="/about" className="hover:text-label-secondary">
              Over
            </Link>
            <span>·</span>
            <Link href="/contact" className="hover:text-label-secondary">
              Contact
            </Link>
          </div>
        </footer>
      </aside>
    </>
  );
}
