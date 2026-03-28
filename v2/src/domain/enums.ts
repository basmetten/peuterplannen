export const LOCATION_TYPES = [
  'play', 'farm', 'nature', 'museum',
  'swim', 'pancake', 'horeca', 'culture',
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const WEATHER_OPTIONS = ['indoor', 'outdoor', 'both'] as const;
export type Weather = (typeof WEATHER_OPTIONS)[number];

export const PRICE_BANDS = ['free', 'low', 'mid', 'high'] as const;
export type PriceBand = (typeof PRICE_BANDS)[number];

export const REGION_TIERS = ['primary', 'standard', 'region'] as const;
export type RegionTier = (typeof REGION_TIERS)[number];

export const SEO_TIERS = ['auto', 'support'] as const;
export type SeoTier = (typeof SEO_TIERS)[number];

export const SHEET_STATES = ['hidden', 'peek', 'half', 'full'] as const;
export type SheetState = (typeof SHEET_STATES)[number];

/** Human-readable Dutch labels for location types */
export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  play: 'Speeltuin',
  farm: 'Kinderboerderij',
  nature: 'Natuur',
  museum: 'Museum',
  swim: 'Zwemmen',
  pancake: 'Pannenkoeken',
  horeca: 'Horeca',
  culture: 'Cultuur',
};

/** Human-readable Dutch labels for price bands */
export const PRICE_BAND_LABELS: Record<PriceBand, string> = {
  free: 'Gratis',
  low: 'Goedkoop',
  mid: 'Gemiddeld',
  high: 'Duur',
};
