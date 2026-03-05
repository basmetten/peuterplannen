#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const targets = [
  path.join(ROOT, 'admin', 'portal-shell.css'),
  path.join(ROOT, 'partner', 'portal-shell.css'),
  path.join(ROOT, 'admin', 'portal-shell.js'),
  path.join(ROOT, 'partner', 'portal-shell.js'),
];

const sourceMap = new Map([
  ['portal-shell.css', path.join(ROOT, 'portal-shell.css')],
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
