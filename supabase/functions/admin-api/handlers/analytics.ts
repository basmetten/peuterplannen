import { supabase } from "../lib/db.ts";
import { AppError } from "../lib/errors.ts";
import { REQUIRED_TRUST_FIELDS } from "../lib/constants.ts";
import {
  asString,
  asNullableString,
  asNullableNumber,
  asObjectArray,
  isMissingRelationError,
  fetchEmailMap,
  summarizeQualityTaskDetails,
  summarizeOpsBriefPayload,
  fetchPriorityLocationQueue,
} from "../lib/helpers.ts";

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

export async function handleAnalytics(
  action: string,
  params: Record<string, unknown>,
  _admin: { id: string; email: string },
): Promise<unknown> {
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
          return {
            pending_claims: pendingClaims.count ?? 0,
            active_subs: activeOwners.count ?? 0,
            edits_last_7days: recentEdits.count ?? 0,
            total_owners: totalOwners.count ?? 0,
            pending_observations: pendingObservations.count ?? 0,
            open_quality_tasks: 0,
          };
        }
        throw new AppError(firstError.message, "STATS_QUERY_FAILED", 400);
      }

      return {
        pending_claims: pendingClaims.count ?? 0,
        active_subs: activeOwners.count ?? 0,
        edits_last_7days: recentEdits.count ?? 0,
        total_owners: totalOwners.count ?? 0,
        pending_observations: pendingObservations.count ?? 0,
        open_quality_tasks: openTasks.count ?? 0,
      };
    }

    case "get_insights": {
      const [publishState, pendingObs, openTasks, latestGscRows, locations, qualityTasks, opsBriefs, priorityQueue] = await Promise.all([
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
        fetchPriorityLocationQueue(12),
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
      return {
        publish_state: publishState.data ?? null,
        pending_observations: pendingObs.count ?? 0,
        open_quality_tasks: openTasks.error && isMissingRelationError(openTasks.error.message, "location_quality_tasks") ? 0 : (openTasks.count ?? 0),
        top_context_gaps: gaps,
        latest_gsc_snapshot: latestGscPayload,
        top_quality_tasks: topQualityTasks,
        ops_briefs: normalizedOpsBriefs,
        priority_locations: priorityQueue,
      };
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
      return (data ?? []).map((item: Record<string, unknown>) => ({ ...item, owner_email: emailMap[String(item.user_id)] || "onbekend" }));
    }

    default:
      throw new AppError(`Onbekende analytics actie: ${action}`, "UNKNOWN_ACTION", 400);
  }
}
