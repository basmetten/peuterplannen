import { supabase } from "./db.ts";
import { CORS } from "./cors.ts";
import { AppError } from "./errors.ts";
import {
  PRICE_BANDS,
  TIME_OF_DAY_OPTIONS,
  VERIFICATION_MODES,
  SEO_TIERS,
  OBSERVATION_STATUSES,
  EDITORIAL_PAGE_TYPES,
  EDITORIAL_STATUSES,
  QUALITY_TASK_STATUSES,
  REQUIRED_TRUST_FIELDS,
  LOCATION_DETAIL_SELECT,
} from "./constants.ts";

// ── Response helpers ────────────────────────────────────────────────────

export function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

export function parseBody(req: Request): Promise<{ action: string; params: Record<string, unknown> }> {
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

// ── Type coercion ───────────────────────────────────────────────────────

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asInteger(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

export function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = `${value}`.trim();
  return text ? text : null;
}

export function asNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? Number(num) : null;
}

export function asNullableBoolean(value: unknown): boolean | null {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return null;
}

export function asTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => `${item}`.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

export function asNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0);
  }
  return [];
}

export function asJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asObjectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>> : [];
}

// ── Validation ──────────────────────────────────────────────────────────

export function assertUuid(value: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new AppError(`${fieldName} is ongeldig`, "INVALID_UUID", 400);
  }
}

export function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeExternalHost(url: string | null): string {
  if (!url) return "";
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isMissingRelationError(message: string, relation?: string): boolean {
  const normalized = message.toLowerCase();
  if (relation) {
    return normalized.includes(`relation \"${relation.toLowerCase()}\" does not exist`);
  }
  return normalized.includes("does not exist") && normalized.includes("relation");
}

export function isMissingRpcError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the function") ||
    normalized.includes("function public.admin_approve_claim") ||
    normalized.includes("admin_approve_claim(") ||
    normalized.includes("schema cache");
}

export function validateClaimStatus(status: string): string {
  const allowed = ["pending", "approved", "rejected", "auto_rejected_duplicate"];
  if (!allowed.includes(status)) {
    throw new AppError("Ongeldige claim-status", "INVALID_STATUS", 400);
  }
  return status;
}

export function validateSubscriptionStatus(status: string): string {
  const allowed = ["none", "trial", "featured", "past_due", "canceled"];
  if (!allowed.includes(status)) {
    throw new AppError("Ongeldige subscription_status", "INVALID_SUBSCRIPTION_STATUS", 400);
  }
  return status;
}

export function validatePlanTier(tier: string): string {
  const allowed = ["none", "featured"];
  if (!allowed.includes(tier)) {
    throw new AppError("Ongeldige plan_tier", "INVALID_PLAN_TIER", 400);
  }
  return tier;
}

export function validateObservationStatus(status: string): string {
  if (!OBSERVATION_STATUSES.includes(status)) {
    throw new AppError("Ongeldige observation status", "INVALID_OBSERVATION_STATUS", 400);
  }
  return status;
}

export function validateSeoTier(tier: string): string {
  if (!SEO_TIERS.includes(tier)) {
    throw new AppError("Ongeldige seo_tier", "INVALID_SEO_TIER", 400);
  }
  return tier;
}

export function validatePriceBand(value: string | null): string | null {
  if (!value) return null;
  if (!PRICE_BANDS.includes(value)) throw new AppError("Ongeldige prijsband", "INVALID_PRICE_BAND", 400);
  return value;
}

export function validateTimeOfDayFit(value: string | null): string | null {
  if (!value) return null;
  if (!TIME_OF_DAY_OPTIONS.includes(value)) throw new AppError("Ongeldige dagdeel-fit", "INVALID_TIME_OF_DAY", 400);
  return value;
}

export function validateVerificationMode(value: string | null): string | null {
  if (!value) return null;
  if (!VERIFICATION_MODES.includes(value)) throw new AppError("Ongeldige verification_mode", "INVALID_VERIFICATION_MODE", 400);
  return value;
}

export function validateEditorialPageType(value: string): string {
  if (!EDITORIAL_PAGE_TYPES.includes(value)) throw new AppError("Ongeldig editorial page type", "INVALID_PAGE_TYPE", 400);
  return value;
}

export function validateEditorialStatus(value: string): string {
  if (!EDITORIAL_STATUSES.includes(value)) throw new AppError("Ongeldige editorial status", "INVALID_EDITORIAL_STATUS", 400);
  return value;
}

export function validateQualityTaskStatus(value: string): string {
  if (!QUALITY_TASK_STATUSES.includes(value)) throw new AppError("Ongeldige quality task status", "INVALID_QUALITY_TASK_STATUS", 400);
  return value;
}

// ── Shared domain helpers ───────────────────────────────────────────────

