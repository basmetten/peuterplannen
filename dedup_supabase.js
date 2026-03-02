const fs = require('fs');
const env = fs.readFileSync('.supabase_env', 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_BASE = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';
const hdrs = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };

async function main() {
  const res = await fetch(SB_BASE + '?select=id,name,region&order=id', { headers: hdrs });
  const data = await res.json();
  const groups = {};
  for (const r of data) {
    const key = (r.name + '|' + r.region).toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(r.id);
  }
  const toDelete = [];
  for (const ids of Object.values(groups)) {
    if (ids.length > 1) toDelete.push(...ids.slice(1));
  }
  console.log('Entries to delete:', toDelete.length);
  if (toDelete.length === 0) { console.log('Nothing to do.'); return; }
  let deleted = 0;
  for (const id of toDelete) {
    const dr = await fetch(SB_BASE + '?id=eq.' + id, { method: 'DELETE', headers: hdrs });
    if (dr.ok) deleted++;
    else console.log('FAILED delete id', id, dr.status, await dr.text());
  }
  console.log('Deleted:', deleted, 'duplicates');
}
main().catch(console.error);
