#!/usr/bin/env node
// Generate weekly newsletter content for PeuterPlannen
// Run: node .scripts/generate-newsletter.js [city]

const SUPABASE_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdWpzdmdiZmZscnJ2YXV6c3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDMxNzAsImV4cCI6MjA4NzYxOTE3MH0.5y3gqiPfVvpvfaDYA_PgqE-KTvuf6zgN6vGzqfUpeSo';

async function main() {
    const city = process.argv[2] || 'Amsterdam';

    // 1. Fetch locations
    const headers = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };

    const resp = await fetch(
        `${SUPABASE_URL}?select=id,name,type,region,weather,description,toddler_highlight,photo_url,owner_photo_url,coffee,diaper,is_featured,min_age,max_age,rain_backup_quality,price_band&region=eq.${encodeURIComponent(city)}&order=created_at.desc&limit=500`,
        { headers }
    );

    if (!resp.ok) throw new Error(`Supabase error: ${resp.status}`);
    const locations = await resp.json();
    console.log(`Loaded ${locations.length} locations for ${city}`);

    // 2. Fetch weekend weather
    const weatherResp = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=52.37&longitude=4.90&daily=weather_code,temperature_2m_max,precipitation_sum&timezone=Europe/Amsterdam&forecast_days=5'
    );
    const weatherData = await weatherResp.json();

    // Find weekend days
    const today = new Date();
    const forecasts = weatherData.daily.time.map((date, i) => ({
        date,
        day: new Date(date + 'T12:00:00'),
        code: weatherData.daily.weather_code[i],
        temp: Math.round(weatherData.daily.temperature_2m_max[i]),
        rain: weatherData.daily.precipitation_sum[i]
    }));

    const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
    const weekendForecast = forecasts.find(f => f.day.getDay() === 6) || forecasts[forecasts.length - 1];
    const isRainy = RAIN_CODES.has(weekendForecast.code);
    const weatherDesc = isRainy ? `${weekendForecast.temp}\u00B0, regen` : weekendForecast.code <= 3 ? `${weekendForecast.temp}\u00B0, zonnig` : `${weekendForecast.temp}\u00B0, bewolkt`;

    // 3. Select 3 picks
    const TYPE_LABELS = { play: 'Speeltuin', farm: 'Kinderboerderij', nature: 'Natuur', museum: 'Museum', swim: 'Zwembad', horeca: 'Horeca', pancake: 'Pannenkoekhuis' };
    const SEASONAL_BONUS = { 2: ['farm'], 3: ['farm', 'nature'], 4: ['play', 'nature'], 5: ['swim', 'play'], 6: ['swim'], 7: ['swim', 'play'], 8: ['farm'], 9: ['museum'], 10: ['museum'], 11: ['museum'] };
    const month = today.getMonth();
    const seasonal = SEASONAL_BONUS[month] || [];

    const scored = locations.map(loc => {
        let score = 50;
        if (loc.is_featured) score += 20;
        if (loc.toddler_highlight) score += 10;
        if (loc.photo_url || loc.owner_photo_url) score += 15;
        if (seasonal.includes(loc.type)) score += 15;
        if (isRainy && ['indoor', 'hybrid', 'both'].includes(loc.weather)) score += 25;
        if (!isRainy && ['outdoor', 'both'].includes(loc.weather)) score += 15;
        if (loc.coffee) score += 5;
        if (loc.price_band === 'free') score += 10;
        score += Math.random() * 10; // variety
        return { loc, score };
    }).sort((a, b) => b.score - a.score);

    // Pick 3 with type diversity
    const picks = [];
    const usedTypes = new Set();
    for (const { loc } of scored) {
        if (picks.length >= 3) break;
        if (!usedTypes.has(loc.type)) {
            picks.push(loc);
            usedTypes.add(loc.type);
        }
    }

    // 4. Generate output
    const personalLine = isRainy
        ? `Dit weekend regent het in ${city} \u2014 maar dat hoeft geen probleem te zijn. Deze drie plekken zijn regenproof \u00E9n leuk voor peuters.`
        : weekendForecast.temp >= 15
            ? `${weekendForecast.temp} graden dit weekend in ${city} \u2014 perfect om eropuit te gaan met de kleintjes.`
            : `Fris maar droog dit weekend in ${city}. Ideaal om er even tussenuit te gaan.`;

    const subject = `3 uitjes voor dit weekend (${weatherDesc})`;

    // Plain text version
    console.log('\n' + '='.repeat(60));
    console.log('NEWSLETTER CONTENT');
    console.log('='.repeat(60));
    console.log(`\nOnderwerp: ${subject}\n`);
    console.log(personalLine + '\n');

    picks.forEach((loc, i) => {
        const typeLabel = TYPE_LABELS[loc.type] || loc.type;
        const reason = loc.toddler_highlight || loc.description || '';
        const reasonShort = reason.length > 80 ? reason.slice(0, 77) + '...' : reason;
        const freeLabel = loc.price_band === 'free' ? ' \u00B7 Gratis' : '';
        console.log(`${i + 1}. ${loc.name} \u2014 ${typeLabel}${freeLabel}`);
        console.log(`   ${reasonShort}`);
        console.log(`   \uD83D\uDCF8 ${loc.photo_url || loc.owner_photo_url || '(geen foto)'}`);
        console.log('');
    });

    console.log(`\uD83D\uDCCB Plan je weekend \u2192 https://peuterplannen.nl/app.html#plan`);
    console.log('\n' + '-'.repeat(60));

    // HTML version
    const htmlPicks = picks.map(loc => {
        const typeLabel = TYPE_LABELS[loc.type] || loc.type;
        const reason = loc.toddler_highlight || loc.description || '';
        const reasonShort = reason.length > 100 ? reason.slice(0, 97) + '...' : reason;
        const photo = loc.photo_url || loc.owner_photo_url;
        const freeLabel = loc.price_band === 'free' ? ' \u00B7 Gratis' : '';
        return `<tr><td style="padding:16px 0;border-bottom:1px solid #f0ebe6;">
            ${photo ? `<img src="${photo}" alt="${loc.name}" style="width:100%;max-width:560px;height:auto;border-radius:12px;margin-bottom:8px;">` : ''}
            <div style="font-size:18px;font-weight:600;color:#3A2F2C;">${loc.name}</div>
            <div style="font-size:14px;color:#8B7355;margin:4px 0;">${typeLabel}${freeLabel}</div>
            <div style="font-size:14px;color:#5C4433;">${reasonShort}</div>
        </td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#FFF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px 20px;">
<tr><td style="padding-bottom:20px;">
    <img src="https://peuterplannen.nl/icons/apple-touch-icon.png" width="40" height="40" style="border-radius:10px;">
    <span style="font-size:20px;font-weight:700;color:#D47756;vertical-align:middle;margin-left:8px;">PeuterPlannen</span>
</td></tr>
<tr><td style="font-size:16px;color:#3A2F2C;line-height:1.5;padding-bottom:20px;">${personalLine}</td></tr>
${htmlPicks}
<tr><td style="padding:24px 0;text-align:center;">
    <a href="https://peuterplannen.nl/app.html#plan" style="display:inline-block;padding:14px 28px;background:#D47756;color:white;text-decoration:none;border-radius:24px;font-weight:600;font-size:16px;">\uD83D\uDCCB Plan je weekend</a>
</td></tr>
<tr><td style="font-size:13px;color:#8B7355;text-align:center;padding-top:16px;border-top:1px solid #f0ebe6;">
    Wat was jullie leukste uitje vorige week? Reply op deze mail!<br><br>
    <a href="https://peuterplannen.nl" style="color:#D47756;">peuterplannen.nl</a>
</td></tr>
</table>
</body></html>`;

    // Write HTML file
    const fs = await import('fs');
    const outPath = `.scripts/output/newsletter-${today.toISOString().slice(0, 10)}.html`;
    await fs.promises.mkdir('.scripts/output', { recursive: true });
    await fs.promises.writeFile(outPath, html);
    console.log(`\nHTML saved to: ${outPath}`);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
