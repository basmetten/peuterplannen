/** Supabase column selections — only fetch what we need */
export const LOCATION_SUMMARY_COLUMNS = `
  id, name, slug, type, lat, lng, region,
  toddler_highlight, weather, ai_suitability_score_10,
  photo_url, is_featured, price_band, min_age, max_age
`.trim();

export const LOCATION_DETAIL_COLUMNS = '*';

/** Default map center (Amsterdam) */
export const DEFAULT_MAP_CENTER = { lat: 52.37, lng: 4.90 } as const;
export const DEFAULT_MAP_ZOOM = 8;

/** Site metadata */
export const SITE_NAME = 'PeuterPlannen';
export const SITE_DESCRIPTION = 'Ontdek de leukste uitjes met peuters in heel Nederland';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://peuterplannen.nl';
