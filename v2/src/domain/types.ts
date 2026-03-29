import type { LocationType, Weather, PriceBand, RegionTier, SeoTier } from './enums';

/** Core location entity — mirrors the Supabase `locations` table exactly */
export interface Location {
  id: number;
  created_at: string;
  name: string;
  region: string;
  type: LocationType;
  description: string | null;
  website: string | null;

  // Facilities
  coffee: boolean;
  diaper: boolean;
  alcohol: boolean;

  // Classification
  weather: Weather | null;
  place_id: string | null;
  min_age: number;
  max_age: number;
  toddler_highlight: string | null;
  price_band: PriceBand | null;

  // Geography
  lat: number;
  lng: number;
  distance_from_city_center_km: number | null;

  // Verification
  last_verified_at: string | null;
  last_verified: string | null;
  verification_source: string | null;
  verification_confidence: string | null;
  verification_mode: string | null;

  // Owner/claiming
  claimed_by_user_id: string | null;
  owner_verified: boolean;
  is_featured: boolean;
  featured_until: string | null;
  featured_tier: string | null;
  last_owner_update: string | null;
  owner_photo_url: string | null;

  // AI review
  ai_suitability_score_10: number | null;
  ai_suitability_confidence: string | null;
  ai_reviewed_at: string | null;
  ai_review_model: string | null;
  ai_review_version: string | null;
  ai_review_status: string | null;

  // Opening hours
  opening_hours: string | null;

  // SEO
  seo_tier: SeoTier;
  seo_quality_score: number | null;
  seo_title_override: string | null;
  seo_description_override: string | null;
  seo_intro_override: string | null;
  seo_primary_locality: string | null;
  seo_canonical_target: string | null;
  seo_exclude_from_sitemap: boolean;
  seo_last_decided_at: string | null;
  seo_notes: string | null;

  // Context/quality dimensions
  time_of_day_fit: string | null;
  rain_backup_quality: string | null;
  shade_or_shelter: string | null;
  parking_ease: string | null;
  buggy_friendliness: string | null;
  toilet_confidence: string | null;
  noise_level: string | null;
  food_fit: string | null;
  play_corner_quality: string | null;
  crowd_pattern: string | null;

  // Content refresh
  last_context_refresh_at: string | null;
  homepage_featured: boolean;

  // URL slug
  slug: string;

  // Photo
  photo_url: string | null;
  photo_source: string | null;
  photo_fetched_at: string | null;
  photo_quality: number | null;
}

/** Lightweight projection for map markers and list cards */
export interface LocationSummary {
  id: number;
  name: string;
  slug: string;
  type: LocationType;
  lat: number;
  lng: number;
  region: string;
  toddler_highlight: string | null;
  weather: Weather | null;
  ai_suitability_score_10: number | null;
  photo_url: string | null;
  is_featured: boolean;
  price_band: PriceBand | null;
  min_age: number | null;
  max_age: number | null;
}

/** GeoJSON Feature for map rendering */
export interface LocationFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [lng: number, lat: number] };
  properties: LocationSummary;
}

/** Region entity — mirrors the Supabase `regions` table */
export interface Region {
  id: number;
  name: string;
  slug: string;
  blurb: string | null;
  display_order: number;
  population: number | null;
  tier: RegionTier;
  schema_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Map viewport for viewport-based fetching */
export interface MapViewport {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom: number;
  center: { lat: number; lng: number };
}
