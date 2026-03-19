#!/usr/bin/env node
/**
 * filter-logo-photos.js — Detect and remove logo/graphic og:images
 *
 * Scans scraped photos and flags likely logos based on:
 *   - High percentage of dominant color (>60% of pixels near white/single color)
 *   - Very low entropy (simple graphics, text on solid background)
 *   - Nearly square aspect ratio with low complexity (typical for logos)
 *
 * Flagged images get deleted so the category illustration fallback kicks in.
 *
 * Usage: node .scripts/pipeline/filter-logo-photos.js
 *   DRY_RUN=1 to preview without deleting
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(ROOT, 'images', 'locations');
const DRY_RUN = process.env.DRY_RUN === '1';

async function isLikelyLogo(filePath) {
  try {
    const img = sharp(filePath);
    const meta = await img.metadata();
    const stats = await img.stats();

    // Check 1: Is it nearly square? (logos often are, venue photos rarely)
    const aspectRatio = meta.width / meta.height;
    const isSquarish = aspectRatio > 0.85 && aspectRatio < 1.15;

    // Check 2: High percentage of white/near-white pixels
    // Sample by resizing to tiny image and checking channel means
    const { dominant } = await img.resize(1, 1, { fit: 'cover' }).raw().toBuffer({ resolveWithObject: true })
      .then(({ data }) => ({ dominant: { r: data[0], g: data[1], b: data[2] } }));

    const isVeryBright = dominant.r > 220 && dominant.g > 220 && dominant.b > 220;
    const isVeryDark = dominant.r < 35 && dominant.g < 35 && dominant.b < 35;

    // Check 3: Low color diversity (few unique colors = graphic/logo)
    // Use stats channels — if std deviation is very low, it's uniform
    const avgStdDev = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
    const lowComplexity = avgStdDev < 40;

    // A logo typically: square-ish + (very bright/dark background OR low complexity)
    if (isSquarish && (isVeryBright || isVeryDark)) return { isLogo: true, reason: 'square + solid bg' };
    if (isSquarish && lowComplexity) return { isLogo: true, reason: 'square + low complexity' };
    if (isVeryBright && lowComplexity) return { isLogo: true, reason: 'bright bg + low complexity' };

    return { isLogo: false };
  } catch {
    return { isLogo: false };
  }
}

async function main() {
  console.log(`\nLogo Filter${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // Find all hero.webp files
  const regions = fs.readdirSync(IMAGES_DIR).filter(d =>
    fs.statSync(path.join(IMAGES_DIR, d)).isDirectory()
  );

  let total = 0, flagged = 0;
  const flaggedList = [];

  for (const region of regions) {
    const regionDir = path.join(IMAGES_DIR, region);
    const locs = fs.readdirSync(regionDir).filter(d =>
      fs.statSync(path.join(regionDir, d)).isDirectory()
    );

    for (const loc of locs) {
      const heroPath = path.join(regionDir, loc, 'hero.webp');
      if (!fs.existsSync(heroPath)) continue;
      total++;

      const result = await isLikelyLogo(heroPath);
      if (result.isLogo) {
        flagged++;
        flaggedList.push({ path: `${region}/${loc}`, reason: result.reason });
        console.log(`  LOGO: ${region}/${loc} (${result.reason})`);

        if (!DRY_RUN) {
          // Delete all photo variants for this location
          const locDir = path.join(regionDir, loc);
          for (const file of fs.readdirSync(locDir)) {
            fs.unlinkSync(path.join(locDir, file));
          }
          fs.rmdirSync(locDir);
        }
      }
    }
  }

  console.log(`\nTotal: ${total}, Flagged logos: ${flagged} (${(flagged/total*100).toFixed(1)}%)`);

  if (flaggedList.length > 0) {
    fs.writeFileSync(path.join(ROOT, 'photo-logo-filter-log.json'), JSON.stringify(flaggedList, null, 2));
    console.log('Details saved to photo-logo-filter-log.json');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
