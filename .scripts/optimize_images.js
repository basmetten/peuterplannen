/**
 * optimize_images.js — Convert images to WebP with responsive sizes
 *
 * Converts hero image to WebP + responsive variants (400w, 800w, 1200w).
 * Converts category icons and blog images to WebP.
 * Keeps originals as fallback.
 *
 * Usage: node .scripts/optimize_images.js
 */
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Note: sharp not installed — image optimization skipped. Run npm install first.');
  process.exit(0);
}

const ROOT = path.resolve(__dirname, '..');

async function optimizeHero() {
  const src = path.join(ROOT, 'homepage_hero_ai.jpeg');
  if (!fs.existsSync(src)) {
    console.log('  Hero image not found, skipping');
    return;
  }

  const sizes = [400, 800, 1200];
  for (const w of sizes) {
    const out = path.join(ROOT, `homepage_hero_ai-${w}w.webp`);
    if (fs.existsSync(out)) continue; // skip if already generated
    await sharp(src)
      .resize(w)
      .webp({ quality: 80 })
      .toFile(out);
    console.log(`  homepage_hero_ai-${w}w.webp`);
  }

  // Full-size WebP
  const fullOut = path.join(ROOT, 'homepage_hero_ai.webp');
  if (!fs.existsSync(fullOut)) {
    await sharp(src)
      .webp({ quality: 80 })
      .toFile(fullOut);
    console.log('  homepage_hero_ai.webp');
  }
}

async function optimizeCategories() {
  const dir = path.join(ROOT, 'images', 'categories');
  if (!fs.existsSync(dir)) {
    console.log('  Categories dir not found, skipping');
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  for (const file of files) {
    const out = path.join(dir, file.replace('.png', '.webp'));
    if (fs.existsSync(out)) continue;
    await sharp(path.join(dir, file))
      .webp({ quality: 80 })
      .toFile(out);
    console.log(`  images/categories/${file.replace('.png', '.webp')}`);
  }
}

async function optimizeBlog() {
  const dir = path.join(ROOT, 'images', 'blog');
  if (!fs.existsSync(dir)) {
    console.log('  Blog images dir not found, skipping');
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));
  for (const file of files) {
    const base = file.replace(/\.jpe?g$/, '');

    // WebP at original size
    const outFull = path.join(dir, `${base}.webp`);
    if (!fs.existsSync(outFull)) {
      await sharp(path.join(dir, file))
        .webp({ quality: 80 })
        .toFile(outFull);
      console.log(`  images/blog/${base}.webp`);
    }

    // Responsive 400w variant
    const out400 = path.join(dir, `${base}-400w.webp`);
    if (!fs.existsSync(out400)) {
      await sharp(path.join(dir, file))
        .resize(400)
        .webp({ quality: 80 })
        .toFile(out400);
      console.log(`  images/blog/${base}-400w.webp`);
    }
  }
}

async function main() {
  console.log('=== Image optimization ===\n');

  console.log('Hero image...');
  await optimizeHero();

  console.log('Category icons...');
  await optimizeCategories();

  console.log('Blog images...');
  await optimizeBlog();

  console.log('\nImage optimization complete.');
}

main().catch(err => { console.error('Image optimization error:', err); process.exit(1); });
