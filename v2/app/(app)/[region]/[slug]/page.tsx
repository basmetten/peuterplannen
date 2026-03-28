import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LocationRepository } from '@/server/repositories/location.repo';
import { RegionRepository } from '@/server/repositories/region.repo';
import {
  generateSeoTitle,
  generateSeoDescription,
  shouldIndex,
  locationCanonicalUrl,
  comboCanonicalUrl,
  SCHEMA_TYPE_MAP,
  TYPE_SLUGS,
  SLUG_TO_TYPE,
  KNOWN_TYPE_SLUGS,
  QUALITY_DIMENSION_LABELS,
  QUALITY_RATING_LABELS,
} from '@/lib/seo';
import { SITE_URL } from '@/lib/constants';
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_LABELS_PLURAL, TYPE_COLORS, PRICE_BAND_LABELS } from '@/domain/enums';
import type { LocationType } from '@/domain/enums';
import type { Location, LocationSummary, Region } from '@/domain/types';
import { Breadcrumb } from '@/components/patterns/Breadcrumb';
import {
  StructuredData,
  buildLocationStructuredData,
} from '@/components/patterns/StructuredData';
import { ContentShell } from '@/components/layout/ContentShell';

// ---------------------------------------------------------------------------
// ISR: revalidate every 24 hours
// ---------------------------------------------------------------------------
export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Static params — location detail pages + city+type combo pages
// ---------------------------------------------------------------------------
export async function generateStaticParams() {
  const [regions, locations] = await Promise.all([
    RegionRepository.getAll(),
    LocationRepository.getSeoIncluded(),
  ]);

  const regionNameToSlug = new Map(regions.map((r) => [r.name, r.slug]));

  // Location detail params (~1000 pages)
  const locationParams = locations
    .map((loc) => ({
      region: regionNameToSlug.get(loc.region) ?? loc.region.toLowerCase().replace(/\s+/g, '-'),
      slug: loc.slug,
    }))
    .filter((p) => p.region && p.slug);

  // City+type combo params (regions × types = ~144 pages)
  const typeSlugValues = Object.values(TYPE_SLUGS);
  const comboParams = regions.flatMap((r) =>
    typeSlugValues.map((typeSlug) => ({
      region: r.slug,
      slug: typeSlug,
    })),
  );

  return [...locationParams, ...comboParams];
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
type Props = {
  params: Promise<{ region: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region: regionSlug, slug } = await params;

  // City+type combo pages (e.g. /amsterdam/speeltuinen)
  if (KNOWN_TYPE_SLUGS.has(slug)) {
    const region = await RegionRepository.getBySlug(regionSlug);
    if (!region) return {};

    const typeKey = SLUG_TO_TYPE[slug];
    const typePlural = LOCATION_TYPE_LABELS_PLURAL[typeKey] ?? typeKey;
    const title = `${typePlural} in ${region.name} — voor peuters`;
    const description = `Ontdek de beste ${typePlural.toLowerCase()} voor peuters in ${region.name}. Bekijk alle locaties met beoordelingen en tips.`;
    const canonical = comboCanonicalUrl(regionSlug, slug);

    return {
      title,
      description,
      alternates: { canonical },
      robots: { index: true, follow: true },
      openGraph: { title, description, url: canonical, siteName: 'PeuterPlannen', type: 'website' },
    };
  }

  // Location detail pages
  const region = await RegionRepository.getBySlug(regionSlug);
  if (!region) return {};

  const location = await LocationRepository.getBySlug(region.name, slug);
  if (!location) return {};

  const title = generateSeoTitle(location, region.name);
  const description = generateSeoDescription(location, region.name);
  const canonical = locationCanonicalUrl(regionSlug, slug);
  const indexed = shouldIndex(location);

  return {
    title,
    description,
    alternates: { canonical },
    robots: indexed
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'PeuterPlannen',
      type: 'website',
      ...(location.photo_url && { images: [{ url: location.photo_url }] }),
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default async function SlugPage({ params }: Props) {
  const { region: regionSlug, slug } = await params;

  // City+type combo pages (e.g. /amsterdam/speeltuinen)
  if (KNOWN_TYPE_SLUGS.has(slug)) {
    const typeKey = SLUG_TO_TYPE[slug];
    if (!typeKey) notFound();

    const region = await RegionRepository.getBySlug(regionSlug);
    if (!region) notFound();

    const locations = await LocationRepository.getByRegionAndType(region.name, typeKey);
    return (
      <CityTypeCombo
        region={region}
        regionSlug={regionSlug}
        typeKey={typeKey}
        typeSlug={slug}
        locations={locations}
      />
    );
  }

  // Location detail pages
  const region = await RegionRepository.getBySlug(regionSlug);
  if (!region) notFound();

  const location = await LocationRepository.getBySlug(region.name, slug);
  if (!location) notFound();

  // Canonical redirect (duplicate locations) — only allow internal paths
  const canonicalTarget = location.seo_canonical_target;
  if (canonicalTarget && canonicalTarget.startsWith('/') && !canonicalTarget.startsWith('//')) {
    redirect(canonicalTarget);
  }

  // Fetch nearby locations
  const nearby = await LocationRepository.getNearby(
    location.id,
    region.name,
    location.type,
  );

  const typeName = LOCATION_TYPE_LABELS[location.type] ?? location.type;
  const typeSlug = TYPE_SLUGS[location.type];
  const canonical = locationCanonicalUrl(regionSlug, slug);
  const score = location.ai_suitability_score_10;

  // Category color for type badge
  const typeColorVar = `var(--color-cat-${location.type})`;

  // Breadcrumb data
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: region.name, href: `/${regionSlug}` },
    { label: location.name },
  ];

  // Structured data
  const structuredData = buildLocationStructuredData(
    {
      name: location.name,
      description: location.description || typeName,
      schemaType: SCHEMA_TYPE_MAP[location.type] ?? 'TouristAttraction',
      canonicalUrl: canonical,
      imageUrl: location.photo_url,
      lat: location.lat,
      lng: location.lng,
      city: region.name,
      website: location.website,
      score,
      priceFree: location.price_band === 'free',
    },
    [
      { name: 'Home', url: SITE_URL },
      { name: region.name, url: `${SITE_URL}/${regionSlug}` },
      { name: location.name },
    ],
  );

  // Quality dimensions with values
  const qualityDimensions = Object.entries(QUALITY_DIMENSION_LABELS)
    .map(([key, label]) => ({
      key,
      label,
      value: (location as unknown as Record<string, unknown>)[key] as string | null,
    }))
    .filter((d) => d.value != null && d.value !== '');

  // Build map locations: main location + nearby
  const mainLocSummary: LocationSummary = {
    id: location.id,
    name: location.name,
    slug: location.slug,
    type: location.type,
    lat: location.lat,
    lng: location.lng,
    region: location.region,
    toddler_highlight: location.toddler_highlight,
    weather: location.weather,
    ai_suitability_score_10: location.ai_suitability_score_10,
    photo_url: location.photo_url,
    is_featured: location.is_featured,
    price_band: location.price_band,
  };
  const mapLocations = [mainLocSummary, ...nearby];

  return (
    <ContentShell
      mapLocations={mapLocations}
      mapRegionSlug={regionSlug}
      mapHighlightId={location.id}
    >
      <StructuredData data={structuredData} />

      <article className="px-4 pb-16">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Hero image */}
        <HeroImage
          photoUrl={location.photo_url}
          name={location.name}
          typeColor={typeColorVar}
        />

        {/* Header */}
        <header className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold leading-tight tracking-[-0.031em] text-label md:text-[34px]">
                {location.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-badge px-2 py-0.5 text-[12px] font-semibold tracking-[0.014em] text-white"
                  style={{ backgroundColor: typeColorVar }}
                >
                  {typeName}
                </span>
                <span className="text-[14px] text-label-secondary">
                  ·
                </span>
                <Link
                  href={`/${regionSlug}`}
                  className="text-[14px] text-label-secondary transition-colors hover:text-accent"
                >
                  {region.name}
                </Link>
              </div>
            </div>

            {/* Score badge */}
            {score != null && (
              <div className="flex flex-shrink-0 flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                  <span className="text-[20px] font-bold tabular-nums text-accent">
                    {score.toFixed(1)}
                  </span>
                </div>
                <span className="mt-0.5 text-[11px] text-label-tertiary">
                  /10
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Quick facts */}
        <QuickFacts location={location} />

        {/* CTA bar */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/?locatie=${encodeURIComponent(regionSlug + '/' + slug)}`}
            className="inline-flex h-11 items-center gap-2 rounded-pill bg-accent px-5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-active"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1a5.5 5.5 0 00-5.5 5.5C2.5 10.5 8 15 8 15s5.5-4.5 5.5-8.5A5.5 5.5 0 008 1z" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Bekijk op de kaart
          </Link>
          {location.website && (
            <a
              href={location.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-pill border border-separator bg-bg-tertiary px-5 text-[15px] font-medium text-label transition-colors hover:bg-bg-secondary"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5.5 8.5l3-3M9.5 5.5v3h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="1" y="1" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Website
            </a>
          )}
        </div>

        {/* Highlight */}
        {location.toddler_highlight && (
          <div className="mt-6 rounded-card border border-accent/15 bg-accent/5 p-4">
            <p className="text-[14px] leading-relaxed text-label">
              <span className="font-semibold text-accent">Tip: </span>
              {location.toddler_highlight}
            </p>
          </div>
        )}

        {/* Description */}
        {location.description && (
          <section className="mt-8">
            <h2 className="text-[20px] font-bold tracking-[-0.025em] text-label">
              Over {location.name}
            </h2>
            <div className="mt-3 text-[15px] leading-relaxed tracking-[-0.01em] text-label-secondary">
              {location.seo_intro_override ? (
                <p className="mb-3">{location.seo_intro_override}</p>
              ) : null}
              <p>{location.description}</p>
            </div>
          </section>
        )}

        {/* Quality dimensions */}
        {qualityDimensions.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[20px] font-bold tracking-[-0.025em] text-label">
              Beoordeling
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {qualityDimensions.map((dim) => {
                const rating = QUALITY_RATING_LABELS[dim.value!];
                return (
                  <div
                    key={dim.key}
                    className="rounded-card bg-bg-secondary p-3"
                  >
                    <p className="text-[12px] font-medium text-label-tertiary">
                      {dim.label}
                    </p>
                    <p
                      className="mt-0.5 text-[14px] font-semibold"
                      style={{ color: rating?.color ?? 'var(--color-label)' }}
                    >
                      {rating?.label ?? dim.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Practical info */}
        <PracticalInfo location={location} />

        {/* Nearby locations */}
        {nearby.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[20px] font-bold tracking-[-0.025em] text-label">
              In de buurt
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {nearby.map((loc) => (
                <NearbyLocationCard
                  key={loc.id}
                  location={loc}
                  regionSlug={regionSlug}
                />
              ))}
            </div>
          </section>
        )}

        {/* Internal links */}
        <nav className="mt-10 flex flex-wrap gap-3 border-t border-separator pt-6">
          <Link
            href={`/${regionSlug}`}
            className="text-[14px] text-accent hover:underline"
          >
            Alle uitjes in {region.name}
          </Link>
          <span className="text-label-tertiary">·</span>
          <Link
            href={`/${typeSlug}`}
            className="text-[14px] text-accent hover:underline"
          >
            Alle {(LOCATION_TYPE_LABELS_PLURAL[location.type] ?? typeName).toLowerCase()} in Nederland
          </Link>
        </nav>
      </article>
    </ContentShell>
  );
}

// ===========================================================================
// City+Type combo page (e.g. /amsterdam/speeltuinen)
// ===========================================================================

async function CityTypeCombo({
  region,
  regionSlug,
  typeKey,
  typeSlug,
  locations,
}: {
  region: Region;
  regionSlug: string;
  typeKey: LocationType;
  typeSlug: string;
  locations: LocationSummary[];
}) {
  const typeName = LOCATION_TYPE_LABELS[typeKey] ?? typeKey;
  const typePlural = LOCATION_TYPE_LABELS_PLURAL[typeKey] ?? typeName;
  const typeColor = TYPE_COLORS[typeKey];
  const allRegions = await RegionRepository.getAll();

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: region.name, href: `/${regionSlug}` },
    { label: typePlural },
  ];

  const canonical = comboCanonicalUrl(regionSlug, typeSlug);

  // JSON-LD: CollectionPage + ItemList + BreadcrumbList
  const itemListElements = locations.slice(0, 20).map((loc, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: `${SITE_URL}/${encodeURIComponent(regionSlug)}/${encodeURIComponent(loc.slug)}`,
    name: loc.name,
  }));

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${typePlural} in ${region.name}`,
        description: `De beste ${typePlural.toLowerCase()} voor peuters in ${region.name}`,
        url: canonical,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: locations.length,
          itemListElement: itemListElements,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, item: SITE_URL, name: 'Home' },
          { '@type': 'ListItem', position: 2, item: `${SITE_URL}/${regionSlug}`, name: region.name },
          { '@type': 'ListItem', position: 3, name: typePlural },
        ],
      },
    ],
  };

  return (
    <ContentShell mapLocations={locations} mapRegionSlug={regionSlug}>
      <StructuredData data={structuredData} />
      <article className="px-4 py-6">
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div className="mt-2 flex items-center gap-3">
          <span
            className="inline-flex h-3 w-3 rounded-full"
            style={{ backgroundColor: typeColor }}
          />
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-label sm:text-[34px]">
            {typePlural} in {region.name}
          </h1>
        </div>

        <p className="mt-3 text-[15px] leading-relaxed text-label-secondary">
          Ontdek {locations.length} {typePlural.toLowerCase()} geschikt voor peuters in {region.name}.
          Alle locaties zijn beoordeeld op peutervriendelijkheid.
        </p>

        {/* Location count */}
        <p className="mt-4 text-[13px] font-medium text-label-tertiary">
          {locations.length} {locations.length === 1 ? 'locatie' : 'locaties'}
        </p>

        {/* Location cards */}
        {locations.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {locations.map((loc) => (
              <ComboLocationCard key={loc.id} location={loc} regionSlug={regionSlug} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-card bg-bg-secondary p-6 text-center">
            <p className="text-[15px] text-label-secondary">
              Geen {typePlural.toLowerCase()} gevonden in {region.name}.
            </p>
            <Link
              href={`/${regionSlug}`}
              className="mt-3 inline-block text-[14px] font-medium text-accent hover:underline"
            >
              Bekijk alle uitjes in {region.name} →
            </Link>
          </div>
        )}

        {/* Related combos — other types in this region */}
        <nav className="mt-12 border-t border-separator pt-6">
          <h2 className="mb-3 text-[16px] font-semibold text-label">
            Ook in {region.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_SLUGS)
              .filter(([type]) => type !== typeKey)
              .map(([type, slugVal]) => (
                <Link
                  key={type}
                  href={`/${regionSlug}/${slugVal}`}
                  className="rounded-pill bg-bg-secondary px-3 py-1.5 text-[13px] font-medium text-label-secondary transition-colors hover:bg-bg-secondary/80 hover:text-label"
                >
                  {LOCATION_TYPE_LABELS[type as LocationType]}
                </Link>
              ))}
          </div>
        </nav>

        {/* Related combos — same type in other regions */}
        <nav className="mt-8 border-t border-separator pt-6">
          <h2 className="mb-3 text-[16px] font-semibold text-label">
            {typePlural} in andere steden
          </h2>
          <div className="flex flex-wrap gap-2">
            {allRegions
              .filter((r) => r.slug !== regionSlug)
              .slice(0, 12)
              .map((r) => (
                <Link
                  key={r.slug}
                  href={`/${r.slug}/${typeSlug}`}
                  className="rounded-pill bg-bg-secondary px-3 py-1.5 text-[13px] font-medium text-label-secondary transition-colors hover:bg-bg-secondary/80 hover:text-label"
                >
                  {r.name}
                </Link>
              ))}
          </div>
        </nav>

        {/* Back links */}
        <nav className="mt-8 flex flex-wrap gap-3 border-t border-separator pt-6">
          <Link
            href={`/${regionSlug}`}
            className="text-[14px] text-accent hover:underline"
          >
            Alle uitjes in {region.name}
          </Link>
          <span className="text-label-tertiary">·</span>
          <Link
            href={`/${typeSlug}`}
            className="text-[14px] text-accent hover:underline"
          >
            Alle {typePlural.toLowerCase()} in Nederland
          </Link>
        </nav>
      </article>
    </ContentShell>
  );
}

