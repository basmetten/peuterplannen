/**
 * PeuterPlannen — Place ID Verificatie Script
 * Zoekt de officiële Google Place ID voor elke locatie
 * en updatet de Supabase database.
 * 
 * Gebruik: node verify_place_ids.js [start_id] [end_id]
 * Bijv:    node verify_place_ids.js 1 20
 */

const GOOGLE_KEY = "AIzaSyAw0UlkShhJ_FQUG1ibkMidUhvEFC23jb4";
const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || require('fs').readFileSync('.supabase_env','utf8').match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1] || '';
const MGMT_URL = "https://api.supabase.com/v1/projects/piujsvgbfflrrvauzsxe/database/query";
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || require('fs').readFileSync('.supabase_env','utf8').match(/SUPABASE_ACCESS_TOKEN=(.+)/)?.[1] || '';

const startId = parseInt(process.argv[2] || 1);
const endId = parseInt(process.argv[3] || 20);

async function findPlaceId(name, region, lat, lng) {
  // Methode 1: Find Place by name + regio
  const query = encodeURIComponent(`${name} ${region} Nederland`);
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name,formatted_address&locationbias=point:${lat},${lng}&key=${GOOGLE_KEY}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
      return {
        place_id: data.candidates[0].place_id,
        found_name: data.candidates[0].name,
        found_address: data.candidates[0].formatted_address,
        method: 'findplacefromtext'
      };
    }
    
    // Methode 2: Nearby Search als fallback
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=200&keyword=${encodeURIComponent(name)}&key=${GOOGLE_KEY}`;
    const nearbyRes = await fetch(nearbyUrl);
    const nearbyData = await nearbyRes.json();
    
    if (nearbyData.status === 'OK' && nearbyData.results && nearbyData.results.length > 0) {
      return {
        place_id: nearbyData.results[0].place_id,
        found_name: nearbyData.results[0].name,
        found_address: nearbyData.results[0].vicinity,
        method: 'nearbysearch'
      };
    }
    
    return null;
  } catch (e) {
    console.error(`  API fout voor ${name}: ${e.message}`);
    return null;
  }
}

async function updatePlaceId(id, placeId, verifiedAt) {
  const res = await fetch(`${SB_URL}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SB_SERVICE_KEY,
      'Authorization': 'Bearer ' + SB_SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      place_id: placeId,
      last_verified_at: verifiedAt
    })
  });
  return res.ok;
}

async function getLocations(startId, endId) {
  const res = await fetch(`${SB_URL}?id=gte.${startId}&id=lte.${endId}&order=id.asc&select=id,name,region,lat,lng,place_id`, {
    headers: {
      'apikey': SB_SERVICE_KEY,
      'Authorization': 'Bearer ' + SB_SERVICE_KEY
    }
  });
  return res.json();
}

async function main() {
  console.log(`\n🔍 PeuterPlannen Place ID Verificatie`);
  console.log(`   Batch: ID ${startId} t/m ${endId}\n`);
  
  const locations = await getLocations(startId, endId);
  console.log(`   ${locations.length} locaties geladen.\n`);
  
  const results = { success: 0, failed: 0, skipped: 0 };
  const now = new Date().toISOString();
  
  for (const loc of locations) {
    // Skip als al geverifieerd (place_id aanwezig)
    if (loc.place_id) {
      console.log(`  ⏭  [${loc.id}] ${loc.name} — al geverifieerd`);
      results.skipped++;
      continue;
    }
    
    process.stdout.write(`  🔎 [${loc.id}] ${loc.name} (${loc.region})... `);
    
    const found = await findPlaceId(loc.name, loc.region, loc.lat, loc.lng);
    
    if (found) {
      // Sanity check: naam moet enigszins overeenkomen
      const nameMatch = found.found_name.toLowerCase().includes(loc.name.toLowerCase().split(' ')[0]) ||
                        loc.name.toLowerCase().includes(found.found_name.toLowerCase().split(' ')[0]);
      
      if (nameMatch || found.method === 'findplacefromtext') {
        const updated = await updatePlaceId(loc.id, found.place_id, now);
        if (updated) {
          console.log(`✅ ${found.place_id.substring(0,20)}... (${found.found_name})`);
          results.success++;
        } else {
          console.log(`❌ DB update mislukt`);
          results.failed++;
        }
      } else {
        console.log(`⚠️  Naam mismatch: gevonden "${found.found_name}" — overgeslagen`);
        results.failed++;
      }
    } else {
      console.log(`❌ Niet gevonden in Google Places`);
      results.failed++;
    }
    
    // Rate limiting: 50ms tussen calls
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log(`\n📊 Resultaat batch ${startId}-${endId}:`);
  console.log(`   ✅ Succesvol: ${results.success}`);
  console.log(`   ❌ Mislukt:   ${results.failed}`);
  console.log(`   ⏭  Overgeslagen: ${results.skipped}\n`);
}

main().catch(console.error);
