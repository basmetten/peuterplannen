#!/usr/bin/env node
/**
 * audit_design_system.js — Automated design system consistency checks.
 * Run after build to catch regressions before deploy.
 *
 * Usage: node .scripts/audit_design_system.js [--strict]
 * In --strict mode, warnings become errors (non-zero exit).
 */

const fs = require('fs');
const path = require('path');

const STRICT = process.argv.includes('--strict');
let warnings = 0;
let errors = 0;

function warn(msg) {
  warnings++;
  console.log(`  ⚠  ${msg}`);
}
function error(msg) {
  errors++;
  console.log(`  ✗  ${msg}`);
}
function pass(msg) {
  console.log(`  ✓  ${msg}`);
}

console.log('\n=== Design System Audit ===\n');

// 1. Font file count
const fontDir = path.join(__dirname, '..', 'fonts');
const woff2Files = fs.readdirSync(fontDir).filter(f => f.endsWith('.woff2'));
if (woff2Files.length >= 3 && woff2Files.length <= 4) {
  pass(`Font files: ${woff2Files.length} WOFF2 files`);
} else {
  error(`Font files: ${woff2Files.length} WOFF2 files (expected 3-4): ${woff2Files.join(', ')}`);
}

// 2. No hardcoded legacy font references in CSS/JS
const legacyFontPattern = /Familjen Grotesk/gi;
const srcFiles = [];
function collectFiles(dir, exts) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'output'].includes(entry.name)) {
      collectFiles(full, exts);
    } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e)) && entry.name !== 'audit_design_system.js') {
      srcFiles.push(full);
    }
  }
}
collectFiles(path.join(__dirname, '..'), ['.css', '.js']);

let legacyFontHits = 0;
for (const f of srcFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(legacyFontPattern);
  if (matches) {
    legacyFontHits += matches.length;
    warn(`Legacy font reference in ${path.relative(path.join(__dirname, '..'), f)}: ${matches.length} occurrence(s)`);
  }
}
if (legacyFontHits === 0) {
  pass('No legacy font references (Familjen Grotesk)');
}

// 3. pp-interactions.js is referenced in generated HTML
const samplePages = [
  path.join(__dirname, '..', 'amsterdam.html'),
  path.join(__dirname, '..', 'utrecht.html'),
];
let interactionsLoaded = false;
for (const p of samplePages) {
  if (fs.existsSync(p)) {
    const html = fs.readFileSync(p, 'utf8');
    if (html.includes('pp-interactions.js')) {
      interactionsLoaded = true;
      break;
    }
  }
}
if (interactionsLoaded) {
  pass('pp-interactions.js is loaded in generated pages');
} else {
  warn('pp-interactions.js not found in sample generated pages');
}

// 4. design-system.css is loaded before style.css
for (const p of samplePages) {
  if (fs.existsSync(p)) {
    const html = fs.readFileSync(p, 'utf8');
    const dsPos = html.indexOf('design-system.css');
    const stylePos = html.indexOf('style.min.css');
    if (dsPos > -1 && stylePos > -1 && dsPos < stylePos) {
      pass('design-system.css loads before style.min.css');
    } else if (dsPos === -1) {
      error('design-system.css not found in generated page');
    } else if (dsPos > stylePos) {
      error('design-system.css loads AFTER style.min.css — should be before');
    }
    break;
  }
}

// 5. Variable font preloads present
for (const p of samplePages) {
  if (fs.existsSync(p)) {
    const html = fs.readFileSync(p, 'utf8');
    const hasNewsreader = html.includes('newsreader-var.woff2');
    const hasJakarta = html.includes('plus-jakarta-sans-var.woff2');
    if (hasNewsreader && hasJakarta) {
      pass('Variable font preloads present (Newsreader + Plus Jakarta Sans)');
    } else {
      warn(`Missing font preloads: Newsreader=${hasNewsreader}, Plus Jakarta Sans=${hasJakarta}`);
    }
    break;
  }
}

// 6. No hardcoded hex colors in inline styles of generated HTML
const htmlFiles = [];
function collectHtml(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'output', '.scripts', 'admin', 'partner'].includes(entry.name)) {
      collectHtml(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(full);
    }
  }
}
collectHtml(path.join(__dirname, '..'));
const hexInStylePattern = /style="[^"]*#[0-9a-fA-F]{3,6}[^0-9a-fA-F]/g;
let hexInStyleCount = 0;
const hexExamples = [];
for (const f of htmlFiles.slice(0, 200)) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(hexInStylePattern);
  if (matches) {
    hexInStyleCount += matches.length;
    if (hexExamples.length < 3) {
      hexExamples.push(`${path.relative(path.join(__dirname, '..'), f)}: ${matches[0].substring(0, 60)}`);
    }
  }
}
if (hexInStyleCount === 0) {
  pass('No hardcoded hex colors in inline styles');
} else {
  warn(`${hexInStyleCount} hardcoded hex color(s) in inline styles of generated HTML`);
  hexExamples.forEach(ex => console.log(`       ${ex}`));
}

// 7. No hardcoded font names in inline styles (excluding email templates)
// Matches font-family with literal font names like 'Arial', "DM Sans", etc.
// Allows: var(), inherit, sans-serif, serif, monospace
const fontNameInStylePattern = /style="[^"]*font-family\s*:\s*['"][A-Z]/gi;
let fontFamilyCount = 0;
for (const f of htmlFiles.slice(0, 200)) {
  if (f.includes('supabase')) continue; // email templates must use inline fonts
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(fontNameInStylePattern);
  if (matches) fontFamilyCount += matches.length;
}
if (fontFamilyCount === 0) {
  pass('No hardcoded font-family in inline styles');
} else {
  warn(`${fontFamilyCount} hardcoded font-family in inline styles`);
}

// Summary
console.log('\n--- Summary ---');
console.log(`  ${warnings} warning(s), ${errors} error(s)\n`);

if (errors > 0 || (STRICT && warnings > 0)) {
  process.exit(1);
}
