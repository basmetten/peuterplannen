#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_URL = process.env.SUPABASE_URL || 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUT_FILE = path.join(ROOT, 'output', 'editorial-pages-snapshot.json');

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function api(pathname) {
  const response = await fetch(`${PROJECT_URL}/rest/v1/${pathname}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`${pathname} failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function main() {
  const rows = await api('editorial_pages?select=*&order=page_type.asc,slug.asc');
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ generated_at: new Date().toISOString(), rows }, null, 2));
  console.log(`Exported ${rows.length} editorial pages to ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
