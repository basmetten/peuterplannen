const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  replaceMarker,
  escapeHtml,
  slugify,
  cleanPathLike,
  fullSiteUrl,
  readJsonIfExists,
  parseDateSafe,
  daysSince,
  normalizeExternalUrl,
  normalizeExternalHost,
  displayExternalUrl,
} = require('../lib/helpers');

// --- replaceMarker ---
describe('replaceMarker', () => {
  it('replaces content between markers', () => {
    const input = 'before\n<!-- BEGIN:TEST -->\nold\n<!-- END:TEST -->\nafter';
    const result = replaceMarker(input, 'TEST', 'new');
    assert.equal(result, 'before\n<!-- BEGIN:TEST -->\nnew\n<!-- END:TEST -->\nafter');
  });

  it('works with multiple markers in the same content', () => {
    const input = '<!-- BEGIN:A -->\nold-a\n<!-- END:A -->\nmid\n<!-- BEGIN:B -->\nold-b\n<!-- END:B -->';
    let result = replaceMarker(input, 'A', 'new-a');
    result = replaceMarker(result, 'B', 'new-b');
    assert.match(result, /new-a/);
    assert.match(result, /new-b/);
    assert.ok(!result.includes('old-a'));
    assert.ok(!result.includes('old-b'));
  });

  it('leaves content outside markers unchanged', () => {
    const input = 'keep-this\n<!-- BEGIN:X -->\nreplace\n<!-- END:X -->\nkeep-this-too';
    const result = replaceMarker(input, 'X', 'replaced');
    assert.ok(result.startsWith('keep-this\n'));
    assert.ok(result.endsWith('\nkeep-this-too'));
  });

  it('returns input unchanged when marker is not found', () => {
    const input = 'no markers here';
    const result = replaceMarker(input, 'MISSING', 'new');
    assert.equal(result, input);
  });

  it('works with empty replacement string', () => {
    const input = '<!-- BEGIN:X -->\nold\n<!-- END:X -->';
    const result = replaceMarker(input, 'X', '');
    assert.equal(result, '<!-- BEGIN:X -->\n\n<!-- END:X -->');
  });

  it('works with multiline replacement', () => {
    const input = '<!-- BEGIN:X -->\nold\n<!-- END:X -->';
    const result = replaceMarker(input, 'X', 'line1\nline2\nline3');
    assert.ok(result.includes('line1\nline2\nline3'));
  });
});

// --- escapeHtml ---
describe('escapeHtml', () => {
  it('escapes &, <, >, "', () => {
    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml('<'), '&lt;');
    assert.equal(escapeHtml('>'), '&gt;');
    assert.equal(escapeHtml('"'), '&quot;');
    assert.equal(escapeHtml('<script>"foo" & bar</script>'),
      '&lt;script&gt;&quot;foo&quot; &amp; bar&lt;/script&gt;');
  });

  it('returns empty string for null/undefined/empty', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(''), '');
  });

  it('returns string without special chars unchanged', () => {
    assert.equal(escapeHtml('hello world'), 'hello world');
  });
});

// --- slugify ---
describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    assert.equal(slugify('Den Haag'), 'den-haag');
  });

  it('handles apostrophes and special Dutch names', () => {
    assert.equal(slugify("'s-Hertogenbosch"), 's-hertogenbosch');
  });

  it('preserves hyphens within words', () => {
    assert.equal(slugify('Utrechtse Heuvelrug'), 'utrechtse-heuvelrug');
  });

  it('strips diacritics', () => {
    assert.equal(slugify('café'), 'cafe');
  });

  it('strips leading/trailing hyphens', () => {
    assert.equal(slugify('-test-'), 'test');
  });

  it('collapses multiple separators', () => {
    assert.equal(slugify('a   b'), 'a-b');
    assert.equal(slugify('a---b'), 'a-b');
  });
});

