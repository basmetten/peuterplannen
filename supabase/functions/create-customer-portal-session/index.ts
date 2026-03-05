import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RETURN_URL = Deno.env.get("STRIPE_BILLING_PORTAL_RETURN_URL") || "https://partner.peuterplannen.nl/";

const CORS = {
  "Access-Control-Allow-Origin": "https://partner.peuterplannen.nl",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      throw new Error("Unauthorized");
    }

    const userId = userData.user.id;

    const { data: owner, error: ownerError } = await supabase
      .from("venue_owners")
      .select("id, stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (ownerError || !owner) {
      throw new Error("Geen owner-profiel gevonden voor deze gebruiker.");
    }

    if (!owner.stripe_customer_id) {
      throw new Error("Geen Stripe customer gekoppeld. Start eerst een abonnement of neem contact op.");
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: owner.stripe_customer_id,
      return_url: RETURN_URL,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-customer-portal-session error", error);

    const message = (error as Error).message || "Onbekende fout";
    const status = message === "Unauthorized" ? 401 : 400;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
