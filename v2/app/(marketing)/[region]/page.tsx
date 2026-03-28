import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RegionRepository } from '@/server/repositories/region.repo';
import { LocationRepository } from '@/server/repositories/location.repo';
import { getRegionContent, getTypeContent } from '@/lib/content';
import {
  regionCanonicalUrl,
  typeCanonicalUrl,
  KNOWN_TYPE_SLUGS,
  SLUG_TO_TYPE,
  TYPE_SLUGS,
} from '@/lib/seo';
import { LOCATION_TYPE_LABELS, TYPE_COLORS } from '@/domain/enums';
import type { LocationType } from '@/domain/enums';
import type { LocationSummary, Region } from '@/domain/types';
import { Breadcrumb } from '@/components/patterns/Breadcrumb';
import { StructuredData } from '@/components/patterns/StructuredData';
import { SITE_URL } from '@/lib/constants';

// ---------------------------------------------------------------------------
// ISR — revalidate every 24 hours (same as detail pages)
// ---------------------------------------------------------------------------

export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Static params — both region slugs and type slugs
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ region: string }> };

export async function generateStaticParams() {
  const regions = await RegionRepository.getAll();
  const regionParams = regions.map((r) => ({ region: r.slug }));
  const typeParams = Object.values(TYPE_SLUGS).map((slug) => ({ region: slug }));
  return [...regionParams, ...typeParams];
}

// ---------------------------------------------------------------------------
// Route resolver — determines if this is a region hub or type hub
// ---------------------------------------------------------------------------

type HubKind =
  | { kind: 'region'; region: Region; locations: LocationSummary[] }
  | { kind: 'type'; typeKey: LocationType; typeSlug: string; locations: LocationSummary[] };

async function resolveHub(slug: string): Promise<HubKind | null> {
  // Type slugs take priority (they're a known fixed set)
  if (KNOWN_TYPE_SLUGS.has(slug)) {
    const typeKey = SLUG_TO_TYPE[slug];
    if (!typeKey) return null;
    const locations = await LocationRepository.getByType(typeKey);
    return { kind: 'type', typeKey, typeSlug: slug, locations };
  }

  // Otherwise try region
  const region = await RegionRepository.getBySlug(slug);
  if (!region) return null;
  const locations = await LocationRepository.getByRegion(region.name);
  return { kind: 'region', region, locations };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region: slug } = await params;
  const hub = await resolveHub(slug);
  if (!hub) return {};

  if (hub.kind === 'region') {
    const content = getRegionContent(slug);
    const title = content?.meta_title || `Uitjes met peuters in ${hub.region.name}`;
    const description =
      content?.meta_description ||
      `Ontdek de beste kindvriendelijke uitjes in ${hub.region.name}. Speeltuinen, kinderboerderijen, musea en meer — geschikt voor peuters.`;
    const canonical = regionCanonicalUrl(slug);
    return {
      title,
      description,
      alternates: { canonical },
      robots: { index: true, follow: true },
      openGraph: { title, description, url: canonical, siteName: 'PeuterPlannen', type: 'website' },
    };
  }

  // Type hub
  const content = getTypeContent(hub.typeSlug);
  const typeName = LOCATION_TYPE_LABELS[hub.typeKey] ?? hub.typeKey;
  const title = content?.meta_title || `${typeName} voor peuters`;
  const description =
    content?.meta_description ||
    `Ontdek de beste ${typeName.toLowerCase()} voor peuters in heel Nederland.`;
  const canonical = typeCanonicalUrl(hub.typeSlug);
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title, description, url: canonical, siteName: 'PeuterPlannen', type: 'website' },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function HubPage({ params }: Props) {
  const { region: slug } = await params;
  const hub = await resolveHub(slug);
  if (!hub) notFound();

  if (hub.kind === 'region') {
    return <RegionHub slug={slug} region={hub.region} locations={hub.locations} />;
  }
  return <TypeHub typeKey={hub.typeKey} typeSlug={hub.typeSlug} locations={hub.locations} />;
}

// ===========================================================================
// Region hub
// ===========================================================================