// --- cleanPathLike ---
describe('cleanPathLike', () => {
  it('returns "/" for falsy input', () => {
    assert.equal(cleanPathLike(null), '/');
    assert.equal(cleanPathLike(undefined), '/');
    assert.equal(cleanPathLike(''), '/');
  });

  it('/app → /app.html', () => {
    assert.equal(cleanPathLike('/app'), '/app.html');
  });

  it('/blog → /blog/', () => {
    assert.equal(cleanPathLike('/blog'), '/blog/');
  });

  it('/index.html → /', () => {
    assert.equal(cleanPathLike('/index.html'), '/');
  });

  it('extracts path from full URL', () => {
    const result = cleanPathLike('https://peuterplannen.nl/amsterdam.html');
    assert.equal(result, '/amsterdam.html');
  });

  it('adds trailing slash to extensionless paths', () => {
    const result = cleanPathLike('/some-page');
    assert.equal(result, '/some-page/');
  });

  it('preserves paths with extensions', () => {
    assert.equal(cleanPathLike('/amsterdam.html'), '/amsterdam.html');
  });
});

// --- fullSiteUrl ---
describe('fullSiteUrl', () => {
  it('/ → full URL', () => {
    assert.equal(fullSiteUrl('/'), 'https://peuterplannen.nl/');
  });

  it('path → full URL', () => {
    assert.equal(fullSiteUrl('/amsterdam.html'), 'https://peuterplannen.nl/amsterdam.html');
  });
});

// --- readJsonIfExists ---
describe('readJsonIfExists', () => {
  it('returns null for non-existent file', () => {
    assert.equal(readJsonIfExists('/tmp/definitely-does-not-exist-pp.json'), null);
  });

  it('reads valid JSON file', () => {
    const tmpFile = path.join(os.tmpdir(), 'pp-test-readjson.json');
    fs.writeFileSync(tmpFile, JSON.stringify({ test: true }));
    try {
      const result = readJsonIfExists(tmpFile);
      assert.deepEqual(result, { test: true });
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

// --- parseDateSafe ---
describe('parseDateSafe', () => {
  it('returns null for falsy input', () => {
    assert.equal(parseDateSafe(null), null);
    assert.equal(parseDateSafe(undefined), null);
    assert.equal(parseDateSafe(''), null);
  });

  it('returns null for invalid date', () => {
    assert.equal(parseDateSafe('not-a-date'), null);
  });

  it('parses valid ISO date', () => {
    const d = parseDateSafe('2025-06-15');
    assert.ok(d instanceof Date);
    assert.equal(d.getFullYear(), 2025);
  });
});

// --- daysSince ---
describe('daysSince', () => {
  it('returns Infinity for null', () => {
    assert.equal(daysSince(null), Infinity);
  });

  it('returns Infinity for invalid date', () => {
    assert.equal(daysSince('garbage'), Infinity);
  });

  it('returns 0 for today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = daysSince(today);
    assert.ok(result >= 0 && result <= 1);
  });
});

// --- normalizeExternalUrl ---
describe('normalizeExternalUrl', () => {
  it('returns empty string for falsy input', () => {
    assert.equal(normalizeExternalUrl(''), '');
    assert.equal(normalizeExternalUrl(null), '');
    assert.equal(normalizeExternalUrl(undefined), '');
  });

  it('preserves full https URL', () => {
    assert.equal(normalizeExternalUrl('https://example.com'), 'https://example.com');
  });

  it('preserves full http URL', () => {
    assert.equal(normalizeExternalUrl('http://example.com'), 'http://example.com');
  });

  it('adds https to protocol-relative URL', () => {
    assert.equal(normalizeExternalUrl('//example.com'), 'https://example.com');
  });

  it('adds https to bare domain', () => {
    assert.equal(normalizeExternalUrl('example.com'), 'https://example.com');
  });
});

// --- normalizeExternalHost ---
describe('normalizeExternalHost', () => {
  it('returns empty for falsy input', () => {
    assert.equal(normalizeExternalHost(''), '');
  });

  it('extracts hostname and strips www', () => {
    assert.equal(normalizeExternalHost('https://www.example.com/page'), 'example.com');
  });

  it('lowercases hostname', () => {
    assert.equal(normalizeExternalHost('https://Example.COM'), 'example.com');
  });
});

// --- displayExternalUrl ---
describe('displayExternalUrl', () => {
  it('returns empty for falsy input', () => {
    assert.equal(displayExternalUrl(''), '');
  });

  it('strips protocol and www', () => {
    assert.equal(displayExternalUrl('https://www.example.com/page'), 'example.com/page');
  });

  it('strips trailing slash', () => {
    assert.equal(displayExternalUrl('https://example.com/'), 'example.com');
  });
});