export function summarizeQualityTaskDetails(taskType: string, details: unknown): string {
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

export function summarizeOpsBriefPayload(briefType: string, payload: unknown): string {
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

export async function fetchEmailMap(userIds: string[], concurrency = 12): Promise<Record<string, string>> {
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

export async function fetchPriorityLocationQueue(limit: number) {
  const normalizedLimit = Math.min(Math.max(Math.trunc(limit || 12), 1), 100);
  const trackedTaskTypes = [
    "missing_trust_fields",
    "high_signal_missing_context",
    "missing_editorial_draft",
    "near_win_detail_page",
    "support_page_rising_impressions",
    "orphan_detail_page",
  ];

  const { data: taskRows, error } = await supabase
    .from("location_quality_tasks")
    .select("id, location_id, task_type, priority, status, details_json, source, created_at, locations ( id, name, region, seo_tier, seo_primary_locality, verification_mode, verification_confidence )")
    .in("status", ["open", "in_progress"])
    .in("task_type", trackedTaskTypes)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(normalizedLimit * 8, 80));

  if (error) {
    if (isMissingRelationError(error.message, "location_quality_tasks")) return [];
    throw new AppError(error.message, "PRIORITY_QUEUE_QUERY_FAILED", 400);
  }

  const grouped = new Map<number, Record<string, unknown>>();
  for (const row of taskRows ?? []) {
    const locationId = asNullableNumber(row.location_id);
    const location = (row.locations && typeof row.locations === "object") ? row.locations as Record<string, unknown> : null;
    if (!locationId || !location) continue;
    const existing = grouped.get(locationId) || {
      location_id: locationId,
      name: asString(location.name),
      region: asString(location.region),
      seo_tier: asString(location.seo_tier, "auto"),
      seo_primary_locality: asString(location.seo_primary_locality),
      verification_mode: asString(location.verification_mode),
      verification_confidence: location.verification_confidence ?? null,
      top_priority: 0,
      task_count: 0,
      task_types: [] as string[],
      summaries: [] as string[],
      score: 0,
    };

    const taskType = asString(row.task_type);
    const priority = asInteger(row.priority, 0);
    const summary = summarizeQualityTaskDetails(taskType, row.details_json);
    existing.top_priority = Math.max(asInteger(existing.top_priority, 0), priority);
    existing.task_count = asInteger(existing.task_count, 0) + 1;
    if (!asTextArray(existing.task_types).includes(taskType)) {
      (existing.task_types as string[]).push(taskType);
    }
    if (summary && !(existing.summaries as string[]).includes(summary)) {
      (existing.summaries as string[]).push(summary);
    }
    grouped.set(locationId, existing);
  }

  const locationIds = [...grouped.keys()];
  let draftByLocationId = new Map<number, Record<string, unknown>>();
  if (locationIds.length) {
    const { data: draftRows, error: draftError } = await supabase
      .from("editorial_pages")
      .select("id, location_id, status, updated_at, published_at, title")
      .eq("page_type", "location_detail_override")
      .in("location_id", locationIds)
      .neq("status", "archived");
    if (draftError && !isMissingRelationError(draftError.message, "editorial_pages")) {
      throw new AppError(draftError.message, "PRIORITY_QUEUE_DRAFTS_FAILED", 400);
    }
    draftByLocationId = new Map((draftRows ?? []).map((row: Record<string, unknown>) => [Number(row.location_id), row]));
  }

  const queue = [...grouped.values()].map((row) => {
    const hasDraft = draftByLocationId.has(Number(row.location_id));
    const taskTypes = asTextArray(row.task_types);
    const score =
      asInteger(row.top_priority, 0) * 100 +
      asInteger(row.task_count, 0) * 10 +
      (hasDraft ? 0 : 40) +
      (row.seo_tier === "index" ? 20 : row.seo_tier === "support" ? 5 : 10) +
      (taskTypes.includes("high_signal_missing_context") ? 25 : 0) +
      (taskTypes.includes("missing_editorial_draft") ? 20 : 0) +
      (taskTypes.includes("orphan_detail_page") ? 15 : 0);
    return {
      ...row,
      has_editorial_draft: hasDraft,
      editorial_draft: hasDraft ? draftByLocationId.get(Number(row.location_id)) : null,
      task_types: taskTypes,
      summaries: asTextArray(row.summaries).slice(0, 3),
      score,
    };
  })
    .sort((a, b) =>
      asInteger(b.score, 0) - asInteger(a.score, 0) ||
      asInteger(b.top_priority, 0) - asInteger(a.top_priority, 0) ||
      asInteger(b.task_count, 0) - asInteger(a.task_count, 0) ||
      asString(a.name).localeCompare(asString(b.name), "nl"))
    .slice(0, normalizedLimit);

  return queue;
}
