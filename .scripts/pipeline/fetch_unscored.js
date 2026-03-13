#!/usr/bin/env node

/**
 * fetch_unscored.js — Haal onbeoordeelde kandidaten op als JSON
 *
 * Bedoeld voor gebruik vanuit Claude Code: output als JSON zodat
 * agents de kandidaten kunnen onderzoeken via web search.
 *
 * Usage:
 *   node .scripts/pipeline/fetch_unscored.js --region=Utrecht --limit=10
 *   node .scripts/pipeline/fetch_unscored.js --region=Amsterdam --status=needs_review
 *   node .scripts/pipeline/fetch_unscored.js --all --limit=5
 */

const path = require('path');
const { parseArgs, mapToRootRegion } = require('./config');
const { createSupabaseClient } = require('./db');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..', '..');
  const db = createSupabaseClient(projectRoot);

  const limit = Number(args.limit) || 10;
  const statuses = (args.status || 'new,enriched').split(',').map(s => s.trim());
  const region = args.region ? mapToRootRegion(args.region) : null;
  const all = args.all === true || args.all === 'true';

  // Build query
  let query = `location_candidates?select=id,name,amenity,cuisine,website,address,city,region_root,lat,lng,enriched_signals,status&order=id.asc&limit=${limit}`;

  if (statuses.length) {
    query += `&status=in.(${statuses.join(',')})`;
  }

  if (region && !all) {
    query += `&region_root=eq.${encodeURIComponent(region)}`;
  }

  const candidates = await db.rest(query);

  if (!Array.isArray(candidates) || candidates.length === 0) {
    console.error(`Geen kandidaten gevonden (region=${region || 'alle'}, status=${statuses.join(',')})`);
    process.exit(0);
  }

  // Output compact JSON per candidate, one per line for easy parsing
  // Full array for programmatic use
  const output = candidates.map(c => ({
    id: c.id,
    name: c.name,
    amenity: c.amenity,
    cuisine: c.cuisine,
    website: c.website,
    address: c.address,
    city: c.city,
    region: c.region_root,
    lat: c.lat,
    lng: c.lng,
    status: c.status,
    signals: c.enriched_signals || {},
  }));

  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
