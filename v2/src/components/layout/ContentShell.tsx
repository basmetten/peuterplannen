import Link from 'next/link';
import type { LocationSummary } from '@/domain/types';
import { ContentMapLoader } from './ContentMapLoader';

/**
 * ContentShell — wraps server-rendered content (region hubs, detail pages,
 * blog posts) in an app-like visual: sidebar panel on desktop with interactive
 * map, scrollable sheet on mobile.
 *
 * Pass `mapLocations` + a region identifier to show a MapLibre map in the
 * desktop right panel. Without map props, the right panel shows a neutral
 * background (used by blog/guides pages that have no geo data).
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
  const hasMap = mapLocations && mapLocations.length > 0;
  const locationHrefs = hasMap
    ? buildLocationHrefs(mapLocations, mapRegionSlug, mapRegionSlugMap)
    : {};

  return (
    <div className="flex h-dvh w-full">
      {/* Sidebar / sheet content */}
      <div className="relative z-10 flex w-full flex-col overflow-y-auto bg-bg-primary md:max-w-[420px] md:border-r md:border-separator md:shadow-lg">
        <div className="flex-1">{children}</div>

        {/* Sheet footer */}
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
      </div>

      {/* Desktop right panel: interactive map or neutral background */}
      <div className="relative hidden flex-1 md:block">
        {hasMap ? (
          <ContentMapLoader
            locations={mapLocations}
            locationHrefs={locationHrefs}
            highlightId={mapHighlightId}
          />
        ) : (
          <div className="h-full bg-bg-secondary" />
        )}
      </div>
    </div>
  );
}