async function RegionHub({
  slug,
  region,
  locations,
}: {
  slug: string;
  region: Region;
  locations: LocationSummary[];
}) {
  const content = getRegionContent(slug);
  const allRegions = await RegionRepository.getAll();

  // Group locations by type for the sections
  const typeGroups = groupByType(locations);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: region.name },
  ];

  const structuredData = buildHubStructuredData({
    name: `Uitjes met peuters in ${region.name}`,
    description: content?.meta_description ?? `Kindvriendelijke uitjes in ${region.name}`,
    url: regionCanonicalUrl(slug),
    breadcrumbItems: [
      { name: 'Home', url: SITE_URL },
      { name: region.name },
    ],
    locations,
    regionSlugOverride: slug,
  });

  return (
    <>
      <StructuredData data={structuredData} />
      <article className="mx-auto max-w-3xl px-4 py-6">
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-label sm:text-[34px]">
          Uitjes met peuters in {region.name}
        </h1>
        {region.blurb && (
          <p className="mt-3 text-[15px] leading-relaxed text-label-secondary">
            {region.blurb}
          </p>
        )}

        {/* Location count */}
        <p className="mt-4 text-[13px] font-medium text-label-tertiary">
          {locations.length} locaties
        </p>

        {/* Editorial content */}
        {content && content.sections.length > 0 && (
          <div className="mt-8 space-y-6">
            {content.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-[20px] font-semibold tracking-tight text-label">
                  {section.heading}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-label-secondary">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        )}

        {/* Location grid by type */}
        {typeGroups.map(({ typeKey, typeName, typeColor, locs }) => (
          <section key={typeKey} className="mt-10">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: typeColor }}
              />
              <h2 className="text-[18px] font-semibold tracking-tight text-label">
                {typeName}
              </h2>
              <span className="text-[13px] text-label-tertiary">({locs.length})</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {locs.slice(0, 8).map((loc) => (
                <HubLocationCard key={loc.id} location={loc} regionSlug={slug} />
              ))}
            </div>
            {locs.length > 8 && (
              <Link
                href={`/${TYPE_SLUGS[typeKey]}`}
                className="mt-3 inline-block text-[14px] font-medium text-accent hover:underline"
              >
                Alle {typeName.toLowerCase()} bekijken →
              </Link>
            )}
          </section>
        ))}

        {/* Internal links — other regions */}
        <nav className="mt-12 border-t border-separator pt-6">
          <h2 className="mb-3 text-[16px] font-semibold text-label">
            Andere steden
          </h2>
          <div className="flex flex-wrap gap-2">
            {allRegions
              .filter((r) => r.slug !== slug)
              .slice(0, 12)
              .map((r) => (
                <Link
                  key={r.slug}
                  href={`/${r.slug}`}
                  className="rounded-pill bg-bg-secondary px-3 py-1.5 text-[13px] font-medium text-label-secondary transition-colors hover:bg-bg-secondary/80 hover:text-label"
                >
                  {r.name}
                </Link>
              ))}
          </div>
        </nav>

        {/* Type links */}
        <nav className="mt-8 flex flex-wrap gap-3 border-t border-separator pt-6">
          {Object.entries(TYPE_SLUGS).map(([type, typeSlugVal]) => (
            <Link
              key={type}
              href={`/${typeSlugVal}`}
              className="text-[14px] text-accent hover:underline"
            >
              {LOCATION_TYPE_LABELS[type as LocationType]}
            </Link>
          ))}
        </nav>
      </article>
    </>
  );
}

// ===========================================================================
// Type hub
// ===========================================================================

async function TypeHub({
  typeKey,
  typeSlug,
  locations,
}: {
  typeKey: LocationType;
  typeSlug: string;
  locations: LocationSummary[];
}) {
  const content = getTypeContent(typeSlug);
  const regions = await RegionRepository.getAll();
  const typeName = LOCATION_TYPE_LABELS[typeKey] ?? typeKey;
  const typeColor = TYPE_COLORS[typeKey];

  // Build region → slug map for card links
  const regionNameToSlug = new Map(regions.map((r) => [r.name, r.slug]));

  // Group locations by region
  const regionGroups = groupByRegion(locations, regions);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: typeName },
  ];

  const structuredData = buildHubStructuredData({
    name: `${typeName} voor peuters`,
    description: content?.meta_description ?? `De beste ${typeName.toLowerCase()} voor peuters`,
    url: typeCanonicalUrl(typeSlug),
    breadcrumbItems: [
      { name: 'Home', url: SITE_URL },
      { name: typeName },
    ],
    locations,
    regionNameToSlug,
  });

  return (
    <>
      <StructuredData data={structuredData} />
      <article className="mx-auto max-w-3xl px-4 py-6">
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div className="mt-2 flex items-center gap-3">
          <span
            className="inline-flex h-3 w-3 rounded-full"
            style={{ backgroundColor: typeColor }}
          />
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-label sm:text-[34px]">
            {typeName} voor peuters
          </h1>
        </div>

        {/* Location count */}
        <p className="mt-4 text-[13px] font-medium text-label-tertiary">
          {locations.length} locaties in heel Nederland
        </p>

        {/* Editorial content */}
        {content && content.sections.length > 0 && (
          <div className="mt-8 space-y-6">
            {content.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-[20px] font-semibold tracking-tight text-label">
                  {section.heading}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-label-secondary">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        )}

        {/* Locations grouped by region */}
        {regionGroups.map(({ regionName, regionSlug, locs }) => (
          <section key={regionSlug} className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-tight text-label">
                {regionName}
              </h2>
              <Link
                href={`/${regionSlug}`}
                className="text-[13px] font-medium text-accent hover:underline"
              >
                Alle uitjes →
              </Link>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {locs.slice(0, 6).map((loc) => (
                <HubLocationCard key={loc.id} location={loc} regionSlug={regionSlug} />
              ))}
            </div>
          </section>
        ))}

        {/* Internal links — other types */}
        <nav className="mt-12 border-t border-separator pt-6">
          <h2 className="mb-3 text-[16px] font-semibold text-label">
            Andere categorieën
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_SLUGS)
              .filter(([type]) => type !== typeKey)
              .map(([type, slugVal]) => (
                <Link
                  key={type}
                  href={`/${slugVal}`}
                  className="rounded-pill bg-bg-secondary px-3 py-1.5 text-[13px] font-medium text-label-secondary transition-colors hover:bg-bg-secondary/80 hover:text-label"
                >
                  {LOCATION_TYPE_LABELS[type as LocationType]}
                </Link>
              ))}
          </div>
        </nav>
      </article>
    </>
  );
}

