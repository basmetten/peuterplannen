import { supabase } from "../lib/db.ts";
import { AppError } from "../lib/errors.ts";
import { LOCATION_DETAIL_SELECT } from "../lib/constants.ts";
import {
  asString,
  asInteger,
  asNullableString,
  asNullableNumber,
  asNumberArray,
  asTextArray,
  asJsonArray,
  assertUuid,
  slugify,
  isMissingRelationError,
  validateEditorialPageType,
  validateEditorialStatus,
  summarizeQualityTaskDetails,
  fetchPriorityLocationQueue,
} from "../lib/helpers.ts";

function normalizeEditorialPayload(params: Record<string, unknown>, adminUserId: string) {
  const pageType = validateEditorialPageType(asString(params.page_type));
  const slug = asString(params.slug).trim();
  const status = validateEditorialStatus(asString(params.status || "draft"));
  const title = asString(params.title).trim();

  if (!slug) throw new AppError("slug ontbreekt", "MISSING_SLUG", 400);
  if (!title) throw new AppError("title ontbreekt", "MISSING_TITLE", 400);

  const payload: Record<string, unknown> = {
    page_type: pageType,
    slug,
    region_slug: asNullableString(params.region_slug),
    type_slug: asNullableString(params.type_slug),
    cluster_slug: asNullableString(params.cluster_slug),
    location_id: asNullableNumber(params.location_id),
    status,
    title,
    meta_title: asNullableString(params.meta_title),
    meta_description: asNullableString(params.meta_description),
    hero_kicker: asNullableString(params.hero_kicker),
    hero_body_md: asNullableString(params.hero_body_md),
    body_md: asNullableString(params.body_md),
    faq_json: asJsonArray(params.faq_json),
    curated_location_ids: asNumberArray(params.curated_location_ids),
    related_blog_slugs: asTextArray(params.related_blog_slugs),
    editorial_label: asNullableString(params.editorial_label) || "PeuterPlannen redactie",
    updated_by: adminUserId,
    updated_at: new Date().toISOString(),
    published_at: status === "published" ? (asNullableString(params.published_at) || new Date().toISOString()) : null,
  };

  if (payload.location_id != null) payload.location_id = Math.trunc(Number(payload.location_id));
  return payload;
}

function buildLocationEditorialDraft(location: Record<string, unknown>, taskSummary: string): Record<string, unknown> {
  const region = asString(location.region);
  const slug = slugify(asString(location.name));
  const locality = asString(location.seo_primary_locality);
  const website = asString(location.website);
  const intro = asString(location.seo_intro_override) || asString(location.toddler_highlight) || asString(location.description);
  const signalLabel = [
    location.verification_mode ? `Verification mode: ${location.verification_mode}` : null,
    location.last_verified ? `Laatst geverifieerd: ${location.last_verified}` : null,
    location.time_of_day_fit ? `Dagdeel-fit: ${location.time_of_day_fit}` : null,
  ].filter(Boolean).join(" · ");

  const body = [
    "## Redactionele opdracht",
    "",
    "Werk deze detailpagina uit als een praktisch profiel voor ouders met jonge kinderen. Vermijd generieke superlatieven en benoem alleen concrete observaties die helpen kiezen.",
    "",
    "## Huidige facts",
    "",
    `- Regio: ${region || "onbekend"}`,
    `- Type: ${asString(location.type) || "onbekend"}`,
    `- Locality/wijk: ${locality || "nog invullen"}`,
    `- Website: ${website || "geen website opgeslagen"}`,
    `- Signalen: ${signalLabel || "nog aanvullen"}`,
    taskSummary ? `- Quality task: ${taskSummary}` : null,
    "",
    "## Bestaande omschrijving",
    "",
    intro || "_Nog geen bruikbare basisomschrijving aanwezig._",
    "",
    "## Nog uitwerken",
    "",
    "- Wat doet een kind hier concreet?",
    "- Waarom werkt dit met peuters of dreumesen?",
    "- Wat moet een ouder vooraf weten qua logistiek, tempo en faciliteiten?",
    "- Wat zijn logische alternatieven of combinaties in de buurt?",
    "",
    "## Werkcopy",
    "",
    "### Waarom dit werkt met peuters",
    "",
    "_Schrijf hier een korte, concrete alinea._",
    "",
    "### Handig om vooraf te weten",
    "",
    "- _Vul in_",
    "- _Vul in_",
    "- _Vul in_",
    "",
    "### Combineer met",
    "",
    "- _Gerelateerde plek of hub_",
  ].filter(Boolean).join("\n");

  return {
    page_type: "location_detail_override",
    slug,
    region_slug: slugify(region) || null,
    type_slug: null,
    cluster_slug: null,
    location_id: Number(location.id),
    status: "draft",
    title: asString(location.seo_title_override) || `${asString(location.name)} — redactioneel detaildraft`,
    meta_title: asNullableString(location.seo_title_override),
    meta_description: asNullableString(location.seo_description_override),
    hero_kicker: "Concept · detailpagina",
    hero_body_md: asNullableString(location.seo_intro_override) || asNullableString(location.toddler_highlight) || asNullableString(location.description),
    body_md: body,
    faq_json: [],
    curated_location_ids: [],
    related_blog_slugs: [],
    editorial_label: "Concept · PeuterPlannen redactie",
    published_at: null,
  };
}

