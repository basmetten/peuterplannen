#!/usr/bin/env node
/**
 * Design Token Compliance Audit
 * Scans CSS files for hardcoded values that should use design tokens.
 * Exit code 1 = violations found (blocks CI in strict mode).
 *
 * Usage:
 *   node .scripts/audit_design_tokens.js            # warnings only
 *   node .scripts/audit_design_tokens.js --strict    # exit 1 on violations
 *   node .scripts/audit_design_tokens.js --changed-only  # only scan git-changed files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STRICT = process.argv.includes('--strict');
const CHANGED_ONLY = process.argv.includes('--changed-only');

// All CSS files to audit (excluding minified/bundled)
const ALL_CSS_FILES = [
  'style.css',
  'app.css',
  'glass.css',
  'nav-floating.css',
  'portal-shell.css',
];

let CSS_FILES = ALL_CSS_FILES;

if (CHANGED_ONLY) {
  try {
    const diff = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' });
    const changedCSS = diff.split('\n').filter(f => f.endsWith('.css') && !f.includes('.min.') && !f.includes('.bundle.'));
    CSS_FILES = ALL_CSS_FILES.filter(f => changedCSS.includes(f));
    if (CSS_FILES.length === 0) {
      console.log('✅ No CSS files changed — skipping audit.');
      process.exit(0);
    }
  } catch {
    // If git fails, scan all files
  }
}

// Files that define tokens (not audited for their own definitions)
const TOKEN_FILES = /design-system\.css|fonts\.css/;

// Lines inside :root { } blocks are token definitions — skip them
function isInRootBlock(content, lineIndex) {
  const lines = content.split('\n');
  let depth = 0;
  let inRoot = false;
  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i];
    if (/^:root\s*\{/.test(line.trim()) || /^:root\s*$/.test(line.trim())) inRoot = true;
    if (inRoot) {
      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;
      if (depth <= 0) inRoot = false;
    }
  }
  return inRoot;
}

// Skip lines that are comments or inside var() fallbacks
function shouldSkipLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//')) return true;
  return false;
}

const RULES = [
  {
    name: 'hardcoded-rgba',
    // Matches rgba(N, N, N, ...) but NOT rgba(var(--...), ...)
    pattern: /rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/g,
    message: 'Hardcoded rgba() — use rgba(var(--pp-*-rgb), opacity)',
    skipInVarFallback: true,
    maxViolations: { 'style.css': 5, 'app.css': 15, 'glass.css': 30, 'nav-floating.css': 2, 'portal-shell.css': 15 },
  },
  {
    name: 'hardcoded-font-size-px',
    pattern: /font-size:\s*\d+px/g,
    message: 'Hardcoded font-size — use var(--pp-text-*)',
    maxViolations: { 'style.css': 5, 'app.css': 10, 'glass.css': 15, 'nav-floating.css': 2, 'portal-shell.css': 20 },
  },
  {
    name: 'hardcoded-hex',
    // Hex colors not inside var() fallbacks, url(), or svg data URIs
    pattern: /(?<![a-zA-Z0-9_-])#[0-9a-fA-F]{3,8}\b/g,
    message: 'Hardcoded hex color — use var(--pp-*)',
    skipInVarFallback: true,
    skipInUrl: true,
    maxViolations: { 'style.css': 5, 'app.css': 10, 'glass.css': 20, 'nav-floating.css': 2, 'portal-shell.css': 25 },
  },
  {
    name: 'hardcoded-border-radius',
    pattern: /border-radius:\s*\d+px(?!\s*\/)/g,
    message: 'Hardcoded border-radius — use var(--pp-radius-*) or var(--wg-radius-*)',
    maxViolations: { 'style.css': 3, 'app.css': 10, 'glass.css': 15, 'nav-floating.css': 2, 'portal-shell.css': 10 },
  },
  {
    name: 'off-grid-spacing',
    pattern: /(?:padding|margin|gap).*?\b(?:3|5|7|9|11|13|14|15|17|18|19|21|22|23|25|26|27|29|30|31|33|34|35|36|37|38|39|40|42|44|46|50|52|56|60|72|80)px/g,
    message: 'Off-grid spacing — use 4pt grid tokens (--pp-space-*)',
    maxViolations: { 'style.css': 8, 'app.css': 15, 'glass.css': 20, 'nav-floating.css': 2, 'portal-shell.css': 15 },
  },
  {
    name: 'unprefixed-var',
    pattern: /var\(--(?!pp-|wg-)[a-z][a-z-]*\)/g,
    message: 'Unprefixed CSS variable — use var(--pp-*) or var(--wg-*)',
    maxViolations: { 'style.css': 0, 'app.css': 0, 'glass.css': 5, 'nav-floating.css': 0, 'portal-shell.css': 0 },
  },
];

let totalViolations = 0;
let totalWarnings = 0;

for (const file of CSS_FILES) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) continue;
  if (TOKEN_FILES.test(file)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const rule of RULES) {
    let count = 0;
    const examples = [];

    lines.forEach((line, i) => {
      if (shouldSkipLine(line)) return;
      if (isInRootBlock(content, i)) return;

      // Skip if line is a var() fallback: contains var(--*, #hex)
      if (rule.skipInVarFallback && /var\(--[a-z].*?,\s*#/.test(line)) return;
      if (rule.skipInUrl && /url\(/.test(line)) return;

      const matches = line.match(rule.pattern);
      if (matches) {
        count += matches.length;
        if (examples.length < 3) {
          examples.push(`  ${file}:${i + 1} ${line.trim().slice(0, 100)}`);
        }
      }
    });

    const max = typeof rule.maxViolations === 'object'
      ? (rule.maxViolations[file] ?? 0)
      : rule.maxViolations;

    if (count > max) {
      const excess = count - max;
      console.log(`\n⚠️  ${file}: ${rule.name} — ${count} found (max ${max}, +${excess} over)`);
      console.log(`   ${rule.message}`);
      examples.forEach(e => console.log(e));
      totalWarnings += excess;
      if (STRICT) totalViolations += excess;
    }
  }
}

console.log('');
if (totalViolations > 0) {
  console.log(`🚫 ${totalViolations} design token violations — fix before committing.`);
  process.exit(1);
} else if (totalWarnings > 0) {
  console.log(`⚠️  ${totalWarnings} design token warnings (not blocking).`);
  console.log('   Run with --strict to block on these.');
} else {
  console.log('✅ All CSS files comply with the design system.');
}
