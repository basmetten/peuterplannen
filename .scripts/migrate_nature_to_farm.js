/**
 * migrate_nature_to_farm.js — One-time migration script
 *
 * Splits kinderboerderij-type locations from 'nature' to new 'farm' category.
 * Matches on name/description containing farm-related keywords.
 *
 * Usage: SUPABASE_SERVICE_KEY=your_key node .scripts/migrate_nature_to_farm.js [--dry-run]
 *
 * IMPORTANT: Requires the Supabase SERVICE ROLE key (not anon key).
 * The anon key cannot update rows due to RLS policies.
 */

const SB_PROJECT = 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SB_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required.');
  console.error('Usage: SUPABASE_SERVICE_KEY=your_key node .scripts/migrate_nature_to_farm.js [--dry-run]');
  process.exit(1);
}

const FARM_KEYWORDS = [
  'kinderboerderij', 'stadsboerderij', 'boerderij', 'dierenweide',
  'dierenpark', 'hertenkamp', 'dierentuin', 'speelboerderij',
  'zorgboerderij', 'educatieboerderij'
];

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`=== Nature → Farm Migration ${dryRun ? '(DRY RUN)' : ''} ===\n`);

  // Fetch all nature locations
  const url = `${SB_PROJECT}/rest/v1/locations?type=eq.nature&select=id,name,description,region`;
  const res = await fetch(url, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const locations = await res.json();
  console.log(`Found ${locations.length} nature locations\n`);

  // Filter for farm-related locations
  const toMigrate = locations.filter(loc => {
    const text = `${loc.name} ${loc.description || ''}`.toLowerCase();
    return FARM_KEYWORDS.some(kw => text.includes(kw));
  });

  console.log(`Matched ${toMigrate.length} locations for migration to 'farm':\n`);
  toMigrate.forEach(loc => {
    console.log(`  [${loc.region}] ${loc.name} (id: ${loc.id})`);
  });

  if (toMigrate.length === 0) {
    console.log('\nNo locations to migrate.');
    return;
  }

  if (dryRun) {
    console.log('\n(Dry run — no changes made. Remove --dry-run to execute.)');
    return;
  }

  // Update each location
  let success = 0;
  let failed = 0;
  for (const loc of toMigrate) {
    const updateUrl = `${SB_PROJECT}/rest/v1/locations?id=eq.${loc.id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ type: 'farm' })
    });
    if (updateRes.ok) {
      success++;
    } else {
      failed++;
      console.error(`  FAILED: ${loc.name} (${updateRes.status})`);
    }
  }

  console.log(`\nMigration complete: ${success} updated, ${failed} failed`);

  // Verify counts
  const verifyNature = await fetch(`${SB_PROJECT}/rest/v1/locations?type=eq.nature&select=id`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Prefer': 'count=exact' }
  });
  const verifyFarm = await fetch(`${SB_PROJECT}/rest/v1/locations?type=eq.farm&select=id`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Prefer': 'count=exact' }
  });
  console.log(`\nPost-migration counts:`);
  console.log(`  nature: ${verifyNature.headers.get('content-range')}`);
  console.log(`  farm: ${verifyFarm.headers.get('content-range')}`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
