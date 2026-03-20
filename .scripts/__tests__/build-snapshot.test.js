const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SNAPSHOT_PATH = path.join(__dirname, 'snapshots', 'build-hashes.json');

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function collectHashes() {
  const hashes = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(fullPath);
      } else if (entry.name.endsWith('.html')) {
        const relPath = path.relative(ROOT, fullPath);
        // Skip untracked/generated files
        if (relPath.startsWith('.scripts/output/') || relPath === 'mockup-mobile.html') continue;
        hashes[relPath] = hashFile(fullPath);
      }
    }
  };
  walk(ROOT);
  return hashes;
}

describe('Build snapshot', () => {
  it('output matches saved snapshot', () => {
    if (process.env.UPDATE_SNAPSHOTS === '1') {
      const hashes = collectHashes();
      fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(hashes, null, 2));
      console.log(`Snapshot updated: ${Object.keys(hashes).length} files`);
      return;
    }

    if (!fs.existsSync(SNAPSHOT_PATH)) {
      throw new Error('No snapshot found. Run with UPDATE_SNAPSHOTS=1 to create.');
    }

    const expected = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    const actual = collectHashes();

    const expectedFiles = Object.keys(expected);
    const actualFiles = Object.keys(actual);

    // Check for missing files
    const missing = expectedFiles.filter((f) => !actual[f]);
    if (missing.length > 0) {
      assert.fail(`Missing ${missing.length} generated file(s):\n  ${missing.slice(0, 10).join('\n  ')}${missing.length > 10 ? `\n  ... and ${missing.length - 10} more` : ''}`);
    }

    // Check for unexpected new files
    const extra = actualFiles.filter((f) => !expected[f]);
    if (extra.length > 0) {
      assert.fail(`Found ${extra.length} unexpected file(s):\n  ${extra.slice(0, 10).join('\n  ')}${extra.length > 10 ? `\n  ... and ${extra.length - 10} more` : ''}`);
    }

    // Check hashes
    const changed = expectedFiles.filter((f) => actual[f] && actual[f] !== expected[f]);
    if (changed.length > 0) {
      assert.fail(`Hash mismatch for ${changed.length} file(s):\n  ${changed.slice(0, 10).join('\n  ')}${changed.length > 10 ? `\n  ... and ${changed.length - 10} more` : ''}`);
    }
  });
});
