/**
 * generate-og-images.js
 *
 * Fase 13 — Social Media Fundament
 *
 * Generates two sets of images per blog post:
 *   - /images/og/blog-{slug}.jpg   (1200×630, OG/Twitter)
 *   - /images/pins/blog-{slug}.jpg (1000×1500, Pinterest vertical)
 *
 * Requires: sharp (already a project dependency)
 * Usage: node .scripts/generate-og-images.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

let sharp, matter;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('sharp is not installed. Run: npm install sharp');
  process.exit(1);
}
try {
  matter = require('gray-matter');
} catch (e) {
  console.error('gray-matter is not installed. Run: npm install gray-matter');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OG_DIR = path.join(ROOT, 'images', 'og');
const PINS_DIR = path.join(ROOT, 'images', 'pins');

// ---------------------------------------------------------------------------
// Brand colours (matches --pp-bg-cream and --pp-primary in design-system.css)
// ---------------------------------------------------------------------------
const COLOR_BG = '#FFF5EB';
const COLOR_PRIMARY = '#D4775A';
const COLOR_WHITE = '#FFFFFF';
const COLOR_TEXT_DARK = '#2D1810';

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

/**
 * Wrap text into lines that fit within `maxWidth` characters (rough estimate).
 * Sharp renders SVG text without line-wrapping, so we do it ourselves.
 */
function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Escape characters that are special in XML/SVG.
 */
function escSvg(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// OG image (1200 × 630) — landscape
// ---------------------------------------------------------------------------
function buildOgSvg(title) {
  const W = 1200;
  const H = 630;
  const bannerH = 240;
  const titleLines = wrapText(title, 36);
  const lineHeight = 58;
  const titleStartY = bannerH / 2 - ((titleLines.length - 1) * lineHeight) / 2;

  const titleSvgLines = titleLines
    .map(
      (line, i) =>
        `<text x="${W / 2}" y="${titleStartY + i * lineHeight}" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700" fill="${COLOR_WHITE}">${escSvg(line)}</text>`
    )
    .join('\n');

  const brandingY = H - 52;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <!-- cream background -->
  <rect width="${W}" height="${H}" fill="${COLOR_BG}"/>

  <!-- primary banner at the top -->
  <rect x="0" y="0" width="${W}" height="${bannerH}" fill="${COLOR_PRIMARY}"/>

  <!-- title text on banner -->
  ${titleSvgLines}

  <!-- decorative accent bar below banner -->
  <rect x="0" y="${bannerH}" width="${W}" height="6" fill="${COLOR_PRIMARY}" opacity="0.25"/>

  <!-- PeuterPlannen branding at bottom -->
  <text x="${W / 2}" y="${brandingY}" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600" fill="${COLOR_PRIMARY}">PeuterPlannen</text>

  <!-- tagline -->
  <text x="${W / 2}" y="${brandingY + 36}" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="20" fill="${COLOR_TEXT_DARK}" opacity="0.6">Leuke uitjes voor kinderen</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Pinterest image (1000 × 1500) — vertical
// ---------------------------------------------------------------------------
function buildPinSvg(title) {
  const W = 1000;
  const H = 1500;
  const bannerH = 380;
  const titleLines = wrapText(title, 28);
  const lineHeight = 64;
  const titleStartY = bannerH / 2 - ((titleLines.length - 1) * lineHeight) / 2;

  const titleSvgLines = titleLines
    .map(
      (line, i) =>
        `<text x="${W / 2}" y="${titleStartY + i * lineHeight}" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="${COLOR_WHITE}">${escSvg(line)}</text>`
    )
    .join('\n');

  const midY = bannerH + (H - bannerH) / 2;
  const brandingY = H - 90;

  // decorative circles for visual interest in the cream area
  const decorCircles = [
    { cx: 120, cy: midY - 120, r: 80, opacity: 0.07 },
    { cx: W - 140, cy: midY + 80, r: 110, opacity: 0.06 },
    { cx: W / 2, cy: midY - 20, r: 50, opacity: 0.05 },
  ]
    .map(
      ({ cx, cy, r, opacity }) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${COLOR_PRIMARY}" opacity="${opacity}"/>`
    )
    .join('\n');

  // sub-tagline positioned in the cream area
  const taglineY = midY - 80;
  const ctaY = midY + 60;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <!-- cream background -->
  <rect width="${W}" height="${H}" fill="${COLOR_BG}"/>

  <!-- decorative shapes in cream area -->
  ${decorCircles}

  <!-- primary banner at the top -->
  <rect x="0" y="0" width="${W}" height="${bannerH}" fill="${COLOR_PRIMARY}"/>

  <!-- accent divider -->
  <rect x="0" y="${bannerH}" width="${W}" height="8" fill="${COLOR_PRIMARY}" opacity="0.2"/>

  <!-- title text on banner -->
  ${titleSvgLines}

  <!-- tagline in cream area -->
  <text x="${W / 2}" y="${taglineY}" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="30" fill="${COLOR_TEXT_DARK}" opacity="0.7">Uitjes voor peuters en kleuters</text>

  <!-- CTA-style text -->
  <rect x="${W / 2 - 180}" y="${ctaY - 34}" width="360" height="56" rx="28" fill="${COLOR_PRIMARY}"/>
  <text x="${W / 2}" y="${ctaY}" text-anchor="middle" dominant-baseline="central"
    font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="600" fill="${COLOR_WHITE}">Lees meer op PeuterPlannen</text>

  <!-- branding at bottom -->
  <text x="${W / 2}" y="${brandingY}" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="${COLOR_PRIMARY}">PeuterPlannen</text>
  <text x="${W / 2}" y="${brandingY + 40}" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="20" fill="${COLOR_TEXT_DARK}" opacity="0.5">peuterplannen.nl</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Ensure output directories exist
  fs.mkdirSync(OG_DIR, { recursive: true });
  fs.mkdirSync(PINS_DIR, { recursive: true });

  if (!fs.existsSync(POSTS_DIR)) {
    console.log(`No posts directory found at ${POSTS_DIR}. Skipping OG image generation.`);
    return;
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('No blog posts found. Skipping OG image generation.');
    return;
  }

  console.log(`Generating OG + Pinterest images for ${files.length} posts…`);

  let ogCount = 0;
  let pinCount = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data: fm } = matter(raw);
    const slug = file.replace(/\.md$/, '');
    const title = fm.title || slug;

    // ----- OG image -----
    const ogOut = path.join(OG_DIR, `blog-${slug}.jpg`);
    try {
      const ogSvg = buildOgSvg(title);
      await sharp(Buffer.from(ogSvg))
        .jpeg({ quality: 85 })
        .toFile(ogOut);
      ogCount++;
    } catch (err) {
      console.error(`  ERROR generating OG image for ${slug}:`, err.message);
    }

    // ----- Pinterest image -----
    const pinOut = path.join(PINS_DIR, `blog-${slug}.jpg`);
    try {
      const pinSvg = buildPinSvg(title);
      await sharp(Buffer.from(pinSvg))
        .jpeg({ quality: 85 })
        .toFile(pinOut);
      pinCount++;
    } catch (err) {
      console.error(`  ERROR generating Pinterest image for ${slug}:`, err.message);
    }

    console.log(`  [OK] ${slug}`);
  }

  console.log(`\nDone. Generated ${ogCount} OG images → images/og/`);
  console.log(`      Generated ${pinCount} Pinterest images → images/pins/`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
