import { supabase } from "../lib/db.ts";
import { AppError } from "../lib/errors.ts";
import {
  asString,
  asNullableString,
  asNullableNumber,
  asNullableBoolean,
  assertUuid,
  validateObservationStatus,
  validatePriceBand,
  validateTimeOfDayFit,
  validateVerificationMode,
} from "../lib/helpers.ts";

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

export async function handleObservations(
  action: string,
  params: Record<string, unknown>,
  admin: { id: string; email: string },
): Promise<unknown> {
  switch (action) {
    case "list_observations": {
      const status = params.status ? validateObservationStatus(asString(params.status)) : "pending";
      const { data, error } = await supabase
        .from("location_observations")
        .select(`id, location_id, source_type, field_name, value_json, confidence, evidence_url, notes, status, created_at, reviewed_at, review_notes, approved_at, applied_at, locations ( name, region )`)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new AppError(error.message, "OBSERVATIONS_QUERY_FAILED", 400);
      return data ?? [];
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
      return { ok: true, observation_id: observationId, status };
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
      return { ok: true, observation_id: observationId, location_id: observation.location_id, field_name: fieldName };
    }

    default:
      throw new AppError(`Onbekende observations actie: ${action}`, "UNKNOWN_ACTION", 400);
  }
}
