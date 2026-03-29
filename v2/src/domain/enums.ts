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

/** Plural Dutch labels for collection/combo pages */
export const LOCATION_TYPE_LABELS_PLURAL: Record<LocationType, string> = {
  play: 'Speeltuinen',
  farm: 'Kinderboerderijen',
  nature: 'Natuur',
  museum: 'Musea',
  swim: 'Zwemmen',
  pancake: 'Pannenkoeken',
  horeca: 'Horeca',
  culture: 'Cultuur',
};

/** CSS custom property for each category color — single source of truth */
export const TYPE_COLORS: Record<LocationType, string> = {
  play: 'var(--color-cat-play)',
  farm: 'var(--color-cat-farm)',
  nature: 'var(--color-cat-nature)',
  museum: 'var(--color-cat-museum)',
  culture: 'var(--color-cat-culture)',
  swim: 'var(--color-cat-swim)',
  pancake: 'var(--color-cat-pancake)',
  horeca: 'var(--color-cat-horeca)',
};

/** Human-readable Dutch labels for price bands */
export const PRICE_BAND_LABELS: Record<PriceBand, string> = {
  free: 'Gratis',
  low: 'Goedkoop',
  mid: 'Gemiddeld',
  high: 'Duur',
};

/** Age filter presets — covers the core PeuterPlannen audience */
export const AGE_PRESETS = [
  { key: '0-2', label: '0–2 jaar', min: 0, max: 2 },
  { key: '2-4', label: '2–4 jaar', min: 2, max: 4 },
  { key: '4-6', label: '4–6 jaar', min: 4, max: 6 },
] as const;
export type AgePresetKey = (typeof AGE_PRESETS)[number]['key'];

/** Score filter presets */
export const SCORE_PRESETS = [7, 8, 9] as const;
