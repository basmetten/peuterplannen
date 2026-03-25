#!/usr/bin/env node
/**
 * Design Token Compliance Audit
 * Scant CSS-bestanden op hardcoded waarden die tokens moeten zijn.
 * Exit code 1 = violations gevonden (blokkeert CI in strict mode).
 */

const fs = require('fs');
const path = require('path');

const STRICT = process.argv.includes('--strict');
const CSS_FILES = ['style.css', 'app.css', 'nav-floating.css'];

const RULES = [
  {
    name: 'hardcoded-rgba',
    pattern: /rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/g,
    message: 'Hardcoded rgba() — gebruik rgba(var(--pp-*-rgb), opacity)',
    allowList: [/design-system\.css/],
    maxViolations: 95, // baseline: style.css 12, app.css 90 (timeline v2 + sheet CSS + visual QA polish)
  },
  {
    name: 'hardcoded-font-size',
    pattern: /font-size:\s*\d+px/g,
    message: 'Hardcoded font-size — gebruik var(--pp-text-*)',
    allowList: [/design-system\.css/, /error-page h1/],
    maxViolations: 17, // baseline: style.css 17
  },
  {
    name: 'hardcoded-shadow',
    pattern: /box-shadow:\s*\d+px\s+\d+px/g,
    message: 'Hardcoded box-shadow — gebruik var(--pp-shadow-*)',
    allowList: [/design-system\.css/],
    maxViolations: 0,
  },
  {
    name: 'hardcoded-radius',
    pattern: /border-radius:\s*\d+px(?!\s*\/)/g,
    message: 'Hardcoded border-radius — gebruik var(--pp-radius-*)',
    allowList: [/design-system\.css/],
    maxViolations: 12, // baseline: style.css 2, app.css 9 (timeline cards), nav 2
  },
  {
    name: 'unprefixed-alias',
    pattern: /var\(--(?!pp-|wg-)[a-z][a-z-]*\)/g,
    message: 'Unprefixed CSS variable — gebruik var(--pp-*) of var(--wg-*)',
    allowList: [/design-system\.css/, /warm-glass-tokens\.css/],
    maxViolations: 0,
  },
  {
    name: 'hardcoded-hex',
    pattern: /#[0-9a-fA-F]{3,8}(?!.*(?:url|svg|data|content))/g,
    message: 'Hardcoded hex kleur — gebruik var(--pp-*)',
    allowList: [/design-system\.css/, /fonts\.css/],
    maxViolations: 40, // baseline: app.css 36 (timeline + plan UI + visual QA); gradient stops en SVG fills
  },
  {
    name: 'off-grid-spacing',
    pattern: /(?:padding|margin|gap).*?\b(?:5|7|9|11|13|15|17|19|21|23|25|26|27|29|30|31|33|34|35)px/g,
    message: 'Off-grid spacing — gebruik 4pt grid (4,8,12,16,20,24,28,32,48,64,96,128)',
    allowList: [/design-system\.css/],
    maxViolations: 10, // baseline: style.css 6→8 (inline→external), app.css 9, nav 2
  },
  {
    name: 'hardcoded-icon-size',
    pattern: /(?:width|height):\s*(?:12|13|14|15|18|22)px/g,
    message: 'Non-standard icon size — gebruik var(--pp-icon-*)',
    allowList: [/design-system\.css/],
    maxViolations: 14, // baseline: style.css 2, app.css 12 (timeline + visual QA icons), nav 1
  },
];

let totalViolations = 0;

for (const file of CSS_FILES) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const rule of RULES) {
    if (rule.allowList?.some(re => re.test(file))) continue;

    let count = 0;
    lines.forEach((line, i) => {
      const matches = line.match(rule.pattern);
      if (matches) {
        count += matches.length;
        if (count <= 3 || !STRICT) {
          console.log(`  ${file}:${i + 1} [${rule.name}] ${line.trim()}`);
        }
      }
    });

    if (count > rule.maxViolations) {
      console.log(`\n❌ ${file}: ${rule.name} — ${count} violations (max ${rule.maxViolations})`);
      console.log(`   ${rule.message}\n`);
      totalViolations += count - rule.maxViolations;
    }
  }
}

if (totalViolations > 0) {
  console.log(`\n🚫 ${totalViolations} design token violations gevonden.`);
  if (STRICT) process.exit(1);
} else {
  console.log('\n✅ Alle CSS bestanden voldoen aan het design system.');
}
