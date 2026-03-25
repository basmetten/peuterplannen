import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..', '..', '..');

const {
  escapeHtml,
  safeUrl,
  cleanToddlerHighlight,
  comparableText,
  isNearDuplicateCopy,
  getCardSupportingCopy,
  calculateDistance,
  calculateTravelTimes,
  slugify,
  buildDetailUrl,
  buildMapsUrl,
} = await import(resolve(rootDir, 'modules', 'utils.js'));

// === escapeHtml ===
describe('escapeHtml', () => {
  it('escapes all five HTML special characters', () => {
    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml('<'), '&lt;');
    assert.equal(escapeHtml('>'), '&gt;');
    assert.equal(escapeHtml('"'), '&quot;');
    assert.equal(escapeHtml("'"), '&#039;');
  });

  it('escapes a mixed string', () => {
    assert.equal(
      escapeHtml('<script>alert("xss" & \'more\')</script>'),
      '&lt;script&gt;alert(&quot;xss&quot; &amp; &#039;more&#039;)&lt;/script&gt;'
    );
  });

  it('returns empty string for falsy values', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(''), '');
    assert.equal(escapeHtml(0), '');
  });

  it('passes through safe strings unchanged', () => {
    assert.equal(escapeHtml('hello world'), 'hello world');
    assert.equal(escapeHtml('abc 123'), 'abc 123');
  });
});

// === safeUrl ===
describe('safeUrl', () => {
  it('allows http and https URLs', () => {
    assert.equal(safeUrl('https://example.com'), 'https://example.com');
    assert.equal(safeUrl('http://example.com/path'), 'http://example.com/path');
  });

  it('rejects javascript: protocol', () => {
    assert.equal(safeUrl('javascript:alert(1)'), null);
  });

  it('rejects data: protocol', () => {
    assert.equal(safeUrl('data:text/html,<h1>hi</h1>'), null);
  });

  it('rejects ftp: protocol', () => {
    assert.equal(safeUrl('ftp://files.example.com'), null);
  });

  it('returns null for falsy/empty input', () => {
    assert.equal(safeUrl(null), null);
    assert.equal(safeUrl(undefined), null);
    assert.equal(safeUrl(''), null);
  });

  it('returns null for dash placeholder', () => {
    assert.equal(safeUrl('-'), null);
  });

  it('returns null for invalid URLs', () => {
    assert.equal(safeUrl('not a url'), null);
    assert.equal(safeUrl('://broken'), null);
  });
});

// === cleanToddlerHighlight ===
describe('cleanToddlerHighlight', () => {
  it('collapses whitespace to single space', () => {
    assert.equal(cleanToddlerHighlight('hello   world'), 'hello world');
  });

  it('replaces bullet characters with spaced middot', () => {
    // •/· are replaced with ' · ', original surrounding spaces remain then collapse
    const result = cleanToddlerHighlight('a•b·c');
    assert.equal(result, 'a · b · c');
  });

  it('replaces pipe and slash separators', () => {
    assert.equal(cleanToddlerHighlight('indoor | outdoor'), 'indoor · outdoor');
    assert.equal(cleanToddlerHighlight('indoor / outdoor'), 'indoor · outdoor');
  });

  it('replaces hyphens with middot', () => {
    assert.equal(cleanToddlerHighlight('fun - educational'), 'fun · educational');
  });

  it('strips promotional words', () => {
    const result = cleanToddlerHighlight('Ideaal voor peuters - superleuk');
    assert.ok(!result.toLowerCase().includes('ideaal'));
    assert.ok(!result.toLowerCase().includes('superleuk'));
  });

  it('deduplicates consecutive middots', () => {
    assert.equal(cleanToddlerHighlight('a · · · b'), 'a · b');
  });

  it('strips leading/trailing middots', () => {
    assert.equal(cleanToddlerHighlight(' · hello · '), 'hello');
  });

  it('returns empty string for falsy input', () => {
    assert.equal(cleanToddlerHighlight(null), '');
    assert.equal(cleanToddlerHighlight(undefined), '');
    assert.equal(cleanToddlerHighlight(''), '');
  });

  it('fixes space before punctuation', () => {
    assert.equal(cleanToddlerHighlight('great !'), 'great!');
  });
});

// === comparableText ===
describe('comparableText', () => {
  it('lowercases text', () => {
    assert.equal(comparableText('Hello World'), 'hello world');
  });

  it('strips diacritics', () => {
    assert.equal(comparableText('café résumé'), 'cafe resume');
  });

  it('replaces special chars with space', () => {
    assert.equal(comparableText('hello-world!'), 'hello world');
  });

  it('collapses whitespace', () => {
    assert.equal(comparableText('a   b   c'), 'a b c');
  });

  it('returns empty string for falsy input', () => {
    assert.equal(comparableText(null), '');
    assert.equal(comparableText(''), '');
  });
});