// ===========================================================================
// Shared sub-components
// ===========================================================================

function HubLocationCard({
  location,
  regionSlug,
}: {
  location: LocationSummary;
  regionSlug: string;
}) {
  const typeName = LOCATION_TYPE_LABELS[location.type] ?? location.type;
  const typeColor = TYPE_COLORS[location.type];

  return (
    <Link
      href={`/${regionSlug}/${location.slug}`}
      className="flex gap-3 rounded-card bg-bg-tertiary p-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-card"
    >
      {/* Photo */}
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-photo bg-bg-secondary">
        {location.photo_url?.startsWith('http') ? (
          <img
            src={location.photo_url}
            alt={location.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-label-tertiary">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h3 className="truncate text-[14px] font-semibold text-label">
          {location.name}
        </h3>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-badge px-1.5 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: typeColor }}
          >
            {typeName}
          </span>
          {location.ai_suitability_score_10 != null && (
            <span className="text-[12px] font-semibold tabular-nums text-accent">
              {location.ai_suitability_score_10.toFixed(1)}
            </span>
          )}
        </div>
        {location.toddler_highlight && (
          <p className="mt-1 truncate text-[12px] text-label-secondary">
            {location.toddler_highlight}
          </p>
        )}
      </div>
    </Link>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================

interface TypeGroup {
  typeKey: LocationType;
  typeName: string;
  typeColor: string;
  locs: LocationSummary[];
}

function groupByType(locations: LocationSummary[]): TypeGroup[] {
  const map = new Map<LocationType, LocationSummary[]>();
  for (const loc of locations) {
    const arr = map.get(loc.type) ?? [];
    arr.push(loc);
    map.set(loc.type, arr);
  }

  return Array.from(map.entries())
    .map(([typeKey, locs]) => ({
      typeKey,
      typeName: LOCATION_TYPE_LABELS[typeKey] ?? typeKey,
      typeColor: TYPE_COLORS[typeKey],
      locs,
    }))
    .sort((a, b) => b.locs.length - a.locs.length);
}

interface RegionGroup {
  regionName: string;
  regionSlug: string;
  locs: LocationSummary[];
}

function groupByRegion(locations: LocationSummary[], regions: Region[]): RegionGroup[] {
  const regionNameToSlug = new Map(regions.map((r) => [r.name, r.slug]));
  const map = new Map<string, LocationSummary[]>();

  for (const loc of locations) {
    const arr = map.get(loc.region) ?? [];
    arr.push(loc);
    map.set(loc.region, arr);
  }

  return Array.from(map.entries())
    .map(([regionName, locs]) => ({
      regionName,
      regionSlug: regionNameToSlug.get(regionName) ?? regionName.toLowerCase().replace(/\s+/g, '-'),
      locs,
    }))
    .sort((a, b) => b.locs.length - a.locs.length);
}

// ===========================================================================
// Structured data builder
// ===========================================================================

function buildHubStructuredData({
  name,
  description,
  url,
  breadcrumbItems,
  locations,
  regionSlugOverride,
  regionNameToSlug,
}: {
  name: string;
  description: string;
  url: string;
  breadcrumbItems: Array<{ name: string; url?: string }>;
  locations: LocationSummary[];
  regionSlugOverride?: string;
  regionNameToSlug?: Map<string, string>;
}): Record<string, unknown> {
  const itemListElements = locations.slice(0, 20).map((loc, i) => {
    const regionSlug =
      regionSlugOverride ??
      regionNameToSlug?.get(loc.region) ??
      loc.region.toLowerCase().replace(/\s+/g, '-');
    return {
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/${encodeURIComponent(regionSlug)}/${encodeURIComponent(loc.slug)}`,
      name: loc.name,
    };
  });

  const breadcrumbList = breadcrumbItems.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    ...(item.url ? { item: item.url } : {}),
    name: item.name,
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name,
        description,
        url,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: locations.length,
          itemListElement: itemListElements,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbList,
      },
    ],
  };
}
