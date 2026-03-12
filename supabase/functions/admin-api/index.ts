import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ADMIN_EMAIL = "basmetten@gmail.com";
const DEFAULT_PAGE_SIZE = 50;
const REQUIRED_TRUST_FIELDS = [
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
const PRICE_BANDS = ["free", "low", "mid", "high"];
const TIME_OF_DAY_OPTIONS = ["ochtend", "middag", "hele dag", "flexibel"];
const VERIFICATION_MODES = ["editorial", "partner", "parent_signal", "web_verified", "phone_verified", "visit_verified"];
const SEO_TIERS = ["auto", "index", "support", "alias"];
const OBSERVATION_STATUSES = ["pending", "approved", "rejected", "applied"];
const EDITORIAL_PAGE_TYPES = [
  "discover_hub",
  "methodology_page",
  "region_hub",
  "type_hub",
  "cluster_hub",
  "blog_index",
  "blog_article",
  "location_detail_override",
];
const EDITORIAL_STATUSES = ["draft", "published", "archived"];
const QUALITY_TASK_STATUSES = ["open", "in_progress", "resolved", "dismissed"];

const LOCATION_DETAIL_SELECT = [
  "id", "name", "region", "type", "website", "opening_hours", "owner_photo_url", "description", "toddler_highlight", "weather",
  "min_age", "max_age", "coffee", "diaper", "alcohol", "is_featured", "featured_until", "owner_verified",
  "claimed_by_user_id", "last_verified", "last_verified_at",
  "seo_tier", "seo_quality_score", "seo_primary_locality", "seo_title_override", "seo_description_override",
  "seo_intro_override", "seo_canonical_target", "seo_exclude_from_sitemap",
  "price_band", "time_of_day_fit", "rain_backup_quality", "shade_or_shelter", "parking_ease",
  "buggy_friendliness", "toilet_confidence", "noise_level", "food_fit", "play_corner_quality", "crowd_pattern",
  "verification_mode", "verification_confidence", "last_context_refresh_at",
].join(", ");

const CORS = {
  "Access-Control-Allow-Origin": "https://admin.peuterplannen.nl",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = "BAD_REQUEST", status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

function parseBody(req: Request): Promise<{ action: string; params: Record<string, unknown> }> {
  return req
    .json()
    .then((body) => {
      const action = typeof body?.action === "string" ? body.action : "";
      const params = body?.params && typeof body.params === "object" ? body.params : {};
      if (!action) {
        throw new AppError("Action ontbreekt", "INVALID_ACTION", 400);
      }
      return { action, params: params as Record<string, unknown> };
    })
    .catch((error) => {
      if (error instanceof AppError) throw error;
      throw new AppError("Body is geen geldig JSON-object", "INVALID_JSON", 400);
    });
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asInteger(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = `${value}`.trim();
  return text ? text : null;
}

function asNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? Number(num) : null;
}

function asNullableBoolean(value: unknown): boolean | null {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return null;
}

function asTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => `${item}`.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function asNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0);
  }
  return [];
}

function asJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function assertUuid(value: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new AppError(`${fieldName} is ongeldig`, "INVALID_UUID", 400);
  }
}

function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeExternalHost(url: string | null): string {
  if (!url) return "";
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isMissingRelationError(message: string, relation?: string): boolean {
  const normalized = message.toLowerCase();
  if (relation) {
    return normalized.includes(`relation \"${relation.toLowerCase()}\" does not exist`);
  }
  return normalized.includes("does not exist") && normalized.includes("relation");
}

async function requireAdminUser(authHeader: string | null): Promise<{ id: string; email: string }> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const email = data.user.email || "";
  if (email !== ADMIN_EMAIL) {
    throw new AppError("Forbidden", "FORBIDDEN", 403);
  }

  return { id: data.user.id, email };
}

function validateClaimStatus(status: string): string {
  const allowed = ["pending", "approved", "rejected", "auto_rejected_duplicate"];
  if (!allowed.includes(status)) {
    throw new AppError("Ongeldige claim-status", "INVALID_STATUS", 400);
  }
  return status;
}

function validateSubscriptionStatus(status: string): string {
  const allowed = ["none", "trial", "featured", "past_due", "canceled"];
  if (!allowed.includes(status)) {
    throw new AppError("Ongeldige subscription_status", "INVALID_SUBSCRIPTION_STATUS", 400);
  }
  return status;
}

function validatePlanTier(tier: string): string {
  const allowed = ["none", "featured"];
  if (!allowed.includes(tier)) {
    throw new AppError("Ongeldige plan_tier", "INVALID_PLAN_TIER", 400);
  }
  return tier;
}

function validateObservationStatus(status: string): string {
  if (!OBSERVATION_STATUSES.includes(status)) {
    throw new AppError("Ongeldige observation status", "INVALID_OBSERVATION_STATUS", 400);
  }
  return status;
}

function validateSeoTier(tier: string): string {
  if (!SEO_TIERS.includes(tier)) {
    throw new AppError("Ongeldige seo_tier", "INVALID_SEO_TIER", 400);
  }
  return tier;
}

function validatePriceBand(value: string | null): string | null {
  if (!value) return null;
  if (!PRICE_BANDS.includes(value)) throw new AppError("Ongeldige prijsband", "INVALID_PRICE_BAND", 400);
  return value;
}

function validateTimeOfDayFit(value: string | null): string | null {
  if (!value) return null;
  if (!TIME_OF_DAY_OPTIONS.includes(value)) throw new AppError("Ongeldige dagdeel-fit", "INVALID_TIME_OF_DAY", 400);
  return value;
}

function validateVerificationMode(value: string | null): string | null {
  if (!value) return null;
  if (!VERIFICATION_MODES.includes(value)) throw new AppError("Ongeldige verification_mode", "INVALID_VERIFICATION_MODE", 400);
  return value;
}

function validateEditorialPageType(value: string): string {
  if (!EDITORIAL_PAGE_TYPES.includes(value)) throw new AppError("Ongeldig editorial page type", "INVALID_PAGE_TYPE", 400);
  return value;
}

function validateEditorialStatus(value: string): string {
  if (!EDITORIAL_STATUSES.includes(value)) throw new AppError("Ongeldige editorial status", "INVALID_EDITORIAL_STATUS", 400);
  return value;
}

function validateQualityTaskStatus(value: string): string {
  if (!QUALITY_TASK_STATUSES.includes(value)) throw new AppError("Ongeldige quality task status", "INVALID_QUALITY_TASK_STATUS", 400);
  return value;
}

function summarizeQualityTaskDetails(taskType: string, details: unknown): string {
  if (!details || typeof details !== "object") return taskType;
  const payload = details as Record<string, unknown>;
  if (typeof payload.summary === "string" && payload.summary.trim()) return payload.summary.trim();
  if (Array.isArray(payload.missing_fields) && payload.missing_fields.length) {
    return `Ontbreekt: ${payload.missing_fields.map((field) => String(field)).join(", ")}`;
  }
  if (typeof payload.reason === "string" && payload.reason.trim()) return payload.reason.trim();
  if (typeof payload.target_url === "string" && payload.target_url.trim()) return `Doel: ${payload.target_url.trim()}`;
  return taskType;
}

