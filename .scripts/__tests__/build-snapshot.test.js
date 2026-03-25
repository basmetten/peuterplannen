const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SNAPSHOT_PATH = path.join(__dirname, 'snapshots', 'build-hashes.json');

function hashFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Normalize cache busters so CI-rebuilt bundles don't cause hash drift
  content = content.replace(/\?v=[0-9a-f-]+/g, '?v=STABLE');
  return crypto.createHash('md5').update(content).digest('hex');
}

function collectHashes() {
  // Only scan git-tracked HTML files to avoid local/CI divergence
  const tracked = execSync('git ls-files -- "*.html"', { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
  const hashes = {};
  for (const relPath of tracked) {
    if (relPath.startsWith('.scripts/output/') || relPath === 'mockup-mobile.html') continue;
    const fullPath = path.join(ROOT, relPath);
    if (fs.existsSync(fullPath)) {
      hashes[relPath] = hashFile(fullPath);
    }
  }
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
