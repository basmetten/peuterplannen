import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ADMIN_EMAIL = "basmetten@gmail.com";
const DEFAULT_PAGE_SIZE = 50;

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

function assertUuid(value: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new AppError(`${fieldName} is ongeldig`, "INVALID_UUID", 400);
  }
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

async function approveClaimInline(claimId: string, adminUserId: string) {
  const { data: claim, error: claimError } = await supabase
    .from("location_claim_requests")
    .select("id, user_id, location_id, status")
    .eq("id", claimId)
    .maybeSingle();

  if (claimError) {
    throw new AppError(claimError.message, "APPROVE_CLAIM_FAILED", 400);
  }
  if (!claim) {
    throw new AppError("Claim niet gevonden", "CLAIM_NOT_FOUND", 404);
  }
  if (claim.status !== "pending") {
    throw new AppError("Claim is niet meer openstaand", "CLAIM_NOT_OPEN", 409);
  }

  const approvedAt = new Date().toISOString();

  const { error: approveError } = await supabase
    .from("location_claim_requests")
    .update({
      status: "approved",
      reviewed_by: adminUserId,
      reviewed_at: approvedAt,
    })
    .eq("id", claimId)
    .eq("status", "pending");

  if (approveError) {
    throw new AppError(approveError.message, "APPROVE_CLAIM_FAILED", 400);
  }

  const { data: competingOwners, error: competingOwnersError } = await supabase
    .from("venue_owners")
    .select("id, user_id")
    .eq("location_id", claim.location_id)
    .neq("user_id", claim.user_id);

  if (competingOwnersError) {
    throw new AppError(competingOwnersError.message, "APPROVE_CLAIM_FAILED", 400);
  }

  if ((competingOwners ?? []).length) {
    const { error: clearOwnersError } = await supabase
      .from("venue_owners")
      .update({ location_id: null, updated_at: approvedAt })
      .eq("location_id", claim.location_id)
      .neq("user_id", claim.user_id);

    if (clearOwnersError) {
      throw new AppError(clearOwnersError.message, "APPROVE_CLAIM_FAILED", 400);
    }
  }

  const { data: existingOwner, error: existingOwnerError } = await supabase
    .from("venue_owners")
    .select("id")
    .eq("user_id", claim.user_id)
    .maybeSingle();

  if (existingOwnerError) {
    throw new AppError(existingOwnerError.message, "APPROVE_CLAIM_FAILED", 400);
  }

  let ownerId = existingOwner?.id ?? null;
  if (existingOwner) {
    const { error: updateOwnerError } = await supabase
      .from("venue_owners")
      .update({ location_id: claim.location_id, updated_at: approvedAt })
      .eq("id", existingOwner.id);

    if (updateOwnerError) {
      throw new AppError(updateOwnerError.message, "APPROVE_CLAIM_FAILED", 400);
    }
  } else {
    const { data: insertedOwner, error: insertOwnerError } = await supabase
      .from("venue_owners")
      .insert({
        user_id: claim.user_id,
        location_id: claim.location_id,
        updated_at: approvedAt,
      })
      .select("id")
      .single();

    if (insertOwnerError) {
      throw new AppError(insertOwnerError.message, "APPROVE_CLAIM_FAILED", 400);
    }
    ownerId = insertedOwner.id;
  }

  const { error: locationError } = await supabase
    .from("locations")
    .update({ claimed_by_user_id: claim.user_id })
    .eq("id", claim.location_id);

  if (locationError) {
    throw new AppError(locationError.message, "APPROVE_CLAIM_FAILED", 400);
  }

  const { data: autoRejectedRows, error: autoRejectError } = await supabase
    .from("location_claim_requests")
    .update({
      status: "rejected",
      reviewed_by: adminUserId,
      reviewed_at: approvedAt,
    })
    .eq("location_id", claim.location_id)
    .neq("id", claimId)
    .eq("status", "pending")
    .select("id");

  if (autoRejectError) {
    throw new AppError(autoRejectError.message, "APPROVE_CLAIM_FAILED", 400);
  }

  return {
    ok: true,
    approved_claim_id: claimId,
    auto_rejected_claim_ids: (autoRejectedRows ?? []).map((row: { id: string }) => row.id),
    owner_id: ownerId,
    location_id: claim.location_id,
  };
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
        const [pendingClaims, activeOwners, recentEdits, totalOwners] = await Promise.all([
          supabase
            .from("location_claim_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("venue_owners")
            .select("id", { count: "exact", head: true })
            .in("subscription_status", ["featured", "trial"]),
          supabase
            .from("location_edit_log")
            .select("id", { count: "exact", head: true })
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from("venue_owners")
            .select("id", { count: "exact", head: true }),
        ]);

        const firstError = pendingClaims.error || activeOwners.error || recentEdits.error || totalOwners.error;
        if (firstError) {
          throw new AppError(firstError.message, "STATS_QUERY_FAILED", 400);
        }

        result = {
          pending_claims: pendingClaims.count ?? 0,
          active_subs: activeOwners.count ?? 0,
          edits_last_7days: recentEdits.count ?? 0,
          total_owners: totalOwners.count ?? 0,
        };
        break;
      }

      case "list_claims": {
        const status = validateClaimStatus(asString(params.status, "pending"));

        const { data, error } = await supabase
          .from("location_claim_requests")
          .select(
            `
              id, status, message, created_at, reviewed_at,
              user_id,
              locations ( name, region )
            `,
          )
          .eq("status", status)
          .order("created_at", { ascending: false })
          .limit(150);

        if (error) {
          throw new AppError(error.message, "CLAIMS_QUERY_FAILED", 400);
        }

        const userIds = (data ?? []).map((item: Record<string, unknown>) => String(item.user_id || ""));
        const emailMap = await fetchEmailMap(userIds);

        result = (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          requester_email: emailMap[String(item.user_id)] || "onbekend",
        }));
        break;
      }

      case "approve_claim": {
        const claimId = asString(params.claim_id);
        if (!claimId) {
          throw new AppError("claim_id ontbreekt", "MISSING_CLAIM_ID", 400);
        }
        assertUuid(claimId, "claim_id");

        result = await approveClaimInline(claimId, admin.id);
        break;
      }

      case "reject_claim": {
        const claimId = asString(params.claim_id);
        if (!claimId) {
          throw new AppError("claim_id ontbreekt", "MISSING_CLAIM_ID", 400);
        }
        assertUuid(claimId, "claim_id");

        const { error } = await supabase
          .from("location_claim_requests")
          .update({
            status: "rejected",
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", claimId)
          .eq("status", "pending");

        if (error) {
          throw new AppError(error.message, "REJECT_CLAIM_FAILED", 400);
        }

        result = { ok: true, claim_id: claimId };
        break;
      }

      case "list_owners": {
        const { data, error } = await supabase
          .from("venue_owners")
          .select(
            `
              id, user_id, subscription_status, plan_tier, plan_expires_at, created_at,
              locations ( name, region )
            `,
          )
          .order("created_at", { ascending: false })
          .limit(250);

        if (error) {
          throw new AppError(error.message, "OWNERS_QUERY_FAILED", 400);
        }

        const userIds = (data ?? []).map((item: Record<string, unknown>) => String(item.user_id || ""));
        const emailMap = await fetchEmailMap(userIds);

        result = (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          email: emailMap[String(item.user_id)] || "onbekend",
        }));
        break;
      }

      case "update_owner": {
        const ownerId = asString(params.owner_id);
        const subscriptionStatus = validateSubscriptionStatus(asString(params.subscription_status, "none"));
        let planTier = validatePlanTier(asString(params.plan_tier, "none"));

        if (["none", "canceled"].includes(subscriptionStatus)) {
          planTier = "none";
        }
        if (["featured", "trial", "past_due"].includes(subscriptionStatus) && planTier === "none") {
          planTier = "featured";
        }

        if (!ownerId) {
          throw new AppError("owner_id ontbreekt", "MISSING_OWNER_ID", 400);
        }
        assertUuid(ownerId, "owner_id");

        const { error } = await supabase
          .from("venue_owners")
          .update({
            subscription_status: subscriptionStatus,
            plan_tier: planTier,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ownerId);

        if (error) {
          throw new AppError(error.message, "UPDATE_OWNER_FAILED", 400);
        }

        result = { ok: true, owner_id: ownerId };
        break;
      }

      case "list_locations": {
        const rawSearch = asString(params.search, "").trim();
        const page = asInteger(params.page, 0);

        if (rawSearch.length > 100) {
          throw new AppError("Zoekterm is te lang", "SEARCH_TOO_LONG", 400);
        }
        if (page < 0 || page > 10000) {
          throw new AppError("Ongeldige pagina", "INVALID_PAGE", 400);
        }

        let query = supabase
          .from("locations")
          .select("id, name, region, type, is_featured, featured_until, owner_verified, claimed_by_user_id")
          .order("name", { ascending: true })
          .range(page * DEFAULT_PAGE_SIZE, (page + 1) * DEFAULT_PAGE_SIZE - 1);

        if (rawSearch) {
          query = query.ilike("name", `%${rawSearch}%`);
        }

        const { data, error } = await query;
        if (error) {
          throw new AppError(error.message, "LOCATIONS_QUERY_FAILED", 400);
        }

        result = data ?? [];
        break;
      }

      case "toggle_featured": {
        const locationId = asInteger(params.location_id);
        if (!locationId) {
          throw new AppError("location_id ontbreekt", "MISSING_LOCATION_ID", 400);
        }

        const { data: location, error: fetchError } = await supabase
          .from("locations")
          .select("is_featured")
          .eq("id", locationId)
          .single();

        if (fetchError || !location) {
          throw new AppError("Locatie niet gevonden", "LOCATION_NOT_FOUND", 404);
        }

        const nextFeatured = !location.is_featured;
        const { error: updateError } = await supabase
          .from("locations")
          .update({
            is_featured: nextFeatured,
            featured_until: nextFeatured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            featured_tier: nextFeatured ? "featured" : null,
          })
          .eq("id", locationId);

        if (updateError) {
          throw new AppError(updateError.message, "TOGGLE_FEATURED_FAILED", 400);
        }

        result = { ok: true, is_featured: nextFeatured, location_id: locationId };
        break;
      }

      case "toggle_verified": {
        const locationId = asInteger(params.location_id);
        if (!locationId) {
          throw new AppError("location_id ontbreekt", "MISSING_LOCATION_ID", 400);
        }

        const { data: location, error: fetchError } = await supabase
          .from("locations")
          .select("owner_verified")
          .eq("id", locationId)
          .single();

        if (fetchError || !location) {
          throw new AppError("Locatie niet gevonden", "LOCATION_NOT_FOUND", 404);
        }

        const nextVerified = !location.owner_verified;
        const { error: updateError } = await supabase
          .from("locations")
          .update({ owner_verified: nextVerified })
          .eq("id", locationId);

        if (updateError) {
          throw new AppError(updateError.message, "TOGGLE_VERIFIED_FAILED", 400);
        }

        result = { ok: true, owner_verified: nextVerified, location_id: locationId };
        break;
      }

      case "list_edit_log": {
        const { data, error } = await supabase
          .from("location_edit_log")
          .select(
            `
              id, field_name, old_value, new_value, created_at,
              user_id,
              locations ( name )
            `,
          )
          .order("created_at", { ascending: false })
          .limit(120);

        if (error) {
          throw new AppError(error.message, "EDIT_LOG_QUERY_FAILED", 400);
        }

        const userIds = (data ?? []).map((item: Record<string, unknown>) => String(item.user_id || ""));
        const emailMap = await fetchEmailMap(userIds);

        result = (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          owner_email: emailMap[String(item.user_id)] || "onbekend",
        }));
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