function summarizeOpsBriefPayload(briefType: string, payload: unknown): string {
  if (!payload || typeof payload !== "object") return briefType;
  const data = payload as Record<string, unknown>;
  if (briefType === "seo_ops") {
    const summary = data.summary && typeof data.summary === "object" ? data.summary as Record<string, unknown> : {};
    return `SEO brief · ${summary.clicks ?? 0} kliks · ${summary.impressions ?? 0} vertoningen`;
  }
  if (briefType === "newsletter") {
    const regions = Array.isArray(data.priority_regions) ? data.priority_regions.slice(0, 3).map((item) => String(item)).join(", ") : "";
    return regions ? `Nieuwsbriefkandidaten rond ${regions}` : "Nieuwsbriefkandidaten";
  }
  if (briefType === "distribution") {
    const topPages = Array.isArray(data.top_pages) ? data.top_pages.length : 0;
    return `Distribution angles op basis van ${topPages} page-signalen`;
  }
  return briefType;
}

function isMissingRpcError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the function") ||
    normalized.includes("function public.admin_approve_claim") ||
    normalized.includes("admin_approve_claim(") ||
    normalized.includes("schema cache");
}

async function fetchEmailMap(userIds: string[], concurrency = 12): Promise<Record<string, string>> {
  const uniqueUserIds = [...new Set(userIds.filter((id) => typeof id === "string" && id.length > 0))];
  const emailMap: Record<string, string> = {};

  for (let index = 0; index < uniqueUserIds.length; index += concurrency) {
    const chunk = uniqueUserIds.slice(index, index + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (uid) => {
        const { data } = await supabase.auth.admin.getUserById(uid);
        return { uid, email: data?.user?.email || "onbekend" };
      }),
    );

    chunkResults.forEach((item) => {
      emailMap[item.uid] = item.email;
    });
  }

  return emailMap;
}

async function approveClaimInline(claimId: string, adminUserId: string) {
  const { data: claim, error: claimError } = await supabase
    .from("location_claim_requests")
    .select("id, user_id, location_id, status")
    .eq("id", claimId)
    .maybeSingle();

  if (claimError) throw new AppError(claimError.message, "APPROVE_CLAIM_FAILED", 400);
  if (!claim) throw new AppError("Claim niet gevonden", "CLAIM_NOT_FOUND", 404);
  if (claim.status !== "pending") throw new AppError("Claim is niet meer openstaand", "CLAIM_NOT_OPEN", 409);

  const approvedAt = new Date().toISOString();

  const { error: approveError } = await supabase
    .from("location_claim_requests")
    .update({
      status: "approved",
      review_reason: "Goedgekeurd door admin",
      reviewed_by: adminUserId,
      reviewed_at: approvedAt,
    })
    .eq("id", claimId)
    .eq("status", "pending");

  if (approveError) throw new AppError(approveError.message, "APPROVE_CLAIM_FAILED", 400);

  const { data: competingOwners, error: competingOwnersError } = await supabase
    .from("venue_owners")
    .select("id, user_id")
    .eq("location_id", claim.location_id)
    .neq("user_id", claim.user_id);

  if (competingOwnersError) throw new AppError(competingOwnersError.message, "APPROVE_CLAIM_FAILED", 400);

  if ((competingOwners ?? []).length) {
    const { error: clearOwnersError } = await supabase
      .from("venue_owners")
      .update({ location_id: null, updated_at: approvedAt })
      .eq("location_id", claim.location_id)
      .neq("user_id", claim.user_id);

    if (clearOwnersError) throw new AppError(clearOwnersError.message, "APPROVE_CLAIM_FAILED", 400);
  }

  const { data: existingOwner, error: existingOwnerError } = await supabase
    .from("venue_owners")
    .select("id")
    .eq("user_id", claim.user_id)
    .maybeSingle();

  if (existingOwnerError) throw new AppError(existingOwnerError.message, "APPROVE_CLAIM_FAILED", 400);

  let ownerId = existingOwner?.id ?? null;
  if (existingOwner) {
    const { error: updateOwnerError } = await supabase
      .from("venue_owners")
      .update({ location_id: claim.location_id, updated_at: approvedAt })
      .eq("id", existingOwner.id);

    if (updateOwnerError) throw new AppError(updateOwnerError.message, "APPROVE_CLAIM_FAILED", 400);
  } else {
    const { data: insertedOwner, error: insertOwnerError } = await supabase
      .from("venue_owners")
      .insert({ user_id: claim.user_id, location_id: claim.location_id, updated_at: approvedAt })
      .select("id")
      .single();

    if (insertOwnerError) throw new AppError(insertOwnerError.message, "APPROVE_CLAIM_FAILED", 400);
    ownerId = insertedOwner.id;
  }

  const { error: locationError } = await supabase
    .from("locations")
    .update({ claimed_by_user_id: claim.user_id })
    .eq("id", claim.location_id);

  if (locationError) throw new AppError(locationError.message, "APPROVE_CLAIM_FAILED", 400);

  const { data: autoRejectedRows, error: autoRejectError } = await supabase
    .from("location_claim_requests")
    .update({
      status: "auto_rejected_duplicate",
      review_reason: "Auto-afgewezen: andere claim op deze locatie is goedgekeurd.",
      reviewed_by: adminUserId,
      reviewed_at: approvedAt,
    })
    .eq("location_id", claim.location_id)
    .neq("id", claimId)
    .eq("status", "pending")
    .select("id");

  if (autoRejectError) throw new AppError(autoRejectError.message, "APPROVE_CLAIM_FAILED", 400);

  return {
    ok: true,
    approved_claim_id: claimId,
    auto_rejected_claim_ids: (autoRejectedRows ?? []).map((row: { id: string }) => row.id),
    owner_id: ownerId,
    location_id: claim.location_id,
  };
}

async function approveClaim(claimId: string, adminUserId: string) {
  const { data, error } = await supabase.rpc("admin_approve_claim", {
    p_claim_id: claimId,
    p_admin_user_id: adminUserId,
  });

  if (!error) return data;
  if (isMissingRpcError(error.message)) return await approveClaimInline(claimId, adminUserId);
  throw new AppError(error.message, "APPROVE_CLAIM_FAILED", 400);
}