function ComboLocationCard({
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

/** Safely extract hostname from a URL string — handles missing protocol */
function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// ===========================================================================
// Sub-components (server components — no 'use client' needed)
// ===========================================================================

function HeroImage({
  photoUrl,
  name,
  typeColor,
}: {
  photoUrl: string | null;
  name: string;
  typeColor: string;
}) {
  // Only use external URLs (https://) — local paths (/images/...) aren't
  // available in v2 yet (Phase 3.5: photo migration to R2)
  const hasExternalPhoto = photoUrl && photoUrl.startsWith('http');

  if (hasExternalPhoto) {
    return (
      <div className="overflow-hidden rounded-card">
        <img
          src={photoUrl}
          alt={name}
          className="aspect-[16/9] w-full object-cover"
          loading="eager"
        />
      </div>
    );
  }

  // Fallback: gradient with map pin icon
  return (
    <div
      className="flex aspect-[16/9] items-center justify-center rounded-card"
      style={{
        background: `linear-gradient(135deg, ${typeColor} 0%, var(--color-bg-secondary) 100%)`,
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        className="text-white/50"
      >
        <path
          d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function QuickFacts({ location }: { location: Location }) {
  const facts: Array<{ label: string; value: string }> = [];

  if (location.price_band) {
    facts.push({
      label: 'Prijs',
      value: PRICE_BAND_LABELS[location.price_band] ?? location.price_band,
    });
  }

  if (location.min_age != null && location.max_age != null) {
    facts.push({
      label: 'Leeftijd',
      value: `${location.min_age}–${location.max_age} jaar`,
    });
  }

  if (location.weather) {
    const weatherLabels: Record<string, string> = {
      indoor: 'Binnen',
      outdoor: 'Buiten',
      both: 'Binnen & buiten',
    };
    facts.push({
      label: 'Type',
      value: weatherLabels[location.weather] ?? location.weather,
    });
  }

  if (facts.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-4 rounded-card bg-bg-secondary p-4">
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-[80px]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-label-tertiary">
            {fact.label}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-label">
            {fact.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function PracticalInfo({ location }: { location: Location }) {
  const hasAddress = location.website || location.opening_hours || location.coffee || location.diaper;
  if (!hasAddress) return null;

  return (
    <section className="mt-8">
      <h2 className="text-[20px] font-bold tracking-[-0.025em] text-label">
        Praktische info
      </h2>
      <div className="mt-3 space-y-3">
        {location.opening_hours && (
          <InfoRow label="Openingstijden" value={location.opening_hours} />
        )}
        {location.website && (
          <InfoRow
            label="Website"
            value={
              <a
                href={location.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {safeHostname(location.website)}
              </a>
            }
          />
        )}

        {/* Facilities */}
        <div className="flex flex-wrap gap-2 pt-1">
          {location.coffee && <FacilityBadge label="Koffie" icon="☕" />}
          {location.diaper && <FacilityBadge label="Verschoontafel" icon="🧷" />}
          {location.alcohol && <FacilityBadge label="Alcohol" icon="🍷" />}
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-[120px] flex-shrink-0 text-[13px] font-medium text-label-tertiary">
        {label}
      </span>
      <span className="text-[14px] text-label">{value}</span>
    </div>
  );
}

function FacilityBadge({ label, icon }: { label: string; icon: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-bg-secondary px-3 py-1 text-[13px] text-label-secondary">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function NearbyLocationCard({
  location,
  regionSlug,
}: {
  location: LocationSummary;
  regionSlug: string;
}) {
  const typeName = LOCATION_TYPE_LABELS[location.type] ?? location.type;
  const typeColor = `var(--color-cat-${location.type})`;

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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="text-label-tertiary"
            >
              <path
                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle
                cx="12"
                cy="10"
                r="3"
                stroke="currentColor"
                strokeWidth="1.5"
              />
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
      </div>
    </Link>
  );
}
