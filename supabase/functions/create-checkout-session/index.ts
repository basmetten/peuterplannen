import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Stripe Price IDs for Featured plan (monthly and yearly)
const PRICE_IDS: Record<string, string> = {
  featured_monthly: Deno.env.get("STRIPE_PRICE_ID_FEATURED_MONTHLY") ?? "",
  featured_yearly:  Deno.env.get("STRIPE_PRICE_ID_FEATURED_YEARLY")  ?? "",
};

const CORS = {
  "Access-Control-Allow-Origin":  "https://partner.peuterplannen.nl",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    // 1. Authenticate user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Unauthorized");

    // 2. Parse request
    const { plan_tier, billing_interval } = await req.json() as {
      plan_tier: "featured";
      billing_interval: "monthly" | "yearly";
    };

    if (plan_tier !== "featured") throw new Error("Ongeldig plan");
    if (!billing_interval || !["monthly", "yearly"].includes(billing_interval)) {
      throw new Error("Ongeldig billing interval");
    }

    const priceKey = `featured_${billing_interval}`;
    const priceId = PRICE_IDS[priceKey];
    if (!priceId) throw new Error(`Prijs niet geconfigureerd: ${priceKey}`);

    // 3. Get or create venue_owner record
    let { data: owner } = await supabase
      .from("venue_owners")
      .select("id, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!owner) {
      const { data: newOwner, error: insertErr } = await supabase
        .from("venue_owners")
        .insert({ user_id: user.id })
        .select("id, stripe_customer_id")
        .single();
      if (insertErr) throw insertErr;
      owner = newOwner;
    }

    // 4. Get or create Stripe customer
    let customerId = owner.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { venue_owner_id: owner.id, supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("venue_owners")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // 5. Create Stripe Checkout Session
    const idempotencyBucket = Math.floor(Date.now() / (5 * 60 * 1000));
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: "https://partner.peuterplannen.nl/?billing=success",
        cancel_url:  "https://partner.peuterplannen.nl/?billing=canceled",
        subscription_data: {
          metadata: { venue_owner_id: owner.id },
        },
        allow_promotion_codes: true,
      },
      {
        idempotencyKey: `checkout-${user.id}-${owner.id}-featured-${billing_interval}-${idempotencyBucket}`,
      }
    );

    return json({ url: session.url, code: "OK" });

  } catch (err) {
    console.error("create-checkout-session error:", err);
    const message = (err as Error).message || "Onbekende fout";
    const status = message === "Unauthorized" ? 401 : 400;
    return json({
      error: message,
      code: status === 401 ? "UNAUTHORIZED" : "BAD_REQUEST",
    }, status);
  }
});
