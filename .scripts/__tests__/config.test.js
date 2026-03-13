const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  TYPE_MAP,
  TYPE_ORDER,
  TYPE_PAGES,
  TYPE_IMAGES,
  TYPE_LABELS_CITY,
  CLUSTER_PAGES,
  CITY_FAQ,
  NEARBY_CITIES,
} = require('../lib/config');

const EXPECTED_TYPES = ['play', 'farm', 'nature', 'museum', 'culture', 'swim', 'pancake', 'horeca'];

describe('TYPE_MAP', () => {
  it('contains all expected types', () => {
    for (const type of EXPECTED_TYPES) {
      assert.ok(TYPE_MAP[type], `TYPE_MAP missing type: ${type}`);
    }
  });

  it('each entry has label and slug', () => {
    for (const [key, val] of Object.entries(TYPE_MAP)) {
      assert.ok(val.label, `TYPE_MAP[${key}] missing label`);
      assert.ok(val.slug, `TYPE_MAP[${key}] missing slug`);
    }
  });
});

describe('TYPE_ORDER', () => {
  it('contains all types from TYPE_MAP', () => {
    const mapKeys = Object.keys(TYPE_MAP);
    assert.equal(TYPE_ORDER.length, mapKeys.length);
    for (const type of mapKeys) {
      assert.ok(TYPE_ORDER.includes(type), `TYPE_ORDER missing: ${type}`);
    }
  });
});

describe('TYPE_PAGES', () => {
  it('has an entry for each type in TYPE_MAP', () => {
    const pageSlugs = TYPE_PAGES.map((p) => p.dbType);
    for (const type of Object.keys(TYPE_MAP)) {
      assert.ok(pageSlugs.includes(type), `TYPE_PAGES missing dbType: ${type}`);
    }
  });

  it('each entry has required fields', () => {
    for (const page of TYPE_PAGES) {
      assert.ok(page.slug, `TYPE_PAGES entry missing slug`);
      assert.ok(page.dbType, `TYPE_PAGES entry missing dbType`);
      assert.ok(page.title, `TYPE_PAGES entry missing title`);
      assert.ok(page.metaTitle, `TYPE_PAGES entry missing metaTitle`);
      assert.ok(page.metaDesc, `TYPE_PAGES entry missing metaDesc`);
    }
  });
});

describe('TYPE_IMAGES', () => {
  it('has an entry for each type in TYPE_MAP', () => {
    for (const type of Object.keys(TYPE_MAP)) {
      assert.ok(TYPE_IMAGES[type], `TYPE_IMAGES missing: ${type}`);
    }
  });
});

describe('TYPE_LABELS_CITY', () => {
  it('has an entry for each type in TYPE_MAP', () => {
    for (const type of Object.keys(TYPE_MAP)) {
      assert.ok(TYPE_LABELS_CITY[type], `TYPE_LABELS_CITY missing: ${type}`);
    }
  });
});

describe('CLUSTER_PAGES', () => {
  it('has at least 6 entries', () => {
    assert.ok(CLUSTER_PAGES.length >= 6, `Expected >= 6 cluster pages, got ${CLUSTER_PAGES.length}`);
  });

  it('each entry has slug, title, metaTitle, metaDesc', () => {
    for (const page of CLUSTER_PAGES) {
      assert.ok(page.slug, 'CLUSTER_PAGES entry missing slug');
      assert.ok(page.title, 'CLUSTER_PAGES entry missing title');
      assert.ok(page.metaTitle, 'CLUSTER_PAGES entry missing metaTitle');
      assert.ok(page.metaDesc, 'CLUSTER_PAGES entry missing metaDesc');
    }
  });
});

describe('CITY_FAQ', () => {
  it('has entries', () => {
    assert.ok(Object.keys(CITY_FAQ).length > 0);
  });

  it('each entry is an array of {q, a} objects', () => {
    for (const [city, items] of Object.entries(CITY_FAQ)) {
      assert.ok(Array.isArray(items), `CITY_FAQ[${city}] is not an array`);
      for (const item of items) {
        assert.ok(item.q, `CITY_FAQ[${city}] item missing q`);
        assert.ok(item.a, `CITY_FAQ[${city}] item missing a`);
      }
    }
  });
});

describe('NEARBY_CITIES', () => {
  it('has entries', () => {
    assert.ok(Object.keys(NEARBY_CITIES).length > 0);
  });

  it('all referenced slugs exist as keys', () => {
    const allKeys = new Set(Object.keys(NEARBY_CITIES));
    for (const [city, neighbors] of Object.entries(NEARBY_CITIES)) {
      for (const neighbor of neighbors) {
        assert.ok(allKeys.has(neighbor),
          `NEARBY_CITIES[${city}] references "${neighbor}" which is not a key in NEARBY_CITIES`);
      }
    }
  });
});
