import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

const CORS = {
  "Access-Control-Allow-Origin":  "https://peuterplannen.nl",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAY_NAMES: Record<number, string> = {
  0: "zondag", 1: "maandag", 2: "dinsdag", 3: "woensdag",
  4: "donderdag", 5: "vrijdag", 6: "zaterdag",
};

const TRANSPORT_LABELS: Record<string, string> = {
  auto: "de auto", fiets: "de fiets", ov: "het openbaar vervoer",
  lopen: "te voet", bakfiets: "de bakfiets",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const {
      date,
      childAges,
      transport,
      morning,
      lunch,
      afternoon,
      forecast,
    } = await req.json();

    const dayName       = DAY_NAMES[new Date(date).getDay()] ?? "vandaag";
    const temp          = Math.round(forecast?.maxTemp ?? 12);
    const wCode         = forecast?.weatherCode ?? 2;
    const weatherDesc   = wCode <= 3 ? "mooi zonnig weer"
                        : wCode >= 51 ? "regenweer"
                        : "bewolkt weer";
    const transportLabel = TRANSPORT_LABELS[transport] ?? transport;

    const kidsStr = childAges.length === 1
      ? `een kind van ${childAges[0]} jaar`
      : `${childAges.length} kinderen (${childAges.join(", ")} jaar)`;

    const planStr = [
      morning   ? `Ochtend: ${morning.name} in ${morning.region ?? "Nederland"}` : null,
      lunch     ? `Lunch: ${lunch.name}` : null,
      afternoon ? `Middag: ${afternoon.name} in ${afternoon.region ?? "Nederland"}` : null,
    ].filter(Boolean).join("\n");

    const prompt = `Schrijf een korte, enthousiaste dagplanning in het Nederlands voor ouders met peuters. \
Het is ${dayName} en het wordt ${temp}°C met ${weatherDesc}. Ze gaan met ${kidsStr} via ${transportLabel}.

${planStr}

Schrijf 2-3 zinnen, alsof je een enthousiaste vriend bent die dit aanbeveelt. \
Noem concrete details (weer, reistijd, wat er leuk is voor peuters). \
Geen AI-taal, geen opsommingen. Gewoon een alinea. Maximaal 80 woorden.`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 250, temperature: 0.7 },
    };

    const res  = await fetch(GEMINI_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return new Response(JSON.stringify({ description: text.trim() }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("generate-plan error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