// === isNearDuplicateCopy ===
describe('isNearDuplicateCopy', () => {
  it('returns true for identical text', () => {
    assert.equal(isNearDuplicateCopy('hello world', 'hello world'), true);
  });

  it('returns true for case-different text', () => {
    assert.equal(isNearDuplicateCopy('Hello World', 'hello world'), true);
  });

  it('returns false for completely different text', () => {
    assert.equal(isNearDuplicateCopy('cats and dogs', 'sun and moon'), false);
  });

  it('returns true when one contains the other (long text)', () => {
    const short = 'a wonderful playground with many activities';
    const long = 'a wonderful playground with many activities for toddlers and kids';
    assert.equal(isNearDuplicateCopy(short, long), true);
  });

  it('returns false for empty/falsy input', () => {
    assert.equal(isNearDuplicateCopy('', 'hello'), false);
    assert.equal(isNearDuplicateCopy(null, 'hello'), false);
  });

  it('detects high word overlap as duplicate', () => {
    assert.equal(
      isNearDuplicateCopy('great fun for kids at the park', 'great fun for kids in the park'),
      true
    );
  });
});

// === calculateDistance (Haversine) ===
describe('calculateDistance', () => {
  // Known city pairs with approximate distances
  it('Amsterdam to Rotterdam ~ 57 km', () => {
    const dist = calculateDistance(52.3676, 4.9041, 51.9225, 4.4792);
    assert.ok(dist > 55 && dist < 60, `Expected ~57 km, got ${dist.toFixed(1)} km`);
  });

  it('Amsterdam to Utrecht ~ 36 km', () => {
    const dist = calculateDistance(52.3676, 4.9041, 52.0907, 5.1214);
    assert.ok(dist > 33 && dist < 39, `Expected ~36 km, got ${dist.toFixed(1)} km`);
  });

  it('Amsterdam to Den Haag ~ 51 km', () => {
    const dist = calculateDistance(52.3676, 4.9041, 52.0705, 4.3007);
    assert.ok(dist > 48 && dist < 54, `Expected ~51 km, got ${dist.toFixed(1)} km`);
  });

  it('same point returns 0', () => {
    const dist = calculateDistance(52.3676, 4.9041, 52.3676, 4.9041);
    assert.equal(dist, 0);
  });

  it('Amsterdam to London ~ 358 km', () => {
    const dist = calculateDistance(52.3676, 4.9041, 51.5074, -0.1278);
    assert.ok(dist > 350 && dist < 370, `Expected ~358 km, got ${dist.toFixed(1)} km`);
  });

  it('returns positive distance regardless of argument order', () => {
    const d1 = calculateDistance(52.3676, 4.9041, 51.9225, 4.4792);
    const d2 = calculateDistance(51.9225, 4.4792, 52.3676, 4.9041);
    assert.ok(Math.abs(d1 - d2) < 0.001, 'Distance should be symmetric');
  });
});

// === calculateTravelTimes ===
describe('calculateTravelTimes', () => {
  const userLoc = { lat: 52.3676, lng: 4.9041 }; // Amsterdam

  it('returns empty object when userLocation is null', () => {
    const result = calculateTravelTimes(null, [{ id: 1, lat: 52, lng: 5 }]);
    assert.deepEqual(result, {});
  });

  it('returns empty object when destinations is empty', () => {
    const result = calculateTravelTimes(userLoc, []);
    assert.deepEqual(result, {});
  });

  it('calculates travel time for a nearby destination', () => {
    // ~5 km away
    const dest = [{ id: 'artis', lat: 52.3660, lng: 4.9163 }];
    const result = calculateTravelTimes(userLoc, dest);
    assert.ok(result['artis'], 'Should have result for artis');
    assert.ok(result['artis'].duration.includes('min'), 'Duration should contain "min"');
    assert.ok(result['artis'].distanceKm < 2, 'Should be less than 2 km');
    assert.ok(result['artis'].distance.includes('m'), 'Short distance should be in meters');
  });

  it('formats long distances in km', () => {
    // Rotterdam, ~57 km
    const dest = [{ id: 'rotterdam', lat: 51.9225, lng: 4.4792 }];
    const result = calculateTravelTimes(userLoc, dest);
    assert.ok(result['rotterdam'].distance.includes('km'), 'Should show km for long distance');
    assert.ok(result['rotterdam'].distanceKm > 50);
  });

  it('formats long durations with hours', () => {
    // Very far destination to get >60 min driving
    const dest = [{ id: 'far', lat: 53.2, lng: 6.5 }]; // ~Groningen area
    const result = calculateTravelTimes(userLoc, dest);
    const dur = result['far'].duration;
    assert.ok(dur.includes('u'), `Long duration should use "u" for hours, got: ${dur}`);
  });

  it('skips destinations without lat/lng', () => {
    const dest = [
      { id: 'valid', lat: 52.09, lng: 5.12 },
      { id: 'invalid', lat: null, lng: null },
    ];
    const result = calculateTravelTimes(userLoc, dest);
    assert.ok(result['valid'], 'Valid destination should be included');
    assert.equal(result['invalid'], undefined, 'Invalid destination should be skipped');
  });

  it('durationValue is in seconds', () => {
    const dest = [{ id: 'test', lat: 52.09, lng: 5.12 }];
    const result = calculateTravelTimes(userLoc, dest);
    // durationValue = mins * 60, so should be a reasonable number of seconds
    assert.ok(result['test'].durationValue > 0);
    assert.ok(result['test'].durationValue % 60 === 0, 'Should be a multiple of 60');
  });
});

