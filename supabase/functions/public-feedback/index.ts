import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const FALLBACK_ORIGIN = "https://peuterplannen.nl";
const ALLOWED_ORIGINS = new Set([
  "https://peuterplannen.nl",
  "https://www.peuterplannen.nl",
  "https://admin.peuterplannen.nl",
  "https://partner.peuterplannen.nl",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8787",
]);

function corsHeaders(origin: string | null) {
  const safeOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : FALLBACK_ORIGIN;
  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function normalizeText(input: unknown, max: number) {
  const str = String(input ?? "").trim().replace(/\s+/g, " ");
  return str.slice(0, max);
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const CORS = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }),
        { status: 405, headers: { ...CORS, "Content-Type": "application/json" } }
      );
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase env");
    }

    const payload = await req.json() as {
      subject?: string;
      message?: string;
      source?: string;
      page?: string;
      email?: string;
    };

    const subject = normalizeText(payload.subject, 120);
    const message = normalizeText(payload.message, 2500);
    const source = normalizeText(payload.source || "public-feedback", 80);
    const page = normalizeText(payload.page || "unknown", 120);
    const email = normalizeText(payload.email || "", 160);

    if (!subject || subject.length < 2) {
      return new Response(
        JSON.stringify({ error: "Ongeldig onderwerp", code: "INVALID_SUBJECT" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    if (!message || message.length < 5) {
      return new Response(
        JSON.stringify({ error: "Bericht te kort", code: "INVALID_MESSAGE" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const input = `[${subject}] ${message}`;
    const { error: insertError } = await supabase
      .from("suggestions")
      .insert({ input, source: `${source} (${page})` });
    if (insertError) throw insertError;

    // Optional server-side mail forward; no client key exposure.
    const web3formsKey = Deno.env.get("W3F_KEY") || Deno.env.get("WEB3FORMS_ACCESS_KEY");
    if (web3formsKey) {
      const lines = [
        `Onderwerp: ${subject}`,
        `Bron: ${source}`,
        `Pagina: ${page}`,
        email ? `Email: ${email}` : null,
        "",
        message,
      ].filter(Boolean).join("\n");

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          access_key: web3formsKey,
          subject: `PeuterPlannen feedback: ${subject}`,
          from_name: "PeuterPlannen public-feedback",
          message: lines,
        }),
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ ok: true, code: "OK" }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("public-feedback error", err);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
