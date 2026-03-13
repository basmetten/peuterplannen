import { supabase } from "../lib/db.ts";
import { AppError } from "../lib/errors.ts";
import {
  asString,
  assertUuid,
  isMissingRelationError,
  validateQualityTaskStatus,
} from "../lib/helpers.ts";

export async function handleQualityTasks(
  action: string,
  params: Record<string, unknown>,
  admin: { id: string; email: string },
): Promise<unknown> {
  switch (action) {
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
          return [];
        }
        throw new AppError(error.message, "QUALITY_TASKS_QUERY_FAILED", 400);
      }
      return data ?? [];
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
      return { ok: true, task_id: taskId, status };
    }

    default:
      throw new AppError(`Onbekende quality-tasks actie: ${action}`, "UNKNOWN_ACTION", 400);
  }
}
