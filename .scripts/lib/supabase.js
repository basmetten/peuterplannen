const fs = require('fs');
const path = require('path');
const { SB_URL, SB_KEY, SB_PROJECT } = require('./config');
const { slugify } = require('./helpers');

const FIXTURE_MODE = process.env.PP_FIXTURES === '1';
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

async function fetchJSON(endpoint, query = '') {
  const base = SB_URL.includes('supabase.co') ? SB_URL : SB_PROJECT;
  const url = `${base}/rest/v1/${endpoint}?${query}`;
  const res = await fetch(url, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = new Error(`Supabase fetch ${endpoint} failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function fetchAllJSON(endpoint, query = '', pageSize = 1000) {
  const rows = [];
  let offset = 0;

  while (true) {
    const pageQuery = `${query}${query ? '&' : ''}limit=${pageSize}&offset=${offset}`;
    const page = await fetchJSON(endpoint, pageQuery);
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }

  return rows;
}

// Fallback regions when the DB table doesn't exist yet
const FALLBACK_REGIONS = [
  { name: 'Amsterdam', slug: 'amsterdam', blurb: 'Amsterdam heeft een groot aanbod voor ouders met jonge kinderen. Van het Vondelpark tot NEMO, van de Amsterdamse Bos tot een pannenkoekenbootje op het IJ.', display_order: 1, population: 942000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Rotterdam', slug: 'rotterdam', blurb: 'Rotterdam verrast jonge gezinnen keer op keer. Diergaarde Blijdorp, Villa Zebra, de Pannenkoekenboot en Plaswijckpark zorgen voor een gevuld dagprogramma, binnen en buiten.', display_order: 2, population: 675000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Den Haag', slug: 'den-haag', blurb: 'Den Haag combineert strand, cultuur en natuur op loopafstand van elkaar. Madurodam, het Kunstmuseum, Scheveningen en Westduinpark zijn klassiekers voor een uitje met peuters.', display_order: 3, population: 569000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Utrecht', slug: 'utrecht', blurb: 'Utrecht is een van de kindvriendelijkste steden van Nederland. Het Nijntje Museum, de Griftsteede, het Spoorwegmuseum en tientallen speeltuinen maken de stad ideaal voor een dagje uit met peuters.', display_order: 4, population: 378000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Haarlem', slug: 'haarlem', subtitleLabel: 'Regio Haarlem', blurb: 'Haarlem is compact en groen, fijn voor een relaxt dagje uit met jonge kinderen. Het Teylers Museum, het Reinaldapark en de Kennemerduinen liggen op fietsafstand van het centrum.', display_order: 5, population: 169000, tier: 'standard', schema_type: 'City', is_active: true },
  { name: 'Amersfoort', slug: 'amersfoort', blurb: 'Amersfoort is een gezellige middeleeuwse stad met genoeg te doen voor peuters. Dierenpark Amersfoort, kinderboerderijen en het buitengebied van de Utrechtse Heuvelrug liggen om de hoek.', display_order: 6, population: 164000, tier: 'standard', schema_type: 'City', is_active: true },
  { name: 'Leiden', slug: 'leiden', blurb: 'Leiden is een compacte universiteitsstad met meer te doen voor peuters dan je zou denken. Van Naturalis tot kinderboerderijen en een pannenkoekenrestaurant aan het water.', display_order: 7, population: 130000, tier: 'standard', schema_type: 'City', is_active: true },
  { name: 'Utrechtse Heuvelrug', slug: 'utrechtse-heuvelrug', blurb: 'De Utrechtse Heuvelrug is een schatkamer voor gezinnen met peuters. Kastelen, kinderboerderijen, pannenkoekenrestaurants in het bos en prachtige natuurspeelplaatsen — hier combineer je natuur met avontuur op loopafstand.', display_order: 8, population: 50000, tier: 'region', schema_type: 'AdministrativeArea', is_active: true },
];

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8'));
}

async function fetchData() {
  if (FIXTURE_MODE) {
    console.log('Loading data from fixtures (PP_FIXTURES=1)...\n');
    const regions = loadFixture('regions.json');
    const locations = loadFixture('locations.json');
    const locationAliases = loadFixture('location_aliases.json');
    const editorialPages = loadFixture('editorial_pages.json');
    const gscSnapshots = loadFixture('gsc_snapshots.json');

    console.log(`  ${regions.length} regions, ${locations.length} locations (fixtures)`);

    const regionCounts = {};
    const typeCounts = {};
    for (const loc of locations) {
      regionCounts[loc.region] = (regionCounts[loc.region] || 0) + 1;
      typeCounts[loc.type] = (typeCounts[loc.type] || 0) + 1;
    }

    return { regions, locations, locationAliases, editorialPages, gscSnapshots, regionCounts, typeCounts, total: locations.length };
  }

  console.log('Fetching data from Supabase...\n');

  let regions;
  let locationAliases = [];
  let editorialPages = [];
  let gscSnapshots = [];
  try {
    regions = await fetchJSON('regions', 'select=*&is_active=eq.true&order=display_order');
    console.log(`  ${regions.length} active regions (from DB)`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  regions table not found, using fallback data');
      regions = FALLBACK_REGIONS;
    } else {
      throw err;
    }
  }

  const locations = await fetchAllJSON('locations', 'select=*&order=name');
  console.log(`  ${locations.length} locations\n`);

  try {
    locationAliases = await fetchAllJSON('location_aliases', 'select=*');
    console.log(`  ${locationAliases.length} SEO aliases`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  location_aliases table not found, skipping alias redirects');
    } else {
      throw err;
    }
  }

  try {
    editorialPages = await fetchAllJSON('editorial_pages', 'select=*&status=eq.published&order=updated_at.desc');
    console.log(`  ${editorialPages.length} published editorial pages`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  editorial_pages table not found, using repo seed content only');
    } else {
      throw err;
    }
  }

  try {
    gscSnapshots = await fetchJSON('gsc_snapshots', 'select=*&order=created_at.desc&limit=12');
    console.log(`  ${gscSnapshots.length} GSC snapshots`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  gsc_snapshots table not found, skipping DB telemetry overlay');
    } else {
      throw err;
    }
  }

  // Counts
  const regionCounts = {};
  const typeCounts = {};
  for (const loc of locations) {
    regionCounts[loc.region] = (regionCounts[loc.region] || 0) + 1;
    typeCounts[loc.type] = (typeCounts[loc.type] || 0) + 1;
  }

  return { regions, locations, locationAliases, editorialPages, gscSnapshots, regionCounts, typeCounts, total: locations.length };
}

module.exports = { fetchJSON, fetchAllJSON, fetchData, FALLBACK_REGIONS };
