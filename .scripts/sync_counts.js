/**
 * sync_counts.js
 * Fetches live counts from Supabase and updates all hardcoded numbers
 * across app.html, index.html, about.html, manifest.json, and noscript blocks.
 * Then re-runs city & type page generators if .supabase_env exists.
 *
 * Usage: node .scripts/sync_counts.js
 *
 * This script is idempotent — run it after any dataset change.
 */
const fs = require('fs');
const path = require('path');

const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';
const SB_KEY = atob('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CcGRXcHpkbWRpWm1ac2NuSjJZWFY2YzNobElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJd05ETXhOekFzSW1WNGNDSTZNakE0TnpZeE9URTNNSDAuNXkzZ3FpUGZWdnB2ZmFEWUFfUGdxRS1LVHZ1ZjZ6Z042dkd6cWZVcGVTbw==');

function atob(b64) { return Buffer.from(b64, 'base64').toString('utf8'); }

const ROOT = path.resolve(__dirname, '..');

const TYPE_MAP = {
  play: 'Speeltuinen',
  nature: 'Natuur',
  museum: 'Musea',
  horeca: 'Restaurants',
  pancake: 'Pannenkoeken',
};

const CITY_NAMES = {
  'Amsterdam': 'amsterdam',
  'Utrecht': 'utrecht',
  'Rotterdam': 'rotterdam',
  'Den Haag': 'den-haag',
  'Haarlem': 'haarlem',
  'Leiden': 'leiden',
  'Utrechtse Heuvelrug': 'utrechtse-heuvelrug',
};

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [pattern, replacement] of replacements) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(escapeRegex(pattern), 'g');
    const newContent = content.replace(regex, replacement);
    if (newContent !== content) changed = true;
    content = newContent;
  }
  if (changed) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  console.log('Syncing location counts from Supabase...\n');

  // Fetch all locations
  const res = await fetch(`${SB_URL}?select=id,type,region&order=id`, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
  const locations = await res.json();
  const total = locations.length;

  // Count by type
  const typeCounts = {};
  for (const loc of locations) {
    typeCounts[loc.type] = (typeCounts[loc.type] || 0) + 1;
  }

  // Count by region
  const regionCounts = {};
  for (const loc of locations) {
    regionCounts[loc.region] = (regionCounts[loc.region] || 0) + 1;
  }

  console.log(`Total: ${total} locations`);
  console.log(`By type:`, typeCounts);
  console.log(`By region:`, regionCounts);
  console.log('');

  // === 1. app.html ===
  const appPath = path.join(ROOT, 'app.html');
  if (fs.existsSync(appPath)) {
    const updates = [
      // Meta description: "273 geverifieerde plekken"
      [/\d+ geverifieerde plekken/g, `${total} geverifieerde plekken`],
      // JSON-LD description: "239 kindvriendelijke locaties"
      [/\d+ kindvriendelijke locaties/g, `${total} kindvriendelijke locaties`],
      // Noscript paragraph: "195 geverifieerde uitjes"
      [/\d+ geverifieerde uitjes voor gezinnen/g, `${total} geverifieerde uitjes voor gezinnen`],
      // Info stats panel: "195+" or any number
      [/(<div class="info-stat">\s*<strong>)\d+\+?(<\/strong>\s*<span>Locaties<\/span>)/g, `$1${total}+$2`],
    ];

    // Noscript city counts
    for (const [region, slug] of Object.entries(CITY_NAMES)) {
      const count = regionCounts[region] || 0;
      updates.push([
        new RegExp(`(${slug}\\.html">\\s*${escapeRegex(region)}\\s*\\()\\d+( locaties\\))`, 'g'),
        `$1${count}$2`
      ]);
    }

    if (replaceInFile(appPath, updates)) {
      console.log(`Updated app.html (total: ${total})`);
    } else {
      console.log('app.html — no changes needed');
    }
  }

  // === 2. index.html ===
  const indexPath = path.join(ROOT, 'index.html');
  if (fs.existsSync(indexPath)) {
    const updates = [];

    // Type counts: "<strong>Speeltuinen</strong>\n<span>73 locaties</span>"
    for (const [type, label] of Object.entries(TYPE_MAP)) {
      const count = typeCounts[type] || 0;
      updates.push([
        new RegExp(`(<strong>${escapeRegex(label)}</strong>\\s*<span>)\\d+( locaties</span>)`, 'g'),
        `$1${count}$2`
      ]);
    }

    // City counts: "<strong>Amsterdam</strong>\n<span>64 locaties</span>"
    for (const [region] of Object.entries(CITY_NAMES)) {
      const count = regionCounts[region] || 0;
      updates.push([
        new RegExp(`(<strong>${escapeRegex(region)}</strong>\\s*<span>)\\d+( locaties</span>)`, 'g'),
        `$1${count}$2`
      ]);
    }

    if (replaceInFile(indexPath, updates)) {
      console.log(`Updated index.html (types + cities)`);
    } else {
      console.log('index.html — no changes needed');
    }
  }

  // === 3. about.html ===
  const aboutPath = path.join(ROOT, 'about.html');
  if (fs.existsSync(aboutPath)) {
    const updates = [
      // Meta description
      [/\d+\+?\s*geverifieerde locaties in \d+ regio/g, `${total}+ geverifieerde locaties in ${Object.keys(regionCounts).length} regio`],
      // Stats display: "<strong>273+</strong>" before "<span>Locaties"
      [/(<strong>)\d+\+?(<\/strong>\s*<span>Locaties)/g, `$1${total}+$2`],
    ];

    if (replaceInFile(aboutPath, updates)) {
      console.log(`Updated about.html (total: ${total}+)`);
    } else {
      console.log('about.html — no changes needed');
    }
  }

  // === 4. manifest.json ===
  const manifestPath = path.join(ROOT, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const updates = [
      [/\d+ geverifieerde locaties/g, `${total} geverifieerde locaties`],
    ];

    if (replaceInFile(manifestPath, updates)) {
      console.log(`Updated manifest.json (total: ${total})`);
    } else {
      console.log('manifest.json — no changes needed');
    }
  }

  // === 5. Re-run city & type page generators ===
  const envPath = path.join(ROOT, '.supabase_env');
  if (fs.existsSync(envPath)) {
    console.log('\nRe-generating city & type pages...');
    const { execSync } = require('child_process');
    try {
      execSync('node .scripts/generate_city_pages.js', { cwd: ROOT, stdio: 'inherit' });
      execSync('node .scripts/generate_type_pages.js', { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      console.warn('Generator warning:', e.message);
    }
  } else {
    console.log('\nSkipping city/type page generation (.supabase_env not found).');
    console.log('To regenerate those pages, create .supabase_env with SUPABASE_SERVICE_KEY=...');
  }

  console.log('\nDone! Review changes with: git diff');
  console.log('Commit with: git add -A && git commit -m "Sync location counts"');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
