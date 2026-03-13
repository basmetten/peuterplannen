import { supabase } from "../lib/db.ts";
import { AppError } from "../lib/errors.ts";
import { DEFAULT_PAGE_SIZE, LOCATION_DETAIL_SELECT } from "../lib/constants.ts";
import {
  asString,
  asInteger,
  asNullableString,
  asNullableNumber,
  asNullableBoolean,
  assertUuid,
  slugify,
  normalizeExternalHost,
  isMissingRelationError,
  fetchEmailMap,
  validateSeoTier,
  validatePriceBand,
  validateTimeOfDayFit,
  validateVerificationMode,
  summarizeQualityTaskDetails,
} from "../lib/helpers.ts";

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

export async function handleLocations(
  action: string,
  params: Record<string, unknown>,
  admin: { id: string; email: string },
): Promise<unknown> {
  switch (action) {
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
      return data ?? [];
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

      return {
        location,
        observations: observationsResult.error && isMissingRelationError(observationsResult.error.message, "location_observations") ? [] : (observationsResult.data ?? []),
        quality_tasks: qualityTasksResult.error && isMissingRelationError(qualityTasksResult.error.message, "location_quality_tasks") ? [] : (qualityTasksResult.data ?? []),
        editorial_draft: editorialDraftResult.error && isMissingRelationError(editorialDraftResult.error.message, "editorial_pages") ? null : (editorialDraftResult.data ?? null),
        recent_edits: recentEdits.map((row: Record<string, unknown>) => ({ ...row, owner_email: editEmails[String(row.user_id)] || "onbekend" })),
      };
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
      return { ok: true, location: data };
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
      return { ok: true, is_featured: nextFeatured, location_id: locationId };
    }

    case "toggle_verified": {
      const locationId = asInteger(params.location_id);
      if (!locationId) throw new AppError("location_id ontbreekt", "MISSING_LOCATION_ID", 400);
      const { data: location, error: fetchError } = await supabase.from("locations").select("owner_verified").eq("id", locationId).single();
      if (fetchError || !location) throw new AppError("Locatie niet gevonden", "LOCATION_NOT_FOUND", 404);
      const nextVerified = !location.owner_verified;
      const { error: updateError } = await supabase.from("locations").update({ owner_verified: nextVerified }).eq("id", locationId);
      if (updateError) throw new AppError(updateError.message, "TOGGLE_VERIFIED_FAILED", 400);
      return { ok: true, owner_verified: nextVerified, location_id: locationId };
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
      return [...groups.values()]
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

      return {
        ok: true,
        canonical_location_id: canonicalLocationId,
        alias_location_ids: aliasLocationIds,
        target_url: canonicalTargetUrl,
      };
    }

    default:
      throw new AppError(`Onbekende locations actie: ${action}`, "UNKNOWN_ACTION", 400);
  }
}
