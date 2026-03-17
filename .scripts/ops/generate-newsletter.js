#!/usr/bin/env node
/**
 * generate-newsletter.js
 *
 * Generates a weekly newsletter draft for PeuterPlannen.
 * 1. Fetches weekend weather from Open-Meteo API
 * 2. Selects 3-5 locations per top region matching the weather
 * 3. Generates a Markdown newsletter
 * 4. POSTs to Buttondown API as draft (if BUTTONDOWN_API_KEY is set)
 * 5. Saves to output/newsletter-draft.md
 *
 * Usage: node .scripts/ops/generate-newsletter.js
 * Env:   BUTTONDOWN_API_KEY (optional — if set, posts draft to Buttondown)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'output');
const { SB_URL, SB_KEY, SB_PROJECT } = require('../lib/config');

// Top regions with approximate coordinates for weather lookup
const TOP_REGIONS = [
  { slug: 'amsterdam', name: 'Amsterdam', lat: 52.37, lon: 4.90 },
  { slug: 'rotterdam', name: 'Rotterdam', lat: 51.92, lon: 4.48 },
  { slug: 'utrecht', name: 'Utrecht', lat: 52.09, lon: 5.12 },
  { slug: 'den-haag', name: 'Den Haag', lat: 52.08, lon: 4.30 },
];

async function fetchSupabase(endpoint, query) {
  const base = SB_URL.includes('supabase.co') ? SB_URL : SB_PROJECT;
  const url = `${base}/rest/v1/${endpoint}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${endpoint}: ${res.status}`);
  return res.json();
}

async function fetchWeekendWeather(lat, lon) {
  // Get weather for the next Saturday and Sunday
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + daysUntilSat);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  const fmt = (d) => d.toISOString().split('T')[0];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum,weathercode&start_date=${fmt(saturday)}&end_date=${fmt(sunday)}&timezone=Europe/Amsterdam`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo: ${res.status}`);
  const data = await res.json();

  const days = data.daily.time.map((date, i) => ({
    date,
    maxTemp: data.daily.temperature_2m_max[i],
    rain: data.daily.precipitation_sum[i],
    code: data.daily.weathercode[i],
  }));

  // Determine overall weekend weather
  const avgRain = days.reduce((s, d) => s + d.rain, 0) / days.length;
  const avgTemp = days.reduce((s, d) => s + d.maxTemp, 0) / days.length;
  const isRainy = avgRain > 2;
  const isCold = avgTemp < 10;
  const isWarm = avgTemp >= 18;

  return { days, avgRain, avgTemp, isRainy, isCold, isWarm };
}

function weatherLabel(weather) {
  if (weather.isRainy) return 'regenachtig';
  if (weather.isWarm) return 'lekker warm';
  if (weather.isCold) return 'fris';
  return 'wisselend';
}

function weatherEmoji(weather) {
  if (weather.isRainy) return '🌧️';
  if (weather.isWarm) return '☀️';
  if (weather.isCold) return '🧣';
  return '⛅';
}

function selectLocations(locations, region, weather, count = 3) {
  const regionLocs = locations.filter(
    (l) => l.region === region.slug && l.seo_tier === 'index' && l.description
  );

  // Score locations based on weather fit
  const scored = regionLocs.map((loc) => {
    let score = loc.seoQualityScore || loc.seo_quality_score || 0;

    if (weather.isRainy) {
      // Prefer indoor locations
      if (loc.weather_category === 'indoor' || loc.type === 'indoor-speeltuin')
        score += 20;
      if (loc.type === 'museum') score += 15;
      if (loc.type === 'horeca') score += 10;
    } else {
      // Prefer outdoor locations
      if (loc.weather_category === 'outdoor' || loc.type === 'speeltuin')
        score += 15;
      if (loc.type === 'kinderboerderij') score += 10;
      if (loc.type === 'park') score += 10;
    }

    // Bonus for toddler highlight
    if (loc.toddler_highlight) score += 5;

    return { ...loc, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, count);
}

function generateMarkdown(regionPicks, weather, weekendDates) {
  const weatherDesc = weatherLabel(weather);
  const emoji = weatherEmoji(weather);
  const satDate = new Date(weekendDates[0]).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const sunDate = new Date(weekendDates[1]).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let md = `# ${emoji} Weekend-uitjes: ${weatherDesc} weer\n\n`;
  md += `*${satDate} & ${sunDate}*\n\n`;
  md += `Het wordt een **${weatherDesc}** weekend (${Math.round(weather.avgTemp)}°C). `;

  if (weather.isRainy) {
    md += `Geen zorgen — we hebben de beste indoor plekken voor je op een rij.\n\n`;
  } else if (weather.isWarm) {
    md += `Tijd om eropuit te gaan! Dit zijn onze tips voor buiten.\n\n`;
  } else {
    md += `Hier zijn onze tips voor dit weekend.\n\n`;
  }

  for (const { region, picks } of regionPicks) {
    if (picks.length === 0) continue;
    md += `## ${region.name}\n\n`;
    for (const loc of picks) {
      const slug = loc.slug || loc.name.toLowerCase().replace(/\s+/g, '-');
      const url = `https://peuterplannen.nl/${region.slug}/${slug}/`;
      const desc = loc.toddler_highlight || loc.description?.slice(0, 120) || '';
      md += `**[${loc.name}](${url})**\n`;
      md += `${desc}${desc.length >= 120 ? '...' : ''}\n\n`;
    }
  }

  md += `---\n\n`;
  md += `Fijn weekend! 🧡\n\n`;
  md += `*Je ontvangt deze mail omdat je je hebt aangemeld bij PeuterPlannen. [Uitschrijven]({{ unsubscribe_url }})*\n`;

  return md;
}

async function postToButtondown(subject, body) {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    console.log('  BUTTONDOWN_API_KEY not set — skipping API post');
    return null;
  }

  const res = await fetch('https://api.buttondown.com/v1/emails', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subject, body, status: 'draft' }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  Buttondown API error: ${res.status} — ${text}`);
    return null;
  }

  const data = await res.json();
  console.log(`  Draft posted to Buttondown: "${subject}" (id: ${data.id})`);
  return data;
}

async function main() {
  console.log('Generating newsletter draft...\n');

  // Fetch weather for first region (Amsterdam) as representative
  const weather = await fetchWeekendWeather(
    TOP_REGIONS[0].lat,
    TOP_REGIONS[0].lon
  );
  console.log(
    `  Weekend weather: ${weatherLabel(weather)} (${Math.round(weather.avgTemp)}°C, ${Math.round(weather.avgRain)}mm rain)`
  );

  // Fetch locations
  const locations = await fetchSupabase(
    'locations',
    'select=name,slug,region,type,description,toddler_highlight,weather_category,seo_tier,seo_quality_score&order=name'
  );
  console.log(`  ${locations.length} locations loaded`);

  // Select picks per region
  const regionPicks = TOP_REGIONS.map((region) => ({
    region,
    picks: selectLocations(locations, region, weather, 3),
  }));

  const totalPicks = regionPicks.reduce((s, r) => s + r.picks.length, 0);
  console.log(`  ${totalPicks} locations selected across ${TOP_REGIONS.length} regions\n`);

  // Generate markdown
  const weekendDates = weather.days.map((d) => d.date);
  const md = generateMarkdown(regionPicks, weather, weekendDates);

  // Save to file
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'newsletter-draft.md');
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`  Saved to ${outPath}`);

  // Post to Buttondown as draft
  const weatherDesc = weatherLabel(weather);
  const subject = `Weekend-uitjes: ${weatherDesc} weer (${Math.round(weather.avgTemp)}°C)`;
  await postToButtondown(subject, md);

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Newsletter generation failed:', err.message);
  process.exit(1);
});