function normalizeObservationFieldValue(fieldName: string, valueJson: unknown): unknown {
  const stringFields = new Set([
    "description",
    "toddler_highlight",
    "website",
    "opening_hours",
    "weather",
    "owner_photo_url",
    "seo_primary_locality",
    "verification_mode",
    "time_of_day_fit",
    "rain_backup_quality",
    "shade_or_shelter",
    "parking_ease",
    "buggy_friendliness",
    "toilet_confidence",
    "noise_level",
    "food_fit",
    "play_corner_quality",
    "crowd_pattern",
    "price_band",
  ]);

  if (fieldName === "verification_confidence") {
    const value = asNullableNumber(valueJson);
    if (value == null || value < 0 || value > 1) {
      throw new AppError("Observation confidence moet tussen 0 en 1 liggen", "INVALID_OBSERVATION_VALUE", 400);
    }
    return value;
  }

  if (fieldName === "min_age" || fieldName === "max_age") {
    const value = asNullableNumber(valueJson);
    if (value == null) return null;
    if (value < 0 || value > 18) {
      throw new AppError(`${fieldName} moet tussen 0 en 18 liggen`, "INVALID_OBSERVATION_VALUE", 400);
    }
    return Math.trunc(value);
  }

  if (fieldName === "coffee" || fieldName === "diaper" || fieldName === "alcohol") {
    const value = asNullableBoolean(valueJson);
    if (value == null) {
      throw new AppError(`${fieldName} moet true of false zijn`, "INVALID_OBSERVATION_VALUE", 400);
    }
    return value;
  }

  if (stringFields.has(fieldName)) {
    const value = asNullableString(valueJson);
    if (fieldName === "price_band") return validatePriceBand(value);
    if (fieldName === "time_of_day_fit") return validateTimeOfDayFit(value);
    if (fieldName === "verification_mode") return validateVerificationMode(value);
    return value;
  }

  throw new AppError(`Observation veld wordt nog niet ondersteund: ${fieldName}`, "UNSUPPORTED_OBSERVATION_FIELD", 400);
}

