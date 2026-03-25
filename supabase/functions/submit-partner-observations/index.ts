import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "https://partner.peuterplannen.nl",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const FIELD_CONFIG: Record<string, { kind: "text" | "boolean" | "number"; confidence: number }> = {
  description: { kind: "text", confidence: 0.74 },
  toddler_highlight: { kind: "text", confidence: 0.78 },
  website: { kind: "text", confidence: 0.9 },
  opening_hours: { kind: "text", confidence: 0.86 },
  weather: { kind: "text", confidence: 0.82 },
  coffee: { kind: "boolean", confidence: 0.8 },
  diaper: { kind: "boolean", confidence: 0.8 },
  alcohol: { kind: "boolean", confidence: 0.78 },
  min_age: { kind: "number", confidence: 0.76 },
  max_age: { kind: "number", confidence: 0.76 },
  seo_primary_locality: { kind: "text", confidence: 0.82 },
  food_fit: { kind: "text", confidence: 0.72 },
  play_corner_quality: { kind: "text", confidence: 0.72 },
  owner_photo_url: { kind: "text", confidence: 0.88 },
};

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

class AppError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "BAD_REQUEST", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = `${value}`.trim();
  return text ? text : null;
}

function normalizeValue(fieldName: string, rawValue: unknown) {
  const config = FIELD_CONFIG[fieldName];
  if (!config) throw new AppError(`Veld wordt niet ondersteund: ${fieldName}`, "UNSUPPORTED_FIELD", 400);

  if (config.kind === "text") {
    return asNullableString(rawValue);
  }

  if (config.kind === "boolean") {
    if (typeof rawValue === "boolean") return rawValue;
    if (rawValue === "true") return true;
    if (rawValue === "false") return false;
    throw new AppError(`Veld ${fieldName} moet true of false zijn`, "INVALID_VALUE", 400);
  }

  if (rawValue == null || rawValue === "") return null;
  const num = typeof rawValue === "number" ? rawValue : Number(rawValue);
  if (!Number.isFinite(num)) throw new AppError(`Veld ${fieldName} moet een getal zijn`, "INVALID_VALUE", 400);
  const intValue = Math.trunc(num);
  if ((fieldName === "min_age" || fieldName === "max_age") && (intValue < 0 || intValue > 18)) {
    throw new AppError(`Veld ${fieldName} moet tussen 0 en 18 liggen`, "INVALID_VALUE", 400);
  }
  return intValue;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json() as {
      location_id?: number;
      observations?: Array<{ field_name?: string; value_json?: unknown; notes?: string | null; evidence_url?: string | null }>;
    };

    const locationId = Number(body.location_id);
    if (!Number.isInteger(locationId) || locationId <= 0) {
      throw new AppError("location_id ontbreekt of is ongeldig", "INVALID_LOCATION_ID", 400);
    }

    const rows = Array.isArray(body.observations) ? body.observations : [];
    if (!rows.length) throw new AppError("Geen wijzigingen om in te dienen", "EMPTY_OBSERVATIONS", 400);
    if (rows.length > 20) throw new AppError("Te veel wijzigingen in één keer", "TOO_MANY_OBSERVATIONS", 400);

    const { data: owner, error: ownerError } = await supabase
      .from("venue_owners")
      .select("id, location_id")
      .eq("user_id", user.id)
      .eq("location_id", locationId)
      .maybeSingle();

    if (ownerError) throw new AppError(ownerError.message, "OWNER_LOOKUP_FAILED", 400);
    if (!owner) throw new AppError("Geen toegang tot deze locatie", "FORBIDDEN", 403);

    const { data: existingLocation, error: locationError } = await supabase
      .from("locations")
      .select("id, description, toddler_highlight, website, opening_hours, weather, coffee, diaper, alcohol, min_age, max_age, seo_primary_locality, food_fit, play_corner_quality, owner_photo_url")
      .eq("id", locationId)
      .single();
    if (locationError || !existingLocation) throw new AppError("Locatie niet gevonden", "LOCATION_NOT_FOUND", 404);

    const accepted: Array<{ field_name: string; value_json: unknown; notes: string | null; evidence_url: string | null; confidence: number }> = [];

    for (const row of rows) {
      const fieldName = `${row?.field_name || ""}`.trim();
      if (!fieldName) throw new AppError("field_name ontbreekt", "INVALID_FIELD", 400);
      const value = normalizeValue(fieldName, row?.value_json);
      const currentValue = (existingLocation as Record<string, unknown>)[fieldName] ?? null;
      if (JSON.stringify(currentValue) === JSON.stringify(value)) continue;
      accepted.push({
        field_name: fieldName,
        value_json: value,
        notes: asNullableString(row?.notes),
        evidence_url: asNullableString(row?.evidence_url),
        confidence: FIELD_CONFIG[fieldName].confidence,
      });
    }

    if (!accepted.length) {
      return json({ ok: true, inserted: 0, updated: 0, skipped: rows.length });
    }

    let inserted = 0;
    let updated = 0;

    for (const row of accepted) {
      const { data: pendingExisting, error: pendingError } = await supabase
        .from("location_observations")
        .select("id")
        .eq("location_id", locationId)
        .eq("source_type", "partner")
        .eq("field_name", row.field_name)
        .eq("status", "pending")
        .maybeSingle();
      if (pendingError) throw new AppError(pendingError.message, "OBSERVATION_LOOKUP_FAILED", 400);

      if (pendingExisting?.id) {
        const { error } = await supabase
          .from("location_observations")
          .update({
            value_json: row.value_json,
            notes: row.notes,
            evidence_url: row.evidence_url,
            confidence: row.confidence,
          })
          .eq("id", pendingExisting.id);
        if (error) throw new AppError(error.message, "OBSERVATION_UPDATE_FAILED", 400);
        updated += 1;
        continue;
      }

      const { error } = await supabase.from("location_observations").insert({
        location_id: locationId,
        source_type: "partner",
        field_name: row.field_name,
        value_json: row.value_json,
        confidence: row.confidence,
        evidence_url: row.evidence_url,
        notes: row.notes,
        status: "pending",
      });
      if (error) throw new AppError(error.message, "OBSERVATION_INSERT_FAILED", 400);
      inserted += 1;
    }

    return json({ ok: true, inserted, updated, skipped: rows.length - accepted.length });
  } catch (error) {
    console.error("submit-partner-observations error", error);
    if (error instanceof AppError) return json({ error: error.message, code: error.code }, error.status);
    return json({ error: (error as Error).message || "Onbekende fout", code: "BAD_REQUEST" }, 400);
  }
});
