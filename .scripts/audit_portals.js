#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output');
const JSON_OUT = path.join(OUTPUT_DIR, 'audit-portals.json');
const MD_OUT = path.join(OUTPUT_DIR, 'audit-portals.md');
const STRICT = process.argv.includes('--strict');

const targets = [
  {
    name: 'admin',
    file: path.join(ROOT, 'admin', 'index.html'),
    requiredTokens: ['admin-api'],
  },
  {
    name: 'partner',
    file: path.join(ROOT, 'partner', 'index.html'),
    requiredTokens: ['create-checkout-session', 'create-customer-portal-session'],
  },
];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function ensure(condition, issueList, issue) {
  if (!condition) issueList.push(issue);
}

function auditPortal(target) {
  const issues = [];
  if (!fs.existsSync(target.file)) {
    issues.push({ type: 'missing_file', detail: rel(target.file) });
    return issues;
  }

  const html = fs.readFileSync(target.file, 'utf8');

  ensure(/<main[^>]*id="main-content"/i.test(html), issues, { type: 'missing_main_landmark', detail: 'main#main-content ontbreekt' });
  ensure(/<nav[^>]*aria-label="Hoofdnavigatie"/i.test(html), issues, { type: 'missing_nav_aria', detail: 'nav[aria-label="Hoofdnavigatie"] ontbreekt' });
  ensure(/<h1\b/i.test(html), issues, { type: 'missing_h1', detail: 'Geen <h1> gevonden' });
  ensure(/aria-live="(polite|assertive)"/i.test(html), issues, { type: 'missing_aria_live', detail: 'Geen aria-live regio gevonden' });
  ensure(!/\balert\s*\(/i.test(html), issues, { type: 'alert_call_found', detail: 'Gebruik van alert() gevonden' });
  ensure(!/\bconfirm\s*\(/i.test(html), issues, { type: 'confirm_call_found', detail: 'Gebruik van confirm() gevonden' });
  ensure(!/\son[a-z]+\s*=\s*"/i.test(html), issues, { type: 'inline_handler_found', detail: 'Inline event handler attribuut gevonden' });
  ensure(!/href\s*=\s*"javascript:/i.test(html), issues, { type: 'javascript_href_found', detail: 'javascript: href gevonden' });

  target.requiredTokens.forEach((token) => {
    ensure(html.includes(token), issues, { type: 'missing_endpoint_binding', detail: `Token ontbreekt: ${token}` });
  });

  return issues;
}

function toMarkdown(report) {
  const lines = [
    '# Portal Audit',
    '',
    `Generated: ${report.generated_at}`,
    `Strict mode: ${report.strict_mode}`,
    '',
    `- Total issues: ${report.counts.total_issues}`,
    `- Admin issues: ${report.counts.admin_issues}`,
    `- Partner issues: ${report.counts.partner_issues}`,
    '',
  ];

  for (const name of ['admin', 'partner']) {
    const issues = report.details[name];
    lines.push(`## ${name}`);
    if (!issues.length) {
      lines.push('- OK');
    } else {
      issues.forEach((issue) => {
        lines.push(`- ${issue.type}: ${issue.detail}`);
      });
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const adminIssues = auditPortal(targets[0]);
  const partnerIssues = auditPortal(targets[1]);

  const report = {
    generated_at: new Date().toISOString(),
    strict_mode: STRICT,
    counts: {
      total_issues: adminIssues.length + partnerIssues.length,
      admin_issues: adminIssues.length,
      partner_issues: partnerIssues.length,
    },
    details: {
      admin: adminIssues,
      partner: partnerIssues,
    },
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  fs.writeFileSync(MD_OUT, toMarkdown(report));

  console.log(`Portal audit written: ${rel(JSON_OUT)}`);
  console.log(`Portal summary written: ${rel(MD_OUT)}`);
  console.log(`Counts: ${JSON.stringify(report.counts)}`);

  if (STRICT && report.counts.total_issues > 0) {
    process.exit(1);
  }
}

main();
