import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ADMIN_EMAIL = "basmetten@gmail.com";

const CORS = {
  "Access-Control-Allow-Origin":  "https://admin.peuterplannen.nl",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Unauthorized");
    if (user.email !== ADMIN_EMAIL) throw new Error("Forbidden");

    // 2. Parse request
    const { action, params = {} } = await req.json() as {
      action: string;
      params?: Record<string, unknown>;
    };

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
        result = {
          pending_claims:   pendingClaims.count ?? 0,
          active_subs:      activeOwners.count  ?? 0,
          edits_last_7days: recentEdits.count   ?? 0,
          total_owners:     totalOwners.count   ?? 0,
        };
        break;
      }

      case "list_claims": {
        const status = (params.status as string) || "pending";
        const { data, error } = await supabase
          .from("location_claim_requests")
          .select(`
            id, status, message, created_at, reviewed_at,
            user_id,
            locations ( name, region )
          `)
          .eq("status", status)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;

        // Enrich with user emails via auth admin API
        const userIds = [...new Set((data ?? []).map((c: Record<string, unknown>) => c.user_id as string))];
        const emailMap: Record<string, string> = {};
        for (const uid of userIds) {
          const { data: userData } = await supabase.auth.admin.getUserById(uid as string);
          if (userData?.user?.email) emailMap[uid] = userData.user.email;
        }

        result = (data ?? []).map((c: Record<string, unknown>) => ({
          ...c,
          requester_email: emailMap[c.user_id as string] ?? "onbekend",
        }));
        break;
      }

      case "approve_claim": {
        const { claim_id } = params as { claim_id: string };
        if (!claim_id) throw new Error("claim_id vereist");

        // Get claim
        const { data: claim, error: claimErr } = await supabase
          .from("location_claim_requests")
          .select("user_id, location_id")
          .eq("id", claim_id)
          .single();
        if (claimErr || !claim) throw new Error("Claim niet gevonden");

        // Update claim status
        await supabase
          .from("location_claim_requests")
          .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
          .eq("id", claim_id);

        // Link location to owner
        const { data: owner } = await supabase
          .from("venue_owners")
          .select("id")
          .eq("user_id", claim.user_id)
          .single();

        if (owner) {
          await supabase
            .from("venue_owners")
            .update({ location_id: claim.location_id })
            .eq("id", owner.id);
        } else {
          await supabase
            .from("venue_owners")
            .insert({ user_id: claim.user_id, location_id: claim.location_id });
        }

        // Set claimed_by_user_id on location
        await supabase
          .from("locations")
          .update({ claimed_by_user_id: claim.user_id })
          .eq("id", claim.location_id);

        result = { ok: true };
        break;
      }

      case "reject_claim": {
        const { claim_id } = params as { claim_id: string };
        if (!claim_id) throw new Error("claim_id vereist");
        await supabase
          .from("location_claim_requests")
          .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
          .eq("id", claim_id);
        result = { ok: true };
        break;
      }

      case "list_owners": {
        const { data, error } = await supabase
          .from("venue_owners")
          .select(`
            id, user_id, subscription_status, plan_tier, plan_expires_at, created_at,
            locations ( name, region )
          `)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;

        const userIds = [...new Set((data ?? []).map((o: Record<string, unknown>) => o.user_id as string))];
        const emailMap: Record<string, string> = {};
        for (const uid of userIds) {
          const { data: userData } = await supabase.auth.admin.getUserById(uid as string);
          if (userData?.user?.email) emailMap[uid] = userData.user.email;
        }

        result = (data ?? []).map((o: Record<string, unknown>) => ({
          ...o,
          email: emailMap[o.user_id as string] ?? "onbekend",
        }));
        break;
      }

      case "update_owner": {
        const { owner_id, subscription_status, plan_tier } = params as {
          owner_id: string;
          subscription_status?: string;
          plan_tier?: string;
        };
        if (!owner_id) throw new Error("owner_id vereist");
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (subscription_status !== undefined) updates.subscription_status = subscription_status;
        if (plan_tier !== undefined) updates.plan_tier = plan_tier;
        const { error } = await supabase.from("venue_owners").update(updates).eq("id", owner_id);
        if (error) throw error;
        result = { ok: true };
        break;
      }

      case "list_locations": {
        const { search = "", page = 0 } = params as { search?: string; page?: number };
        const limit = 50;
        let query = supabase
          .from("locations")
          .select("id, name, region, type, is_featured, featured_until, owner_verified, claimed_by_user_id")
          .order("name")
          .range(page * limit, (page + 1) * limit - 1);
        if (search) query = query.ilike("name", `%${search}%`);
        const { data, error } = await query;
        if (error) throw error;
        result = data ?? [];
        break;
      }

      case "toggle_featured": {
        const { location_id } = params as { location_id: number };
        if (!location_id) throw new Error("location_id vereist");
        const { data: loc, error: fetchErr } = await supabase
          .from("locations")
          .select("is_featured")
          .eq("id", location_id)
          .single();
        if (fetchErr || !loc) throw new Error("Locatie niet gevonden");

        const newFeatured = !loc.is_featured;
        await supabase
          .from("locations")
          .update({
            is_featured:    newFeatured,
            featured_until: newFeatured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            featured_tier:  newFeatured ? "featured" : null,
          })
          .eq("id", location_id);
        result = { ok: true, is_featured: newFeatured };
        break;
      }

      case "toggle_verified": {
        const { location_id } = params as { location_id: number };
        if (!location_id) throw new Error("location_id vereist");
        const { data: loc, error: fetchErr } = await supabase
          .from("locations")
          .select("owner_verified")
          .eq("id", location_id)
          .single();
        if (fetchErr || !loc) throw new Error("Locatie niet gevonden");

        const newVerified = !loc.owner_verified;
        await supabase
          .from("locations")
          .update({ owner_verified: newVerified })
          .eq("id", location_id);
        result = { ok: true, owner_verified: newVerified };
        break;
      }

      case "list_edit_log": {
        const { data, error } = await supabase
          .from("location_edit_log")
          .select(`
            id, field_name, old_value, new_value, created_at,
            user_id,
            locations ( name )
          `)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;

        const userIds = [...new Set((data ?? []).map((e: Record<string, unknown>) => e.user_id as string))];
        const emailMap: Record<string, string> = {};
        for (const uid of userIds) {
          const { data: userData } = await supabase.auth.admin.getUserById(uid as string);
          if (userData?.user?.email) emailMap[uid] = userData.user.email;
        }

        result = (data ?? []).map((e: Record<string, unknown>) => ({
          ...e,
          owner_email: emailMap[e.user_id as string] ?? "onbekend",
        }));
        break;
      }

      default:
        throw new Error(`Onbekende actie: ${action}`);
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("admin-api error:", err);
    const status = (err as Error).message === "Forbidden" ? 403 :
                   (err as Error).message === "Unauthorized" ? 401 : 400;
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
