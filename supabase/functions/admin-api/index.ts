import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CORS } from "./lib/cors.ts";
import { AppError } from "./lib/errors.ts";
import { json, getRequestId, parseBody } from "./lib/helpers.ts";
import { requireAdminUser } from "./lib/auth.ts";
import { handleLocations } from "./handlers/locations.ts";
import { handleObservations } from "./handlers/observations.ts";
import { handleEditorial } from "./handlers/editorial.ts";
import { handleQualityTasks } from "./handlers/quality-tasks.ts";
import { handleClaims } from "./handlers/claims.ts";
import { handlePublish } from "./handlers/publish.ts";
import { handleAnalytics } from "./handlers/analytics.ts";

type ActionHandler = (
  action: string,
  params: Record<string, unknown>,
  admin: { id: string; email: string },
) => Promise<unknown>;

const ACTION_HANDLERS: Record<string, ActionHandler> = {
  // Locations
  list_locations: handleLocations,
  get_location_detail: handleLocations,
  update_location_detail: handleLocations,
  toggle_featured: handleLocations,
  toggle_verified: handleLocations,
  list_duplicate_candidates: handleLocations,
  apply_duplicate_merge: handleLocations,
  // Observations
  list_observations: handleObservations,
  review_observation: handleObservations,
  apply_observation: handleObservations,
  // Editorial
  list_editorial_pages: handleEditorial,
  get_editorial_page: handleEditorial,
  save_editorial_page: handleEditorial,
  ensure_location_editorial_draft: handleEditorial,
  seed_priority_editorial_drafts: handleEditorial,
  get_next_priority_location: handleEditorial,
  // Quality tasks
  list_quality_tasks: handleQualityTasks,
  resolve_quality_task: handleQualityTasks,
  // Claims & owners
  list_claims: handleClaims,
  approve_claim: handleClaims,
  reject_claim: handleClaims,
  list_owners: handleClaims,
  update_owner: handleClaims,
  // Publish
  get_publish_state: handlePublish,
  trigger_publish: handlePublish,
  // Analytics & insights
  get_stats: handleAnalytics,
  get_insights: handleAnalytics,
  list_edit_log: handleAnalytics,
};

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

    const handler = ACTION_HANDLERS[action];
    if (!handler) {
      throw new AppError(`Onbekende actie: ${action}`, "UNKNOWN_ACTION", 400);
    }

    const result = await handler(action, params, admin);
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
