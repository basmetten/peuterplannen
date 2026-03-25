#!/usr/bin/env node
/**
 * Generate category header illustrations using Gemini Nano Banana 2
 * Usage: GEMINI_API_KEY=... node .scripts/generate-category-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GEMINI_API_KEY env var'); process.exit(1); }

const MODEL = 'gemini-3.1-flash-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const OUT_DIR = path.join(__dirname, '..', 'images', 'categories');

// Style prompt prefix — matches existing PeuterPlannen blog illustrations
const STYLE = `Warm flat-vector illustration style. Terracotta, sage green, cream, and soft yellow color palette.
Dutch setting. Simplified, friendly characters with round features. No text or letters in the image.
Clean composition, suitable as a wide banner header (aspect ratio ~3:1).
Soft shadows, no outlines, modern children's book aesthetic. White/cream background.`;

const CATEGORIES = [
  { slug: 'speeltuinen-header', prompt: `${STYLE} Scene: Two toddlers playing on a small playground with swings, a short slide, and a sandbox. A parent watches from a bench nearby. Trees and bushes in the background. Playful, safe, joyful atmosphere.` },
  { slug: 'kinderboerderijen-header', prompt: `${STYLE} Scene: A toddler gently petting a small goat behind a wooden fence. Chickens pecking nearby. A red barn in the background. Hay bales and wildflowers. Warm, nurturing farm atmosphere.` },
  { slug: 'natuur-header', prompt: `${STYLE} Scene: A family walking on a forest path — parent holding toddler's hand. Butterflies, a small stream, ferns and tall trees. Dappled sunlight. Peaceful Dutch nature setting.` },
  { slug: 'musea-header', prompt: `${STYLE} Scene: A small child looking up in wonder at a large colorful painting on a museum wall. High ceilings, wooden floor. Parent crouching beside the child pointing at the artwork. Quiet, inspiring atmosphere.` },
  { slug: 'zwemmen-header', prompt: `${STYLE} Scene: A happy toddler in a shallow swimming pool with a small inflatable ring. Gentle splashing water. A parent nearby in the water. Bright, cheerful indoor pool setting with large windows.` },
  { slug: 'pannenkoeken-header', prompt: `${STYLE} Scene: A family sitting at a wooden table with a large Dutch pancake (pannenkoek). A toddler reaching for toppings. Farmhouse-style restaurant interior. Cozy, warm, welcoming atmosphere.` },
  { slug: 'horeca-header', prompt: `${STYLE} Scene: A cozy Dutch café with a small play corner visible. A parent drinking coffee while a toddler plays with wooden toys nearby. Plants, warm lighting, relaxed atmosphere.` },
  { slug: 'cultuur-header', prompt: `${STYLE} Scene: A toddler sitting on the floor surrounded by small musical instruments — a xylophone, tambourine, small drum. Colorful theater curtains in the background. Creative, playful, artistic atmosphere.` },
];

function generateImage(category) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: category.prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] }
    });

    const url = new URL(`${ENDPOINT}?key=${API_KEY}`);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`API error: ${json.error.message}`));
            return;
          }
          const parts = json.candidates?.[0]?.content?.parts || [];
          const imgPart = parts.find(p => p.inlineData || p.inline_data);
          if (!imgPart) {
            reject(new Error(`No image in response for ${category.slug}. Keys: ${parts.map(p => Object.keys(p)).join(',')}`));
            return;
          }
          const imgData = imgPart.inlineData || imgPart.inline_data;
          const buf = Buffer.from(imgData.data, 'base64');
          const outPath = path.join(OUT_DIR, `${category.slug}.png`);
          fs.writeFileSync(outPath, buf);
          console.log(`  ✓ ${category.slug}.png (${(buf.length / 1024).toFixed(0)}KB)`);
          resolve(outPath);
        } catch (e) {
          reject(new Error(`Parse error for ${category.slug}: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error(`Timeout for ${category.slug}`)); });
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Generating ${CATEGORIES.length} category illustrations...\n`);

  for (const cat of CATEGORIES) {
    try {
      await generateImage(cat);
    } catch (e) {
      console.error(`  ✗ ${cat.slug}: ${e.message}`);
    }
    // Small delay between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\nDone! Run optimize_images.js to create WebP versions.');
}

main();
