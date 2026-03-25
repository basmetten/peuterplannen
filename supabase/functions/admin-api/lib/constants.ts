export const DEFAULT_PAGE_SIZE = 50;

export const REQUIRED_TRUST_FIELDS = [
  "seo_primary_locality",
  "verification_mode",
  "verification_confidence",
  "time_of_day_fit",
  "rain_backup_quality",
  "buggy_friendliness",
  "toilet_confidence",
  "food_fit",
  "play_corner_quality",
] as const;

export const PRICE_BANDS = ["free", "low", "mid", "high"];
export const TIME_OF_DAY_OPTIONS = ["ochtend", "middag", "hele dag", "flexibel"];
export const VERIFICATION_MODES = ["editorial", "partner", "parent_signal", "web_verified", "phone_verified", "visit_verified"];
export const SEO_TIERS = ["auto", "index", "support", "alias"];
export const OBSERVATION_STATUSES = ["pending", "approved", "rejected", "applied"];
export const EDITORIAL_PAGE_TYPES = [
  "discover_hub",
  "methodology_page",
  "region_hub",
  "type_hub",
  "cluster_hub",
  "blog_index",
  "blog_article",
  "location_detail_override",
];
export const EDITORIAL_STATUSES = ["draft", "published", "archived"];
export const QUALITY_TASK_STATUSES = ["open", "in_progress", "resolved", "dismissed"];

export const LOCATION_DETAIL_SELECT = [
  "id", "name", "region", "type", "website", "opening_hours", "owner_photo_url", "description", "toddler_highlight", "weather",
  "min_age", "max_age", "coffee", "diaper", "alcohol", "is_featured", "featured_until", "owner_verified",
  "claimed_by_user_id", "last_verified", "last_verified_at",
  "seo_tier", "seo_quality_score", "seo_primary_locality", "seo_title_override", "seo_description_override",
  "seo_intro_override", "seo_canonical_target", "seo_exclude_from_sitemap",
  "price_band", "time_of_day_fit", "rain_backup_quality", "shade_or_shelter", "parking_ease",
  "buggy_friendliness", "toilet_confidence", "noise_level", "food_fit", "play_corner_quality", "crowd_pattern",
  "verification_mode", "verification_confidence", "last_context_refresh_at",
].join(", ");