function normalizeLocationPatch(params: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  const textFields = [
    "description",
    "toddler_highlight",
    "website",
    "opening_hours",
    "owner_photo_url",
    "seo_primary_locality",
    "seo_title_override",
    "seo_description_override",
    "seo_intro_override",
    "rain_backup_quality",
    "shade_or_shelter",
    "parking_ease",
    "buggy_friendliness",
    "toilet_confidence",
    "noise_level",
    "food_fit",
    "play_corner_quality",
    "crowd_pattern",
  ];

  for (const field of textFields) {
    if (Object.prototype.hasOwnProperty.call(params, field)) {
      patch[field] = asNullableString(params[field]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(params, "price_band")) {
    patch.price_band = validatePriceBand(asNullableString(params.price_band));
  }
  if (Object.prototype.hasOwnProperty.call(params, "time_of_day_fit")) {
    patch.time_of_day_fit = validateTimeOfDayFit(asNullableString(params.time_of_day_fit));
  }
  if (Object.prototype.hasOwnProperty.call(params, "verification_mode")) {
    patch.verification_mode = validateVerificationMode(asNullableString(params.verification_mode));
  }
  if (Object.prototype.hasOwnProperty.call(params, "verification_confidence")) {
    const value = asNullableNumber(params.verification_confidence);
    if (value != null && (value < 0 || value > 1)) {
      throw new AppError("verification_confidence moet tussen 0 en 1 liggen", "INVALID_VERIFICATION_CONFIDENCE", 400);
    }
    patch.verification_confidence = value;
  }
  if (Object.prototype.hasOwnProperty.call(params, "seo_tier")) {
    patch.seo_tier = validateSeoTier(asString(params.seo_tier, "auto"));
  }
  if (Object.prototype.hasOwnProperty.call(params, "seo_exclude_from_sitemap")) {
    const value = asNullableBoolean(params.seo_exclude_from_sitemap);
    if (value == null) throw new AppError("seo_exclude_from_sitemap moet true of false zijn", "INVALID_BOOLEAN", 400);
    patch.seo_exclude_from_sitemap = value;
  }
  if (Object.prototype.hasOwnProperty.call(params, "seo_canonical_target")) {
    const value = asNullableNumber(params.seo_canonical_target);
    patch.seo_canonical_target = value == null ? null : Math.trunc(value);
  }
  if (Object.prototype.hasOwnProperty.call(params, "coffee")) {
    const value = asNullableBoolean(params.coffee);
    if (value == null) throw new AppError("coffee moet true of false zijn", "INVALID_BOOLEAN", 400);
    patch.coffee = value;
  }
  if (Object.prototype.hasOwnProperty.call(params, "diaper")) {
    const value = asNullableBoolean(params.diaper);
    if (value == null) throw new AppError("diaper moet true of false zijn", "INVALID_BOOLEAN", 400);
    patch.diaper = value;
  }
  if (Object.prototype.hasOwnProperty.call(params, "alcohol")) {
    const value = asNullableBoolean(params.alcohol);
    if (value == null) throw new AppError("alcohol moet true of false zijn", "INVALID_BOOLEAN", 400);
    patch.alcohol = value;
  }
  if (Object.prototype.hasOwnProperty.call(params, "weather")) {
    patch.weather = asNullableString(params.weather);
  }
  if (Object.prototype.hasOwnProperty.call(params, "min_age")) {
    const value = asNullableNumber(params.min_age);
    patch.min_age = value == null ? null : Math.trunc(value);
  }
  if (Object.prototype.hasOwnProperty.call(params, "max_age")) {
    const value = asNullableNumber(params.max_age);
    patch.max_age = value == null ? null : Math.trunc(value);
  }

  patch.last_context_refresh_at = new Date().toISOString();
  return patch;
}

function normalizeEditorialPayload(params: Record<string, unknown>, adminUserId: string) {
  const pageType = validateEditorialPageType(asString(params.page_type));
  const slug = asString(params.slug).trim();
  const status = validateEditorialStatus(asString(params.status || "draft"));
  const title = asString(params.title).trim();

  if (!slug) throw new AppError("slug ontbreekt", "MISSING_SLUG", 400);
  if (!title) throw new AppError("title ontbreekt", "MISSING_TITLE", 400);

  const payload: Record<string, unknown> = {
    page_type: pageType,
    slug,
    region_slug: asNullableString(params.region_slug),
    type_slug: asNullableString(params.type_slug),
    cluster_slug: asNullableString(params.cluster_slug),
    location_id: asNullableNumber(params.location_id),
    status,
    title,
    meta_title: asNullableString(params.meta_title),
    meta_description: asNullableString(params.meta_description),
    hero_kicker: asNullableString(params.hero_kicker),
    hero_body_md: asNullableString(params.hero_body_md),
    body_md: asNullableString(params.body_md),
    faq_json: asJsonArray(params.faq_json),
    curated_location_ids: asNumberArray(params.curated_location_ids),
    related_blog_slugs: asTextArray(params.related_blog_slugs),
    editorial_label: asNullableString(params.editorial_label) || "PeuterPlannen redactie",
    updated_by: adminUserId,
    updated_at: new Date().toISOString(),
    published_at: status === "published" ? (asNullableString(params.published_at) || new Date().toISOString()) : null,
  };

  if (payload.location_id != null) payload.location_id = Math.trunc(Number(payload.location_id));
  return payload;
}

function buildLocationEditorialDraft(location: Record<string, unknown>, taskSummary: string): Record<string, unknown> {
  const region = asString(location.region);
  const slug = slugify(asString(location.name));
  const locality = asString(location.seo_primary_locality);
  const website = asString(location.website);
  const intro = asString(location.seo_intro_override) || asString(location.toddler_highlight) || asString(location.description);
  const signalLabel = [
    location.verification_mode ? `Verification mode: ${location.verification_mode}` : null,
    location.last_verified ? `Laatst geverifieerd: ${location.last_verified}` : null,
    location.time_of_day_fit ? `Dagdeel-fit: ${location.time_of_day_fit}` : null,
  ].filter(Boolean).join(" · ");

  const body = [
    "## Redactionele opdracht",
    "",
    "Werk deze detailpagina uit als een praktisch profiel voor ouders met jonge kinderen. Vermijd generieke superlatieven en benoem alleen concrete observaties die helpen kiezen.",
    "",
    "## Huidige facts",
    "",
    `- Regio: ${region || "onbekend"}`,
    `- Type: ${asString(location.type) || "onbekend"}`,
    `- Locality/wijk: ${locality || "nog invullen"}`,
    `- Website: ${website || "geen website opgeslagen"}`,
    `- Signalen: ${signalLabel || "nog aanvullen"}`,
    taskSummary ? `- Quality task: ${taskSummary}` : null,
    "",
    "## Bestaande omschrijving",
    "",
    intro || "_Nog geen bruikbare basisomschrijving aanwezig._",
    "",
    "## Nog uitwerken",
    "",
    "- Wat doet een kind hier concreet?",
    "- Waarom werkt dit met peuters of dreumesen?",
    "- Wat moet een ouder vooraf weten qua logistiek, tempo en faciliteiten?",
    "- Wat zijn logische alternatieven of combinaties in de buurt?",
    "",
    "## Werkcopy",
    "",
    "### Waarom dit werkt met peuters",
    "",
    "_Schrijf hier een korte, concrete alinea._",
    "",
    "### Handig om vooraf te weten",
    "",
    "- _Vul in_",
    "- _Vul in_",
    "- _Vul in_",
    "",
    "### Combineer met",
    "",
    "- _Gerelateerde plek of hub_",
  ].filter(Boolean).join("\n");

  return {
    page_type: "location_detail_override",
    slug,
    region_slug: slugify(region) || null,
    type_slug: null,
    cluster_slug: null,
    location_id: Number(location.id),
    status: "draft",
    title: asString(location.seo_title_override) || `${asString(location.name)} — redactioneel detaildraft`,
    meta_title: asNullableString(location.seo_title_override),
    meta_description: asNullableString(location.seo_description_override),
    hero_kicker: "Concept · detailpagina",
    hero_body_md: asNullableString(location.seo_intro_override) || asNullableString(location.toddler_highlight) || asNullableString(location.description),
    body_md: body,
    faq_json: [],
    curated_location_ids: [],
    related_blog_slugs: [],
    editorial_label: "Concept · PeuterPlannen redactie",
    published_at: null,
  };
}

function computeContextGaps(locations: Array<Record<string, unknown>>) {
  return locations
    .map((loc) => {
      const missingFields = REQUIRED_TRUST_FIELDS.filter((field) => {
        const value = loc[field as string];
        return value == null || value === "";
      });
      const tier = asString(loc.seo_tier, "auto");
      const score =
        (tier === "index" ? 40 : tier === "support" ? 10 : 20) +
        (loc.is_featured ? 20 : 0) +
        (loc.owner_verified ? 10 : 0) +
        missingFields.length * 3;

      return {
        location_id: loc.id,
        name: loc.name,
        region: loc.region,
        seo_tier: tier,
        missing_fields: missingFields,
        missing_count: missingFields.length,
        score,
        verification_mode: loc.verification_mode ?? null,
        verification_confidence: loc.verification_confidence ?? null,
        last_context_refresh_at: loc.last_context_refresh_at ?? null,
        last_verified_at: loc.last_verified_at ?? null,
      };
    })
    .filter((row) => row.missing_count > 0)
    .sort((a, b) => b.score - a.score || b.missing_count - a.missing_count || `${a.name}`.localeCompare(`${b.name}`, "nl"));
}

function asObjectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>> : [];
}

function summarizeGscSnapshots(rows: Array<Record<string, unknown>>) {
  const latestByType = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const snapshotType = asString(row.snapshot_type);
    if (!snapshotType || latestByType.has(snapshotType)) continue;
    latestByType.set(snapshotType, row);
  }

  const trendsPayload = latestByType.get("gsc_trends")?.payload_json as Record<string, unknown> | undefined;
  const auditPayload = latestByType.get("gsc_audit")?.payload_json as Record<string, unknown> | undefined;
  const summarySource = trendsPayload ?? auditPayload ?? {};
  const summary = summarySource.summary && typeof summarySource.summary === "object"
    ? summarySource.summary as Record<string, unknown>
    : {};
  const current = summary.current && typeof summary.current === "object"
    ? summary.current as Record<string, unknown>
    : {};
  const delta = summary.delta && typeof summary.delta === "object"
    ? summary.delta as Record<string, unknown>
    : {};

  const topPages = asObjectArray(trendsPayload?.top_pages).slice(0, 8);
  const topQueries = asObjectArray(trendsPayload?.top_queries).slice(0, 8);
  const pageTypeBreakdown = asObjectArray(trendsPayload?.page_type_breakdown).slice(0, 8);
  const comparison = trendsPayload?.comparison && typeof trendsPayload.comparison === "object"
    ? trendsPayload.comparison as Record<string, unknown>
    : {};
  const nearWinPages = asObjectArray(comparison.near_win_pages).slice(0, 8);
  const lowCtrPages = asObjectArray(comparison.low_ctr_pages).slice(0, 8);

  return {
    latest_snapshot_at: asNullableString(latestByType.get("gsc_trends")?.created_at ?? latestByType.get("gsc_audit")?.created_at),
    snapshots_present: {
      gsc_trends: latestByType.has("gsc_trends"),
      gsc_audit: latestByType.has("gsc_audit"),
    },
    summary: {
      clicks: Number(current.clicks) || 0,
      impressions: Number(current.impressions) || 0,
      ctr: Number(current.ctr) || 0,
      position: Number(current.position) || 0,
      click_delta: Number(delta.click_delta) || 0,
      impression_delta: Number(delta.impression_delta) || 0,
      ctr_delta: Number(delta.ctr_delta) || 0,
      position_change: Number(delta.position_change) || 0,
    },
    top_pages: topPages,
    top_queries: topQueries,
    near_win_pages: nearWinPages,
    low_ctr_pages: lowCtrPages,
    page_type_breakdown: pageTypeBreakdown,
    sitemap_summary: auditPayload?.sitemap_summary ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const requestId = getRequestId(req);

  try {
    const admin = await requireAdminUser(req.headers.get("Authorization"));
    const { action, params } = await parseBody(req);

    let result: unknown;

    switch (action) {
      case "get_stats": {
        const [pendingClaims, activeOwners, recentEdits, totalOwners, pendingObservations, openTasks] = await Promise.all([
          supabase.from("location_claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("venue_owners").select("id", { count: "exact", head: true }).in("subscription_status", ["featured", "trial"]),
          supabase.from("location_edit_log").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from("venue_owners").select("id", { count: "exact", head: true }),
          supabase.from("location_observations").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("location_quality_tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
        ]);

        const firstError = pendingClaims.error || activeOwners.error || recentEdits.error || totalOwners.error || pendingObservations.error || openTasks.error;
        if (firstError) {
          if (isMissingRelationError(firstError.message, "location_quality_tasks")) {
            result = {
              pending_claims: pendingClaims.count ?? 0,
              active_subs: activeOwners.count ?? 0,
              edits_last_7days: recentEdits.count ?? 0,
              total_owners: totalOwners.count ?? 0,
              pending_observations: pendingObservations.count ?? 0,
              open_quality_tasks: 0,
            };
            break;
          }
          throw new AppError(firstError.message, "STATS_QUERY_FAILED", 400);
        }

        result = {
          pending_claims: pendingClaims.count ?? 0,
          active_subs: activeOwners.count ?? 0,
          edits_last_7days: recentEdits.count ?? 0,
          total_owners: totalOwners.count ?? 0,
          pending_observations: pendingObservations.count ?? 0,
          open_quality_tasks: openTasks.count ?? 0,
        };
        break;
      }

      case "list_claims": {
        const status = validateClaimStatus(asString(params.status, "pending"));
        const { data, error } = await supabase
          .from("location_claim_requests")
          .select(`id, status, message, review_reason, created_at, reviewed_at, user_id, locations ( name, region )`)
          .eq("status", status)
          .order("created_at", { ascending: false })
          .limit(150);
        if (error) throw new AppError(error.message, "CLAIMS_QUERY_FAILED", 400);
        const userIds = (data ?? []).map((item: Record<string, unknown>) => String(item.user_id || ""));
        const emailMap = await fetchEmailMap(userIds);
        result = (data ?? []).map((item: Record<string, unknown>) => ({ ...item, requester_email: emailMap[String(item.user_id)] || "onbekend" }));
        break;
      }

      case "approve_claim": {
        const claimId = asString(params.claim_id);
        if (!claimId) throw new AppError("claim_id ontbreekt", "MISSING_CLAIM_ID", 400);
        assertUuid(claimId, "claim_id");
        result = await approveClaim(claimId, admin.id);
        break;
      }

      case "reject_claim": {
        const claimId = asString(params.claim_id);
        if (!claimId) throw new AppError("claim_id ontbreekt", "MISSING_CLAIM_ID", 400);
        assertUuid(claimId, "claim_id");
        const { error } = await supabase
          .from("location_claim_requests")
          .update({
            status: "rejected",
            review_reason: asString(params.review_reason, "Afgewezen door admin"),
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", claimId)
          .eq("status", "pending");
        if (error) throw new AppError(error.message, "REJECT_CLAIM_FAILED", 400);
        result = { ok: true, claim_id: claimId };
        break;
      }

      case "list_owners": {
        const { data, error } = await supabase
          .from("venue_owners")
          .select(`id, user_id, subscription_status, plan_tier, plan_expires_at, created_at, locations ( name, region )`)
          .order("created_at", { ascending: false })
          .limit(250);
        if (error) throw new AppError(error.message, "OWNERS_QUERY_FAILED", 400);
        const userIds = (data ?? []).map((item: Record<string, unknown>) => String(item.user_id || ""));
        const emailMap = await fetchEmailMap(userIds);
        result = (data ?? []).map((item: Record<string, unknown>) => ({ ...item, email: emailMap[String(item.user_id)] || "onbekend" }));
        break;
      }

      case "update_owner": {
        const ownerId = asString(params.owner_id);
        const subscriptionStatus = validateSubscriptionStatus(asString(params.subscription_status, "none"));
        let planTier = validatePlanTier(asString(params.plan_tier, "none"));
        if (["none", "canceled"].includes(subscriptionStatus)) planTier = "none";
        if (["featured", "trial", "past_due"].includes(subscriptionStatus) && planTier === "none") planTier = "featured";
        if (!ownerId) throw new AppError("owner_id ontbreekt", "MISSING_OWNER_ID", 400);
        assertUuid(ownerId, "owner_id");
        const { error } = await supabase
          .from("venue_owners")
          .update({ subscription_status: subscriptionStatus, plan_tier: planTier, updated_at: new Date().toISOString() })
          .eq("id", ownerId);
        if (error) throw new AppError(error.message, "UPDATE_OWNER_FAILED", 400);
        result = { ok: true, owner_id: ownerId };
        break;
      }

      case "list_locations": {
        const rawSearch = asString(params.search, "").trim();
        const page = asInteger(params.page, 0);
        if (rawSearch.length > 100) throw new AppError("Zoekterm is te lang", "SEARCH_TOO_LONG", 400);
        if (page < 0 || page > 10000) throw new AppError("Ongeldige pagina", "INVALID_PAGE", 400);

        let query = supabase
          .from("locations")
          .select("id, name, region, type, is_featured, featured_until, owner_verified, claimed_by_user_id, seo_tier, seo_primary_locality, verification_mode, verification_confidence, last_context_refresh_at")
          .order("name", { ascending: true })
          .range(page * DEFAULT_PAGE_SIZE, (page + 1) * DEFAULT_PAGE_SIZE - 1);
        if (rawSearch) query = query.ilike("name", `%${rawSearch}%`);
        const { data, error } = await query;
        if (error) throw new AppError(error.message, "LOCATIONS_QUERY_FAILED", 400);
        result = data ?? [];
        break;
      }

      case "get_location_detail": {
        const locationId = asNullableNumber(params.location_id);
        if (!locationId) throw new AppError("location_id ontbreekt", "MISSING_LOCATION_ID", 400);
        const { data: location, error } = await supabase
          .from("locations")
          .select(LOCATION_DETAIL_SELECT)
          .eq("id", Math.trunc(locationId))
          .single();
        if (error || !location) throw new AppError("Locatie niet gevonden", "LOCATION_NOT_FOUND", 404);

        const [observationsResult, qualityTasksResult, editLogResult, editorialDraftResult] = await Promise.all([
          supabase
            .from("location_observations")
            .select("id, source_type, field_name, value_json, confidence, evidence_url, notes, status, created_at, reviewed_at, review_notes, approved_at, applied_at")
            .eq("location_id", Math.trunc(locationId))
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("location_quality_tasks")
            .select("id, task_type, status, priority, details_json, source, created_at, due_at")
            .eq("location_id", Math.trunc(locationId))
            .order("priority", { ascending: true })
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("location_edit_log")
            .select("id, field_name, old_value, new_value, created_at, user_id")
            .eq("location_id", Math.trunc(locationId))
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("editorial_pages")
            .select("id, page_type, slug, status, updated_at, published_at, title, editorial_label")
            .eq("page_type", "location_detail_override")
            .eq("location_id", Math.trunc(locationId))
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const recentEdits = editLogResult.data ?? [];
        const editEmails = await fetchEmailMap(recentEdits.map((row: Record<string, unknown>) => String(row.user_id || "")));

        result = {
          location,
          observations: observationsResult.error && isMissingRelationError(observationsResult.error.message, "location_observations") ? [] : (observationsResult.data ?? []),
          quality_tasks: qualityTasksResult.error && isMissingRelationError(qualityTasksResult.error.message, "location_quality_tasks") ? [] : (qualityTasksResult.data ?? []),
          editorial_draft: editorialDraftResult.error && isMissingRelationError(editorialDraftResult.error.message, "editorial_pages") ? null : (editorialDraftResult.data ?? null),
          recent_edits: recentEdits.map((row: Record<string, unknown>) => ({ ...row, owner_email: editEmails[String(row.user_id)] || "onbekend" })),
        };
        break;
      }

      case "update_location_detail": {
        const locationId = asNullableNumber(params.location_id);
        if (!locationId) throw new AppError("location_id ontbreekt", "MISSING_LOCATION_ID", 400);
        const patch = normalizeLocationPatch(params);
        const { data, error } = await supabase
          .from("locations")
          .update(patch)
          .eq("id", Math.trunc(locationId))
          .select(LOCATION_DETAIL_SELECT)
          .single();
        if (error) throw new AppError(error.message, "UPDATE_LOCATION_FAILED", 400);
        result = { ok: true, location: data };
        break;
      }

      case "toggle_featured": {
        const locationId = asInteger(params.location_id);
        if (!locationId) throw new AppError("location_id ontbreekt", "MISSING_LOCATION_ID", 400);
        const { data: location, error: fetchError } = await supabase.from("locations").select("is_featured").eq("id", locationId).single();
        if (fetchError || !location) throw new AppError("Locatie niet gevonden", "LOCATION_NOT_FOUND", 404);
        const nextFeatured = !location.is_featured;
        const { error: updateError } = await supabase
          .from("locations")
          .update({
            is_featured: nextFeatured,
            featured_until: nextFeatured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            featured_tier: nextFeatured ? "featured" : null,
          })
          .eq("id", locationId);
        if (updateError) throw new AppError(updateError.message, "TOGGLE_FEATURED_FAILED", 400);
        result = { ok: true, is_featured: nextFeatured, location_id: locationId };
        break;
      }

      case "toggle_verified": {
        const locationId = asInteger(params.location_id);
        if (!locationId) throw new AppError("location_id ontbreekt", "MISSING_LOCATION_ID", 400);
        const { data: location, error: fetchError } = await supabase.from("locations").select("owner_verified").eq("id", locationId).single();
        if (fetchError || !location) throw new AppError("Locatie niet gevonden", "LOCATION_NOT_FOUND", 404);
        const nextVerified = !location.owner_verified;
        const { error: updateError } = await supabase.from("locations").update({ owner_verified: nextVerified }).eq("id", locationId);
        if (updateError) throw new AppError(updateError.message, "TOGGLE_VERIFIED_FAILED", 400);
        result = { ok: true, owner_verified: nextVerified, location_id: locationId };
        break;
      }

      case "list_observations": {
        const status = params.status ? validateObservationStatus(asString(params.status)) : "pending";
        const { data, error } = await supabase
          .from("location_observations")
          .select(`id, location_id, source_type, field_name, value_json, confidence, evidence_url, notes, status, created_at, reviewed_at, review_notes, approved_at, applied_at, locations ( name, region )`)
          .eq("status", status)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw new AppError(error.message, "OBSERVATIONS_QUERY_FAILED", 400);
        result = data ?? [];
        break;
      }

      case "review_observation": {
        const observationId = asString(params.observation_id);
        const status = validateObservationStatus(asString(params.status));
        if (!observationId) throw new AppError("observation_id ontbreekt", "MISSING_OBSERVATION_ID", 400);
        assertUuid(observationId, "observation_id");
        if (!["approved", "rejected"].includes(status)) throw new AppError("Gebruik approved of rejected voor review", "INVALID_REVIEW_STATUS", 400);
        const now = new Date().toISOString();
        const patch: Record<string, unknown> = {
          status,
          review_notes: asNullableString(params.review_notes),
          reviewed_at: now,
        };
        if (status === "approved") {
          patch.approved_at = now;
          patch.approved_by = admin.id;
        }
        const { error } = await supabase.from("location_observations").update(patch).eq("id", observationId);
        if (error) throw new AppError(error.message, "REVIEW_OBSERVATION_FAILED", 400);
        result = { ok: true, observation_id: observationId, status };
        break;
      }

      case "apply_observation": {
        const observationId = asString(params.observation_id);
        if (!observationId) throw new AppError("observation_id ontbreekt", "MISSING_OBSERVATION_ID", 400);
        assertUuid(observationId, "observation_id");

        const { data: observation, error: fetchError } = await supabase
          .from("location_observations")
          .select("id, location_id, field_name, value_json, status, approved_at, approved_by")
          .eq("id", observationId)
          .single();
        if (fetchError || !observation) throw new AppError("Observation niet gevonden", "OBSERVATION_NOT_FOUND", 404);
        if (!["approved", "applied"].includes(observation.status)) {
          throw new AppError("Observation moet eerst goedgekeurd zijn", "OBSERVATION_NOT_APPROVED", 409);
        }
        const fieldName = asString(observation.field_name);
        const normalizedValue = normalizeObservationFieldValue(fieldName, observation.value_json);
        const patch: Record<string, unknown> = {
          [fieldName]: normalizedValue,
          last_context_refresh_at: new Date().toISOString(),
        };
        const { error: locationError } = await supabase.from("locations").update(patch).eq("id", observation.location_id);
        if (locationError) throw new AppError(locationError.message, "APPLY_OBSERVATION_FAILED", 400);
        const now = new Date().toISOString();
        const { error: updateObservationError } = await supabase
          .from("location_observations")
          .update({
            status: "applied",
            applied_at: now,
            reviewed_at: now,
            approved_at: observation.approved_at || now,
            approved_by: observation.approved_by || admin.id,
          })
          .eq("id", observationId);
        if (updateObservationError) throw new AppError(updateObservationError.message, "APPLY_OBSERVATION_FAILED", 400);
        result = { ok: true, observation_id: observationId, location_id: observation.location_id, field_name: fieldName };
        break;
      }

      case "list_editorial_pages": {
        const requestedStatus = asString(params.status, "").trim();
        let query = supabase
          .from("editorial_pages")
          .select("id, page_type, slug, region_slug, type_slug, cluster_slug, location_id, status, title, updated_at, published_at")
          .order("page_type", { ascending: true })
          .order("slug", { ascending: true })
          .limit(300);
        if (requestedStatus) query = query.eq("status", validateEditorialStatus(requestedStatus));
        const { data, error } = await query;
        if (error) {
          if (isMissingRelationError(error.message, "editorial_pages")) {
            result = [];
            break;
          }
          throw new AppError(error.message, "EDITORIAL_PAGES_QUERY_FAILED", 400);
        }
        result = data ?? [];
        break;
      }

      case "get_editorial_page": {
        const pageId = asString(params.page_id);
        if (!pageId) throw new AppError("page_id ontbreekt", "MISSING_PAGE_ID", 400);
        assertUuid(pageId, "page_id");
        const { data, error } = await supabase.from("editorial_pages").select("*").eq("id", pageId).maybeSingle();
        if (error) throw new AppError(error.message, "EDITORIAL_PAGE_QUERY_FAILED", 400);
        result = data;
        break;
      }

      case "save_editorial_page": {
        const pageId = asString(params.page_id, "").trim();
        const payload = normalizeEditorialPayload(params, admin.id);
        let query;
        if (pageId) {
          assertUuid(pageId, "page_id");
          query = supabase.from("editorial_pages").update(payload).eq("id", pageId).select("*").single();
        } else {
          query = supabase.from("editorial_pages").insert(payload).select("*").single();
        }
        const { data, error } = await query;
        if (error) throw new AppError(error.message, "SAVE_EDITORIAL_PAGE_FAILED", 400);
        result = { ok: true, page: data };
        break;
      }

      case "ensure_location_editorial_draft": {
        const locationId = asNullableNumber(params.location_id);
        if (!locationId) throw new AppError("location_id ontbreekt", "MISSING_LOCATION_ID", 400);
        const normalizedLocationId = Math.trunc(locationId);

        const { data: existingPage, error: existingPageError } = await supabase
          .from("editorial_pages")
          .select("*")
          .eq("page_type", "location_detail_override")
          .eq("location_id", normalizedLocationId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingPageError) throw new AppError(existingPageError.message, "EDITORIAL_DRAFT_QUERY_FAILED", 400);
        if (existingPage) {
          result = { ok: true, created: false, page: existingPage };
          break;
        }

        const { data: location, error: locationError } = await supabase
          .from("locations")
          .select(LOCATION_DETAIL_SELECT)
          .eq("id", normalizedLocationId)
          .single();
        if (locationError || !location) throw new AppError("Locatie niet gevonden", "LOCATION_NOT_FOUND", 404);

        const { data: taskRows, error: taskError } = await supabase
          .from("location_quality_tasks")
          .select("task_type, details_json, priority, created_at")
          .eq("location_id", normalizedLocationId)
          .in("status", ["open", "in_progress"])
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3);
        if (taskError && !isMissingRelationError(taskError.message, "location_quality_tasks")) {
          throw new AppError(taskError.message, "EDITORIAL_DRAFT_TASKS_FAILED", 400);
        }

        const taskSummary = (taskRows ?? [])
          .map((row: Record<string, unknown>) => summarizeQualityTaskDetails(asString(row.task_type), row.details_json))
          .filter(Boolean)
          .slice(0, 3)
          .join(" · ");

        const payload = buildLocationEditorialDraft(location as Record<string, unknown>, taskSummary);
        const { data: insertedPage, error: insertError } = await supabase
          .from("editorial_pages")
          .insert({
            ...payload,
            updated_by: admin.id,
            updated_at: new Date().toISOString(),
          })
          .select("*")
          .single();
        if (insertError) throw new AppError(insertError.message, "EDITORIAL_DRAFT_CREATE_FAILED", 400);

        result = { ok: true, created: true, page: insertedPage };
        break;
      }

      case "get_publish_state": {
        const { data, error } = await supabase.from("site_publish_state").select("*").eq("id", 1).maybeSingle();
        if (error) throw new AppError(error.message, "PUBLISH_STATE_QUERY_FAILED", 400);
        result = data;
        break;
      }

      case "trigger_publish": {
        const reason = asString(params.reason, "manual-admin-trigger").slice(0, 120);
        const { error } = await supabase.rpc("mark_site_publish_dirty", {
          change_source: "admin",
          change_reason: reason,
        });
        if (error) throw new AppError(error.message, "TRIGGER_PUBLISH_FAILED", 400);
        result = { ok: true };
        break;
      }

      case "list_quality_tasks": {
        const requestedStatus = asString(params.status, "open").trim();
        const status = requestedStatus ? validateQualityTaskStatus(requestedStatus) : "open";
        const { data, error } = await supabase
          .from("location_quality_tasks")
          .select("id, location_id, task_type, status, priority, details_json, source, created_at, due_at, resolved_at, locations ( name, region )")
          .eq("status", status)
          .order("priority", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) {
          if (isMissingRelationError(error.message, "location_quality_tasks")) {
            result = [];
            break;
          }
          throw new AppError(error.message, "QUALITY_TASKS_QUERY_FAILED", 400);
        }
        result = data ?? [];
        break;
      }

      case "resolve_quality_task": {
        const taskId = asString(params.task_id);
        const status = validateQualityTaskStatus(asString(params.status, "resolved"));
        if (!taskId) throw new AppError("task_id ontbreekt", "MISSING_TASK_ID", 400);
        assertUuid(taskId, "task_id");
        if (!["in_progress", "resolved", "dismissed"].includes(status)) {
          throw new AppError("Gebruik in_progress, resolved of dismissed", "INVALID_QUALITY_TASK_STATUS", 400);
        }
        const now = new Date().toISOString();
        const patch: Record<string, unknown> = { status };
        if (status === "resolved" || status === "dismissed") {
          patch.resolved_at = now;
          patch.resolved_by = admin.id;
        } else {
          patch.resolved_at = null;
          patch.resolved_by = null;
        }
        const { error } = await supabase.from("location_quality_tasks").update(patch).eq("id", taskId);
        if (error) throw new AppError(error.message, "RESOLVE_QUALITY_TASK_FAILED", 400);
        result = { ok: true, task_id: taskId, status };
        break;
      }

      case "list_duplicate_candidates": {
        const { data, error } = await supabase
          .from("locations")
          .select("id, name, region, website, seo_primary_locality, seo_quality_score, seo_tier, seo_canonical_target, last_verified_at")
          .order("name", { ascending: true });
        if (error) throw new AppError(error.message, "DUPLICATES_QUERY_FAILED", 400);
        const groups = new Map<string, Array<Record<string, unknown>>>();
        for (const loc of data ?? []) {
          const nameKey = slugify(asString(loc.name));
          const host = normalizeExternalHost(asString(loc.website));
          const locality = slugify(asString(loc.seo_primary_locality));
          if (!nameKey || (!host && !locality)) continue;
          const key = `${slugify(asString(loc.region))}::${nameKey}::${host || locality}`;
          const group = groups.get(key) || [];
          group.push(loc as Record<string, unknown>);
          groups.set(key, group);
        }
        const candidates = [...groups.values()]
          .filter((group) => group.length > 1)
          .map((group) => {
            const canonical = [...group].sort((a, b) => {
              const scoreDiff = (Number(b.seo_quality_score) || 0) - (Number(a.seo_quality_score) || 0);
              if (scoreDiff) return scoreDiff;
              return (Number(a.id) || 0) - (Number(b.id) || 0);
            })[0];
            return {
              canonical_suggestion_id: canonical.id,
              group_label: `${group[0].name} (${group[0].region})`,
              items: group,
            };
          })
          .slice(0, 120);
        result = candidates;
        break;
      }

      case "apply_duplicate_merge": {
        const canonicalLocationId = asInteger(params.canonical_location_id);
        const aliasLocationIds = Array.isArray(params.alias_location_ids)
          ? [...new Set(params.alias_location_ids.map((value) => asInteger(value)).filter((value) => value > 0))]
          : [];
        if (!canonicalLocationId) throw new AppError("canonical_location_id ontbreekt", "MISSING_CANONICAL_LOCATION_ID", 400);
        if (!aliasLocationIds.length) throw new AppError("alias_location_ids ontbreekt", "MISSING_ALIAS_LOCATION_IDS", 400);
        if (aliasLocationIds.includes(canonicalLocationId)) {
          throw new AppError("Canonical mag niet tegelijk alias zijn", "INVALID_DUPLICATE_MERGE", 400);
        }

        const allIds = [canonicalLocationId, ...aliasLocationIds];
        const { data: locationsForMerge, error: mergeFetchError } = await supabase
          .from("locations")
          .select("id, name, region, seo_primary_locality, seo_tier")
          .in("id", allIds);
        if (mergeFetchError) throw new AppError(mergeFetchError.message, "DUPLICATE_MERGE_FETCH_FAILED", 400);
        if ((locationsForMerge ?? []).length !== allIds.length) {
          throw new AppError("Niet alle locaties voor duplicate merge zijn gevonden", "DUPLICATE_MERGE_NOT_FOUND", 404);
        }

        const canonical = (locationsForMerge ?? []).find((row) => Number(row.id) === canonicalLocationId);
        if (!canonical) throw new AppError("Canonical locatie niet gevonden", "CANONICAL_NOT_FOUND", 404);
        const canonicalTargetUrl = `/${slugify(asString(canonical.region))}/${slugify(asString(canonical.name))}/`;
        const now = new Date().toISOString();

        for (const aliasLocationId of aliasLocationIds) {
          const aliasLocation = (locationsForMerge ?? []).find((row) => Number(row.id) === aliasLocationId);
          if (!aliasLocation) continue;

          const { error: aliasUpdateError } = await supabase
            .from("locations")
            .update({
              seo_tier: "alias",
              seo_canonical_target: canonicalLocationId,
              seo_exclude_from_sitemap: true,
              seo_last_decided_at: now,
              seo_notes: `Canonical merge naar ${canonicalTargetUrl} op ${now}`,
            })
            .eq("id", aliasLocationId);
          if (aliasUpdateError) throw new AppError(aliasUpdateError.message, "DUPLICATE_MERGE_UPDATE_FAILED", 400);

          const aliasPayload = {
            location_id: aliasLocationId,
            alias: asString(aliasLocation.name),
            alias_normalized: slugify(asString(aliasLocation.name)) || null,
            old_region_slug: slugify(asString(aliasLocation.region)) || null,
            old_loc_slug: slugify(asString(aliasLocation.name)) || null,
            target_url: canonicalTargetUrl,
            reason: `admin-canonical-merge:${canonicalLocationId}`,
            is_active: true,
          };
          const { error: aliasInsertError } = await supabase
            .from("location_aliases")
            .upsert(aliasPayload, { onConflict: "location_id,alias" });
          if (aliasInsertError) throw new AppError(aliasInsertError.message, "DUPLICATE_MERGE_ALIAS_FAILED", 400);
        }

        const { error: canonicalUpdateError } = await supabase
          .from("locations")
          .update({
            seo_tier: "index",
            seo_canonical_target: null,
            seo_exclude_from_sitemap: false,
            seo_last_decided_at: now,
            seo_notes: `Canonical winnaar bevestigd op ${now}`,
          })
          .eq("id", canonicalLocationId);
        if (canonicalUpdateError) throw new AppError(canonicalUpdateError.message, "DUPLICATE_MERGE_CANONICAL_FAILED", 400);

        result = {
          ok: true,
          canonical_location_id: canonicalLocationId,
          alias_location_ids: aliasLocationIds,
          target_url: canonicalTargetUrl,
        };
        break;
      }

      case "get_insights": {
        const [publishState, pendingObs, openTasks, latestGscRows, locations, qualityTasks, opsBriefs] = await Promise.all([
          supabase.from("site_publish_state").select("*").eq("id", 1).maybeSingle(),
          supabase.from("location_observations").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("location_quality_tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("gsc_snapshots").select("id, snapshot_type, payload_json, created_at").order("created_at", { ascending: false }).limit(8),
          supabase
            .from("locations")
            .select("id, name, region, seo_tier, is_featured, owner_verified, seo_primary_locality, verification_mode, verification_confidence, time_of_day_fit, rain_backup_quality, buggy_friendliness, toilet_confidence, food_fit, play_corner_quality, last_context_refresh_at, last_verified_at")
            .order("name", { ascending: true }),
          supabase
            .from("location_quality_tasks")
            .select("id, task_type, priority, status, location_id, details_json, source, created_at")
            .eq("status", "open")
            .order("priority", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(12),
          supabase
            .from("ops_briefs")
            .select("id, brief_type, source, status, title, body_md, payload_json, updated_at, created_at")
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(6),
        ]);

        const gaps = locations.error ? [] : computeContextGaps((locations.data ?? []) as Array<Record<string, unknown>>).slice(0, 25);
        const latestGscPayload = latestGscRows.error ? null : summarizeGscSnapshots((latestGscRows.data ?? []) as Array<Record<string, unknown>>);
        const topQualityTasks = qualityTasks.error && isMissingRelationError(qualityTasks.error.message, "location_quality_tasks")
          ? []
          : (qualityTasks.data ?? []).map((row: Record<string, unknown>) => ({
            ...row,
            notes: summarizeQualityTaskDetails(asString(row.task_type), row.details_json),
          }));
        const normalizedOpsBriefs = opsBriefs.error && isMissingRelationError(opsBriefs.error.message, "ops_briefs")
          ? []
          : (opsBriefs.data ?? []).map((row: Record<string, unknown>) => ({
            ...row,
            summary: summarizeOpsBriefPayload(asString(row.brief_type), row.payload_json),
          }));
        result = {
          publish_state: publishState.data ?? null,
          pending_observations: pendingObs.count ?? 0,
          open_quality_tasks: openTasks.error && isMissingRelationError(openTasks.error.message, "location_quality_tasks") ? 0 : (openTasks.count ?? 0),
          top_context_gaps: gaps,
          latest_gsc_snapshot: latestGscPayload,
          top_quality_tasks: topQualityTasks,
          ops_briefs: normalizedOpsBriefs,
        };
        break;
      }

      case "list_edit_log": {
        const { data, error } = await supabase
          .from("location_edit_log")
          .select(`id, field_name, old_value, new_value, created_at, user_id, locations ( name )`)
          .order("created_at", { ascending: false })
          .limit(120);
        if (error) throw new AppError(error.message, "EDIT_LOG_QUERY_FAILED", 400);
        const userIds = (data ?? []).map((item: Record<string, unknown>) => String(item.user_id || ""));
        const emailMap = await fetchEmailMap(userIds);
        result = (data ?? []).map((item: Record<string, unknown>) => ({ ...item, owner_email: emailMap[String(item.user_id)] || "onbekend" }));
        break;
      }

      default:
        throw new AppError(`Onbekende actie: ${action}`, "UNKNOWN_ACTION", 400);
    }

    return json({ data: result, request_id: requestId });
  } catch (error) {
    const appError = error instanceof AppError
      ? error
      : new AppError((error as Error).message || "Onbekende fout", "INTERNAL_ERROR", 500);

    console.error("admin-api error", {
      request_id: requestId,
      code: appError.code,
      message: appError.message,
      details: appError.details ?? null,
    });

    return json(
      {
        error: appError.message,
        code: appError.code,
        details: appError.details ?? null,
        request_id: requestId,
      },
      appError.status,
    );
  }
});
