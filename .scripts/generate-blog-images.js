#!/usr/bin/env node
/**
 * Generate blog hero images using Gemini 2.5 Flash Image API.
 * Style: flat vector illustration, warm colors (cream/terracotta/green/yellow),
 * toddlers in playful Dutch settings, minimalist, no text in image.
 *
 * Usage: GEMINI_API_KEY=... node .scripts/generate-blog-images.js [--slug specific-slug]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

const API_KEY = process.env.GEMINI_API_KEY;

const MODEL = 'gemini-2.5-flash-image';
const IMAGES_DIR = path.join(__dirname, '..', 'images', 'blog');
const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');

const STYLE_PREFIX = `Flat vector illustration in a warm, minimal style. Cream/off-white background (#FFF5EB).
Color palette: terracotta (#D4775A), sage green (#6B8E6B), warm yellow (#E8B870), muted brown (#2D2926).
Characters are simplified with round heads, no facial details except dots for eyes and simple smile.
Dutch setting. No text, no letters, no words in the image. Landscape orientation 1024x576.
Scene should feel warm, inviting, and joyful. Clean geometric shapes, subtle shadows.`;

// Map each slug to a scene-specific prompt
const SCENE_MAP = {
  'amersfoort-met-peuters': 'A toddler and parent exploring a medieval Dutch town with the Koppelpoort gate visible. Canals, cobblestones, trees.',
  'amsterdam-met-peuters-en-kleuters': 'A parent and two young children on a bridge over an Amsterdam canal. Typical narrow canal houses, bikes parked on bridge railing.',
  'beste-speeltuinen-amsterdam-peuters': 'A toddler on a colorful playground slide with Amsterdam canal houses in the background. Sandbox, swings, trees.',
  'breda-met-peuters': 'A family with a toddler in a stroller walking through a park with a church tower visible. Trees, ducks in a pond.',
  'dagje-uit-met-1-jarige': 'A tiny baby (about 1 year old) sitting on a blanket in a park, reaching for colorful stacking toys. Parent sitting nearby. Grass, trees, butterflies.',
  'dagje-uit-met-kleuter-4-6-jaar': 'A 5-year-old child climbing a rope pyramid at a playground. Parent watching from a bench. Adventure and confidence.',
  'dagje-uit-opa-oma': 'Grandparents (older couple) walking hand-in-hand with a toddler in a Dutch park. Feeding ducks at a pond. Warm, tender moment.',
  'eerste-keer-kinderboerderij': 'A toddler petting a goat at a petting zoo. Chickens, a rabbit, wooden fence. Hay bales, red barn in background.',
  'eindhoven-met-peuters': 'A parent and toddler outside a modern building (Evoluon-like dome shape). Green park, bike path, geometric architecture.',
  'groningen-met-peuters': 'A toddler playing near the Martinitoren tower in Groningen. Canal boats, colorful houses, bicycles.',
  'herfstvakantie-met-peuters': 'A toddler in rain boots and a raincoat jumping in autumn leaves. Orange/red/yellow leaves, puddles, umbrella, cozy atmosphere.',
  'kinderfeestje-3-jaar': 'A group of three toddlers at a birthday party with balloons, bunting, a simple cake with 3 candles. Party hats, confetti.',
  'kindvriendelijke-horeca-met-speelhoek': 'Inside a cozy café with a play corner. A parent drinking coffee at a table while a toddler plays with wooden blocks in a colorful play area. Warm lighting.',
  'kindvriendelijke-terrassen-2026': 'A sunny outdoor terrace with a family. Toddler in a highchair, parent with a drink, parasol, potted plants. Relaxed summer vibe.',
  'koningsdag-peuter-2026': 'A toddler wearing an orange crown at a King\'s Day celebration. Orange decorations, flags, flea market stalls, canal in background.',
  'meivakantie-met-peuters': 'A family cycling through Dutch tulip fields on a cargo bike (bakfiets) with a toddler in front. Windmill, blue sky, colorful tulips.',
  'museum-met-peuter': 'A toddler looking up at a large colorful painting in a museum. High ceilings, wooden floors, parent crouching next to child pointing at art.',
  'nijmegen-met-peuters': 'A parent and toddler walking along the Waal river in Nijmegen. The Waalbrug bridge visible, green hills, riverside path.',
  'pannenkoekenrestaurant-met-speeltuin': 'A toddler eating a pancake at an outdoor table next to a playground. Wooden play equipment, pancake with powdered sugar, farm setting.',
  'pasen-met-peuters': 'Toddlers searching for Easter eggs in a garden. Colorful eggs hidden in bushes and flowers. Spring flowers, bunnies, baskets.',
  'pretparken-peuter-nederland': 'A toddler riding a miniature carousel/merry-go-round in a theme park. Fairy tale castle, balloons, cotton candy cart.',
  'wat-meenemen-speeltuin-checklist': 'A neatly laid out flat-lay of playground essentials: water bottle, sunscreen, snack box, hat, wet wipes, small towel, band-aids. Clean organized grid layout.',
  'zomervakantie-met-peuter': 'A toddler building a sandcastle at a Dutch beach. Beach grass, wooden beach pavilion, seagulls, gentle waves, bucket and spade.'
};

async function generateImage(slug, title, description) {
  const scene = SCENE_MAP[slug] || `A Dutch scene related to: ${title}. ${description ? description + '. ' : ''}Parents with toddlers in a warm, playful setting.`;
  const prompt = `${STYLE_PREFIX}\n\nScene: ${scene}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE']
    }
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          const parts = json.candidates?.[0]?.content?.parts || [];
          const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
          if (!imgPart) { reject(new Error('No image in response')); return; }
          const buffer = Buffer.from(imgPart.inlineData.data, 'base64');
          resolve(buffer);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getAllPostSlugs() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

async function main() {
  const specificSlug = process.argv.find(a => a === '--slug') ? process.argv[process.argv.indexOf('--slug') + 1] : null;
  const allSlugs = specificSlug ? [specificSlug] : await getAllPostSlugs();

  // Filter to only missing images
  const missing = allSlugs.filter(slug => !fs.existsSync(path.join(IMAGES_DIR, `${slug}.jpg`)));
  console.log(`${missing.length} images to generate (${allSlugs.length - missing.length} already exist)`);

  if (missing.length === 0) return;
  if (!API_KEY) { console.error('GEMINI_API_KEY not set — skipping image generation'); return; }
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  for (const slug of missing) {
    const mdPath = path.join(POSTS_DIR, `${slug}.md`);
    const mdContent = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '';
    const titleMatch = mdContent.match(/^title:\s*"?(.+?)"?\s*$/m);
    const title = titleMatch ? titleMatch[1] : slug.replace(/-/g, ' ');
    const descMatch = mdContent.match(/^description:\s*"?(.+?)"?\s*$/m);
    const description = descMatch ? descMatch[1] : '';

    console.log(`Generating: ${slug} — "${title}"`);
    try {
      const buffer = await generateImage(slug, title, description);
      const outPath = path.join(IMAGES_DIR, `${slug}.jpg`);
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
      if (isPng && sharp) {
        await sharp(buffer).jpeg({ quality: 90 }).toFile(outPath);
      } else if (isPng) {
        // Fallback: save as PNG, optimize_images.js will handle conversion
        fs.writeFileSync(path.join(IMAGES_DIR, `${slug}.png`), buffer);
        console.log(`  ⚠ sharp not available, saved as PNG`);
      } else {
        fs.writeFileSync(outPath, buffer);
      }
      console.log(`  ✓ Saved ${outPath} (${Math.round(buffer.length / 1024)}KB)`);

      // Update markdown frontmatter
      if (mdContent && !mdContent.includes('featured_image:')) {
        const updated = mdContent.replace(/^(---\n[\s\S]*?)(---)/, `$1featured_image: /images/blog/${slug}.jpg\n$2`);
        fs.writeFileSync(mdPath, updated);
        console.log(`  ✓ Updated frontmatter: ${mdPath}`);
      }

      // Rate limit: 1 request per 3 seconds
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
      console.error(`  ✗ Failed: ${e.message}`);
      // Wait longer on error (rate limit)
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\nDone! Run: node .scripts/optimize_images.js to generate WebP variants');
}

main().catch(console.error);
