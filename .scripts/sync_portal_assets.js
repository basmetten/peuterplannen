#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// portal-shell.css is now referenced as /portal-shell.css from all portals.
// Only JS files need syncing to subdirectories.
const targets = [
  path.join(ROOT, 'admin', 'portal-shell.js'),
  path.join(ROOT, 'partner', 'portal-shell.js'),
];

const sourceMap = new Map([
  ['portal-shell.js', path.join(ROOT, 'portal-shell.js')],
]);

for (const target of targets) {
  const base = path.basename(target);
  const source = sourceMap.get(base);
  if (!source || !fs.existsSync(source)) {
    throw new Error(`Missing shared portal asset for ${base}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`Synced ${path.relative(ROOT, source)} -> ${path.relative(ROOT, target)}`);
}