export async function handleEditorial(
  action: string,
  params: Record<string, unknown>,
  admin: { id: string; email: string },
): Promise<unknown> {
  switch (action) {
    case "list_editorial_pages": {
      const requestedStatus = asString(params.status, "").trim();
      let query = supabase
        .from("editorial_pages")
        .select("id, page_type, slug, region_slug, type_slug, cluster_slug, location_id, status, title, updated_at, published_at")
        .order("page_type", { ascending: true })
        .order("slug", { ascending: true })
        .limit(300);
      if (requestedStatus) query = query.eq("status", validateEditorialStatus(requestedStatus));
      const { data, error } = await query;
      if (error) {
        if (isMissingRelationError(error.message, "editorial_pages")) {
          return [];
        }
        throw new AppError(error.message, "EDITORIAL_PAGES_QUERY_FAILED", 400);
      }
      return data ?? [];
    }

    case "get_editorial_page": {
      const pageId = asString(params.page_id);
      if (!pageId) throw new AppError("page_id ontbreekt", "MISSING_PAGE_ID", 400);
      assertUuid(pageId, "page_id");
      const { data, error } = await supabase.from("editorial_pages").select("*").eq("id", pageId).maybeSingle();
      if (error) throw new AppError(error.message, "EDITORIAL_PAGE_QUERY_FAILED", 400);
      return data;
    }

    case "save_editorial_page": {
      const pageId = asString(params.page_id, "").trim();
      const payload = normalizeEditorialPayload(params, admin.id);
      let query;
      if (pageId) {
        assertUuid(pageId, "page_id");
        query = supabase.from("editorial_pages").update(payload).eq("id", pageId).select("*").single();
      } else {
        query = supabase.from("editorial_pages").insert(payload).select("*").single();
      }
      const { data, error } = await query;
      if (error) throw new AppError(error.message, "SAVE_EDITORIAL_PAGE_FAILED", 400);
      return { ok: true, page: data };
    }

    case "ensure_location_editorial_draft": {
      const locationId = asNullableNumber(params.location_id);
      if (!locationId) throw new AppError("location_id ontbreekt", "MISSING_LOCATION_ID", 400);
      const normalizedLocationId = Math.trunc(locationId);

      const { data: existingPage, error: existingPageError } = await supabase
        .from("editorial_pages")
        .select("*")
        .eq("page_type", "location_detail_override")
        .eq("location_id", normalizedLocationId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingPageError) throw new AppError(existingPageError.message, "EDITORIAL_DRAFT_QUERY_FAILED", 400);
      if (existingPage) {
        return { ok: true, created: false, page: existingPage };
      }

      const { data: location, error: locationError } = await supabase
        .from("locations")
        .select(LOCATION_DETAIL_SELECT)
        .eq("id", normalizedLocationId)
        .single();
      if (locationError || !location) throw new AppError("Locatie niet gevonden", "LOCATION_NOT_FOUND", 404);

      const { data: taskRows, error: taskError } = await supabase
        .from("location_quality_tasks")
        .select("task_type, details_json, priority, created_at")
        .eq("location_id", normalizedLocationId)
        .in("status", ["open", "in_progress"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      if (taskError && !isMissingRelationError(taskError.message, "location_quality_tasks")) {
        throw new AppError(taskError.message, "EDITORIAL_DRAFT_TASKS_FAILED", 400);
      }

      const taskSummary = (taskRows ?? [])
        .map((row: Record<string, unknown>) => summarizeQualityTaskDetails(asString(row.task_type), row.details_json))
        .filter(Boolean)
        .slice(0, 3)
        .join(" · ");

      const payload = buildLocationEditorialDraft(location as Record<string, unknown>, taskSummary);
      const { data: insertedPage, error: insertError } = await supabase
        .from("editorial_pages")
        .insert({
          ...payload,
          updated_by: admin.id,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (insertError) throw new AppError(insertError.message, "EDITORIAL_DRAFT_CREATE_FAILED", 400);

      return { ok: true, created: true, page: insertedPage };
    }

    case "seed_priority_editorial_drafts": {
      const limit = Math.min(Math.max(asInteger(params.limit, 25), 1), 100);
      const queue = await fetchPriorityLocationQueue(limit * 4);
      const targets = queue
        .filter((row) => !row.has_editorial_draft)
        .slice(0, limit);

      if (!targets.length) {
        return { ok: true, created: 0, skipped_existing: 0, queue_size: queue.length, created_targets: [] };
      }

      const locationIds = targets.map((row) => Math.trunc(Number(row.location_id))).filter(Boolean);
      const { data: locations, error: locationsError } = await supabase
        .from("locations")
        .select(LOCATION_DETAIL_SELECT)
        .in("id", locationIds);
      if (locationsError) throw new AppError(locationsError.message, "PRIORITY_DRAFT_LOCATIONS_FAILED", 400);

      const { data: taskRows, error: taskRowsError } = await supabase
        .from("location_quality_tasks")
        .select("location_id, task_type, details_json, priority, created_at")
        .in("location_id", locationIds)
        .in("status", ["open", "in_progress"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (taskRowsError && !isMissingRelationError(taskRowsError.message, "location_quality_tasks")) {
        throw new AppError(taskRowsError.message, "PRIORITY_DRAFT_TASKS_FAILED", 400);
      }

      const taskSummaryByLocation = new Map<number, string>();
      for (const row of taskRows ?? []) {
        const locationId = asNullableNumber(row.location_id);
        if (!locationId || taskSummaryByLocation.has(locationId)) continue;
        const summary = summarizeQualityTaskDetails(asString(row.task_type), row.details_json);
        if (summary) taskSummaryByLocation.set(locationId, summary);
      }

      const locationById = new Map((locations ?? []).map((row: Record<string, unknown>) => [Number(row.id), row]));
      const payload = targets
        .map((target) => {
          const location = locationById.get(Number(target.location_id));
          if (!location) return null;
          return {
            ...buildLocationEditorialDraft(location, taskSummaryByLocation.get(Number(target.location_id)) || ""),
            updated_by: admin.id,
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      if (!payload.length) {
        return { ok: true, created: 0, skipped_existing: 0, queue_size: queue.length, created_targets: [] };
      }

      const { data: insertedPages, error: insertError } = await supabase
        .from("editorial_pages")
        .insert(payload)
        .select("id, location_id, slug, status, title");
      if (insertError) throw new AppError(insertError.message, "PRIORITY_DRAFT_INSERT_FAILED", 400);

      return {
        ok: true,
        created: insertedPages?.length ?? 0,
        skipped_existing: queue.filter((row) => row.has_editorial_draft).length,
        queue_size: queue.length,
        created_targets: (insertedPages ?? []).map((row: Record<string, unknown>) => ({
          page_id: row.id,
          location_id: row.location_id,
          slug: row.slug,
          title: row.title,
          status: row.status,
        })),
      };
    }

    case "get_next_priority_location": {
      const preferWithoutDraft = params.prefer_without_draft !== false;
      const queue = await fetchPriorityLocationQueue(25);
      const candidate = preferWithoutDraft
        ? queue.find((row) => !row.has_editorial_draft) || queue[0]
        : queue[0];
      return candidate || null;
    }

    default:
      throw new AppError(`Onbekende editorial actie: ${action}`, "UNKNOWN_ACTION", 400);
  }
}