// === slugify ===
describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    assert.equal(slugify('Den Haag'), 'den-haag');
  });

  it('strips diacritics', () => {
    assert.equal(slugify('café'), 'cafe');
  });

  it('handles apostrophes', () => {
    assert.equal(slugify("'s-Hertogenbosch"), 's-hertogenbosch');
  });

  it('collapses multiple separators', () => {
    assert.equal(slugify('a   b'), 'a-b');
    assert.equal(slugify('a---b'), 'a-b');
  });

  it('strips leading/trailing hyphens', () => {
    assert.equal(slugify('-test-'), 'test');
  });

  it('returns empty string for falsy input', () => {
    assert.equal(slugify(null), '');
    assert.equal(slugify(undefined), '');
    assert.equal(slugify(''), '');
  });
});

// === buildDetailUrl ===
describe('buildDetailUrl', () => {
  it('builds a valid detail URL', () => {
    const url = buildDetailUrl({ region: 'Amsterdam', name: 'Artis Zoo' });
    assert.equal(url, '/amsterdam/artis-zoo/');
  });

  it('returns null when region is missing', () => {
    assert.equal(buildDetailUrl({ name: 'Artis Zoo' }), null);
    assert.equal(buildDetailUrl({ region: '', name: 'Artis Zoo' }), null);
  });

  it('handles Dutch names with special characters', () => {
    const url = buildDetailUrl({ region: 'Den Haag', name: "Madurodam's Park" });
    assert.equal(url, '/den-haag/madurodams-park/');
  });

  it('strips diacritics', () => {
    const url = buildDetailUrl({ region: 'Café Region', name: 'Résumé Place' });
    assert.equal(url, '/cafe-region/resume-place/');
  });

  it('handles straight apostrophes (single quotes)', () => {
    // The function strips '' (straight single quotes)
    const url = buildDetailUrl({ region: 'Amsterdam', name: "'s Gravenhage" });
    assert.equal(url, '/amsterdam/s-gravenhage/');
  });
});

// === buildMapsUrl ===
describe('buildMapsUrl', () => {
  it('uses place_id when available', () => {
    const url = buildMapsUrl({ name: 'Artis', place_id: 'ChIJ_abc123' });
    assert.ok(url.includes('query_place_id=ChIJ_abc123'));
    assert.ok(url.includes('query=Artis'));
  });

  it('falls back to lat/lng with region', () => {
    const url = buildMapsUrl({ name: 'Artis', lat: 52.366, lng: 4.916, region: 'Amsterdam' });
    assert.ok(url.includes('query=Artis'));
    assert.ok(url.includes('Amsterdam'));
    assert.ok(!url.includes('query_place_id'));
  });

  it('falls back to name-only search', () => {
    const url = buildMapsUrl({ name: 'Some Place' });
    assert.ok(url.includes('query=Some'));
    assert.ok(url.startsWith('https://www.google.com/maps/search/'));
  });

  it('encodes special characters in name', () => {
    const url = buildMapsUrl({ name: 'Café & Bar' });
    assert.ok(url.includes('Caf%C3%A9'));
    assert.ok(url.includes('%26'));
  });
});

// === getCardSupportingCopy ===
describe('getCardSupportingCopy', () => {
  it('returns highlight when short and unique from description', () => {
    const result = getCardSupportingCopy({
      description: 'A zoo with many animals',
      toddler_highlight: 'Speeltuin en Dieren',
    });
    assert.equal(result, 'Speeltuin en Dieren');
  });

  it('deduplicates when description and highlight are near-identical', () => {
    const text = 'A wonderful playground for toddlers with great facilities';
    const result = getCardSupportingCopy({
      description: text,
      toddler_highlight: text,
    });
    // Should return the shorter or same, not both
    assert.equal(result, text);
  });

  it('returns description when highlight is empty', () => {
    const result = getCardSupportingCopy({
      description: 'Nice park',
      toddler_highlight: '',
    });
    assert.equal(result, 'Nice park');
  });

  it('returns empty string when both are empty', () => {
    const result = getCardSupportingCopy({ description: '', toddler_highlight: '' });
    assert.equal(result, '');
  });

  it('returns description when highlight is too long and unique', () => {
    const longHighlight = 'A'.repeat(150);
    const result = getCardSupportingCopy({
      description: 'Short desc',
      toddler_highlight: longHighlight,
    });
    assert.equal(result, 'Short desc');
  });
});
