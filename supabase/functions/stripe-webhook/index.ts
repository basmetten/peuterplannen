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

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

function mapStripeSubscriptionStatus(stripeStatus: Stripe.Subscription.Status) {
  switch (stripeStatus) {
    case "trialing":
      return { subscriptionStatus: "trial", planTier: "featured", isFeatured: true };
    case "active":
      return { subscriptionStatus: "featured", planTier: "featured", isFeatured: true };
    case "past_due":
      return { subscriptionStatus: "past_due", planTier: "featured", isFeatured: false };
    case "canceled":
      return { subscriptionStatus: "canceled", planTier: "none", isFeatured: false };
    case "paused":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return { subscriptionStatus: "past_due", planTier: "none", isFeatured: false };
    default:
      return { subscriptionStatus: "past_due", planTier: "none", isFeatured: false };
  }
}

serve(async (req) => {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub  = event.data.object as Stripe.Subscription;
        const ownerId = sub.metadata?.venue_owner_id;
        if (!ownerId) break;

        const stripeStatus = sub.status;
        const mapped = mapStripeSubscriptionStatus(stripeStatus);

        const expiresAt = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        const { error: ownerUpdateError } = await supabase
          .from("venue_owners")
          .update({
            subscription_status: mapped.subscriptionStatus,
            subscription_id:     sub.id,
            plan_tier:           mapped.planTier,
            plan_expires_at:     expiresAt,
            updated_at:          new Date().toISOString(),
          })
          .eq("id", ownerId);
        if (ownerUpdateError) throw ownerUpdateError;

        // Update linked location
        await updateLocationBadges(ownerId, mapped.isFeatured, expiresAt);
        break;
      }

      case "customer.subscription.deleted": {
        const sub     = event.data.object as Stripe.Subscription;
        const ownerId = sub.metadata?.venue_owner_id;
        if (!ownerId) break;

        const { error: ownerUpdateError } = await supabase
          .from("venue_owners")
          .update({
            subscription_status: "canceled",
            plan_tier:           "none",
            plan_expires_at:     null,
            updated_at:          new Date().toISOString(),
          })
          .eq("id", ownerId);
        if (ownerUpdateError) throw ownerUpdateError;

        await updateLocationBadges(ownerId, false, null);
        break;
      }

      case "invoice.payment_failed": {
        const invoice  = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { error: paymentFailedError } = await supabase
          .from("venue_owners")
          .update({ subscription_status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", customerId);
        if (paymentFailedError) throw paymentFailedError;
        break;
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Internal error", { status: 500 });
  }
});

async function updateLocationBadges(
  ownerId:    string,
  isFeatured: boolean,
  expiresAt:  string | null
): Promise<void> {
  const { data: owner, error: ownerErr } = await supabase
    .from("venue_owners")
    .select("location_id")
    .eq("id", ownerId)
    .single();

  if (ownerErr) throw ownerErr;
  if (!owner?.location_id) return;

  const { error: updateErr } = await supabase
    .from("locations")
    .update({
      is_featured:    isFeatured,
      featured_until: isFeatured ? expiresAt : null,
      featured_tier:  isFeatured ? "featured" : null,
      owner_verified: isFeatured,
    })
    .eq("id", owner.location_id);

  if (updateErr) throw updateErr;
}
