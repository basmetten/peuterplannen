import { supabase } from "../lib/db.ts";
import { AppError } from "../lib/errors.ts";
import { asString } from "../lib/helpers.ts";

export async function handlePublish(
  action: string,
  params: Record<string, unknown>,
  _admin: { id: string; email: string },
): Promise<unknown> {
  switch (action) {
    case "get_publish_state": {
      const { data, error } = await supabase.from("site_publish_state").select("*").eq("id", 1).maybeSingle();
      if (error) throw new AppError(error.message, "PUBLISH_STATE_QUERY_FAILED", 400);
      return data;
    }

    case "trigger_publish": {
      const reason = asString(params.reason, "manual-admin-trigger").slice(0, 120);
      const { error } = await supabase.rpc("mark_site_publish_dirty", {
        change_source: "admin",
        change_reason: reason,
      });
      if (error) throw new AppError(error.message, "TRIGGER_PUBLISH_FAILED", 400);
      return { ok: true };
    }

    default:
      throw new AppError(`Onbekende publish actie: ${action}`, "UNKNOWN_ACTION", 400);
  }
}
