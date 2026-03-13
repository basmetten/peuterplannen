import { supabase } from "../lib/db.ts";
import { AppError } from "../lib/errors.ts";
import {
  asString,
  assertUuid,
  asNullableNumber,
  fetchEmailMap,
  isMissingRpcError,
  validateClaimStatus,
  validateSubscriptionStatus,
  validatePlanTier,
} from "../lib/helpers.ts";

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

export async function handleClaims(
  action: string,
  params: Record<string, unknown>,
  admin: { id: string; email: string },
): Promise<unknown> {
  switch (action) {
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
      return (data ?? []).map((item: Record<string, unknown>) => ({ ...item, requester_email: emailMap[String(item.user_id)] || "onbekend" }));
    }

    case "approve_claim": {
      const claimId = asString(params.claim_id);
      if (!claimId) throw new AppError("claim_id ontbreekt", "MISSING_CLAIM_ID", 400);
      assertUuid(claimId, "claim_id");
      return await approveClaim(claimId, admin.id);
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
      return { ok: true, claim_id: claimId };
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
      return (data ?? []).map((item: Record<string, unknown>) => ({ ...item, email: emailMap[String(item.user_id)] || "onbekend" }));
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
      return { ok: true, owner_id: ownerId };
    }

    default:
      throw new AppError(`Onbekende claims actie: ${action}`, "UNKNOWN_ACTION", 400);
  }
}
