import type { Location } from '@/domain/types';
import type { LocationType } from '@/domain/enums';
import { LOCATION_TYPE_LABELS } from '@/domain/enums';
import { SITE_URL, SITE_NAME } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Type slug mapping (internal enum → Dutch URL slug)
// ---------------------------------------------------------------------------

export const TYPE_SLUGS: Record<LocationType, string> = {
  play: 'speeltuinen',
  farm: 'boerderijen',
  nature: 'natuur',
  museum: 'musea',
  swim: 'zwemmen',
  pancake: 'pannenkoeken',
  horeca: 'horeca',
  culture: 'cultuur',
};

export const SLUG_TO_TYPE: Record<string, LocationType> = Object.fromEntries(
  Object.entries(TYPE_SLUGS).map(([type, slug]) => [slug, type as LocationType]),
) as Record<string, LocationType>;

/** All known type slugs — used for route conflict resolution */
export const KNOWN_TYPE_SLUGS = new Set(Object.values(TYPE_SLUGS));

// ---------------------------------------------------------------------------
// Schema.org type mapping
// ---------------------------------------------------------------------------

export const SCHEMA_TYPE_MAP: Record<LocationType, string> = {
  play: 'Playground',
  farm: 'LocalBusiness',
  nature: 'TouristAttraction',
  museum: 'Museum',
  swim: 'SportsActivityLocation',
  pancake: 'Restaurant',
  horeca: 'Restaurant',
  culture: 'TouristAttraction',
};

// ---------------------------------------------------------------------------
// SEO title / description generation
// ---------------------------------------------------------------------------

/** Generate SEO title — uses override if available, otherwise auto-generates */
export function generateSeoTitle(location: Location, regionName: string): string {
  if (location.seo_title_override) return location.seo_title_override;

  const typeName = LOCATION_TYPE_LABELS[location.type] ?? location.type;
  const city = location.seo_primary_locality || regionName;
  // Don't append SITE_NAME — the root layout template adds "| PeuterPlannen" automatically
  return `${location.name} ${city} — ${typeName} voor peuters`;
}

/** Generate SEO description — uses override if available, otherwise auto-generates */
export function generateSeoDescription(location: Location, regionName: string): string {
  if (location.seo_description_override) return location.seo_description_override;

  const typeName = (LOCATION_TYPE_LABELS[location.type] ?? location.type).toLowerCase();
  const city = location.seo_primary_locality || regionName;

  const facilities: string[] = [];
  if (location.coffee) facilities.push('koffie');
  if (location.diaper) facilities.push('verschoonfaciliteit');
  const facilityStr = facilities.length > 0 ? ` Met ${facilities.join(' en ')}.` : '';

  return `${location.name} in ${city}: ${typeName} geschikt voor peuters.${facilityStr} Ontdek tips en faciliteiten voor je bezoek met kleintjes.`;
}

// ---------------------------------------------------------------------------
// Indexation / graduation
// ---------------------------------------------------------------------------

/** Whether a location should be indexed by search engines */
export function shouldIndex(location: Location): boolean {
  if (location.seo_exclude_from_sitemap) return false;
  if (!location.seo_tier) return false;
  return true;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Canonical URL for a location detail page */
export function locationCanonicalUrl(regionSlug: string, locationSlug: string): string {
  return `${SITE_URL}/${encodeURIComponent(regionSlug)}/${encodeURIComponent(locationSlug)}`;
}

/** Canonical URL for a region hub page */
export function regionCanonicalUrl(regionSlug: string): string {
  return `${SITE_URL}/${encodeURIComponent(regionSlug)}`;
}

// ---------------------------------------------------------------------------
// Quality dimension labels (Dutch)
// ---------------------------------------------------------------------------

export const QUALITY_DIMENSION_LABELS: Record<string, string> = {
  parking_ease: 'Parkeren',
  buggy_friendliness: 'Buggy-vriendelijk',
  toilet_confidence: 'Toiletten',
  shade_or_shelter: 'Schaduw / overdekt',
  rain_backup_quality: 'Regenplan',
  food_fit: 'Eten & drinken',
  play_corner_quality: 'Speelhoek',
  noise_level: 'Geluidsniveau',
  crowd_pattern: 'Drukte',
  time_of_day_fit: 'Beste moment',
};

/** Quality rating labels (English DB values → Dutch display) */
export const QUALITY_RATING_LABELS: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Uitstekend', color: 'var(--color-accent)' },
  good: { label: 'Goed', color: '#4CAF50' },
  adequate: { label: 'Voldoende', color: '#FFC107' },
  limited: { label: 'Beperkt', color: '#FF9800' },
  poor: { label: 'Matig', color: '#F44336' },
  none: { label: 'Niet aanwezig', color: 'var(--color-label-tertiary)' },
  // Time-of-day values
  morning: { label: 'Ochtend', color: 'var(--color-accent)' },
  afternoon: { label: 'Middag', color: 'var(--color-accent)' },
  'all-day': { label: 'Hele dag', color: '#4CAF50' },
  // Noise
  quiet: { label: 'Rustig', color: '#4CAF50' },
  moderate: { label: 'Gemiddeld', color: '#FFC107' },
  loud: { label: 'Druk', color: '#FF9800' },
  // Crowd
  low: { label: 'Weinig druk', color: '#4CAF50' },
  medium: { label: 'Gemiddeld', color: '#FFC107' },
  high: { label: 'Druk', color: '#FF9800' },
};
