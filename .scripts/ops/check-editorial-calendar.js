#!/usr/bin/env node
/**
 * check-editorial-calendar.js
 *
 * Checks the editorial calendar for upcoming and overdue posts.
 * 1. Reads content/editorial-calendar.json
 * 2. Flags posts with status "todo" that are <2 weeks from publish_before deadline
 * 3. Flags posts with status "todo" where publish_before has already passed (overdue)
 * 4. Outputs warnings to console and output/editorial-calendar-status.md
 * 5. Exits with code 1 if there are urgent or overdue items
 *
 * Usage: node .scripts/ops/check-editorial-calendar.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CALENDAR_PATH = path.join(ROOT, 'content', 'editorial-calendar.json');
const OUT_DIR = path.join(ROOT, 'output');
const OUT_PATH = path.join(OUT_DIR, 'editorial-calendar-status.md');

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function loadCalendar() {
  if (!fs.existsSync(CALENDAR_PATH)) {
    throw new Error(`Editorial calendar not found: ${CALENDAR_PATH}`);
  }
  const raw = fs.readFileSync(CALENDAR_PATH, 'utf8');
  return JSON.parse(raw);
}

function classifyEntries(entries, now) {
  const overdue = [];
  const urgent = [];
  const upcoming = [];
  const noDeadline = [];

  for (const entry of entries) {
    if (entry.status !== 'todo') continue;

    if (!entry.publish_before) {
      noDeadline.push(entry);
      continue;
    }

    const deadline = new Date(entry.publish_before);
    const msUntilDeadline = deadline - now;

    if (msUntilDeadline < 0) {
      // Deadline already passed
      overdue.push({ ...entry, daysOverdue: Math.ceil(-msUntilDeadline / (24 * 60 * 60 * 1000)) });
    } else if (msUntilDeadline < TWO_WEEKS_MS) {
      // Deadline within 2 weeks
      urgent.push({ ...entry, daysUntilDeadline: Math.ceil(msUntilDeadline / (24 * 60 * 60 * 1000)) });
    } else {
      upcoming.push({ ...entry, daysUntilDeadline: Math.ceil(msUntilDeadline / (24 * 60 * 60 * 1000)) });
    }
  }

  return { overdue, urgent, upcoming, noDeadline };
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function generateMarkdown(classified, now) {
  const { overdue, urgent, upcoming, noDeadline } = classified;
  const hasIssues = overdue.length > 0 || urgent.length > 0;

  const lines = [];
  lines.push(`# Editorial Calendar Status`);
  lines.push(``);
  lines.push(`Generated: ${now.toISOString().split('T')[0]}`);
  lines.push(``);

  // Summary
  lines.push(`## Samenvatting`);
  lines.push(``);
  if (!hasIssues) {
    lines.push(`Geen urgente of achterstallige posts gevonden.`);
  } else {
    if (overdue.length > 0) {
      lines.push(`- **${overdue.length} achterstallig** (deadline verstreken)`);
    }
    if (urgent.length > 0) {
      lines.push(`- **${urgent.length} urgent** (deadline binnen 2 weken)`);
    }
  }
  lines.push(``);

  // Overdue
  if (overdue.length > 0) {
    lines.push(`## Achterstallig (deadline verstreken)`);
    lines.push(``);
    lines.push(`| Slug | Titel | Deadline | Fase | Vertraging |`);
    lines.push(`|------|-------|----------|------|------------|`);
    for (const entry of overdue) {
      lines.push(`| \`${entry.slug}\` | ${entry.title} | ${formatDate(entry.publish_before)} | ${entry.phase} | ${entry.daysOverdue} dag(en) |`);
    }
    lines.push(``);
  }

  // Urgent
  if (urgent.length > 0) {
    lines.push(`## Urgent (deadline binnen 2 weken)`);
    lines.push(``);
    lines.push(`| Slug | Titel | Deadline | Fase | Nog |`);
    lines.push(`|------|-------|----------|------|-----|`);
    for (const entry of urgent) {
      lines.push(`| \`${entry.slug}\` | ${entry.title} | ${formatDate(entry.publish_before)} | ${entry.phase} | ${entry.daysUntilDeadline} dag(en) |`);
    }
    lines.push(``);
  }

  // Upcoming (with deadline, not urgent)
  if (upcoming.length > 0) {
    lines.push(`## Gepland (deadline > 2 weken)`);
    lines.push(``);
    lines.push(`| Slug | Titel | Deadline | Fase | Nog |`);
    lines.push(`|------|-------|----------|------|-----|`);
    for (const entry of upcoming) {
      lines.push(`| \`${entry.slug}\` | ${entry.title} | ${formatDate(entry.publish_before)} | ${entry.phase} | ${entry.daysUntilDeadline} dag(en) |`);
    }
    lines.push(``);
  }

  // No deadline
  if (noDeadline.length > 0) {
    lines.push(`## Zonder deadline (${noDeadline.length} posts)`);
    lines.push(``);
    lines.push(`| Slug | Titel | Fase |`);
    lines.push(`|------|-------|------|`);
    for (const entry of noDeadline) {
      lines.push(`| \`${entry.slug}\` | ${entry.title} | ${entry.phase} |`);
    }
    lines.push(``);
  }

  return lines.join('\n');
}

function main() {
  console.log('Checking editorial calendar...\n');

  const entries = loadCalendar();
  console.log(`  ${entries.length} entries loaded`);

  const now = new Date();
  const classified = classifyEntries(entries, now);

  const { overdue, urgent, upcoming, noDeadline } = classified;

  // Console output
  if (overdue.length > 0) {
    console.log(`\n  [OVERDUE] ${overdue.length} post(s) met verstreken deadline:`);
    for (const entry of overdue) {
      console.log(`    - ${entry.slug} (${entry.publish_before}) — ${entry.daysOverdue} dag(en) te laat`);
    }
  }

  if (urgent.length > 0) {
    console.log(`\n  [URGENT] ${urgent.length} post(s) met deadline binnen 2 weken:`);
    for (const entry of urgent) {
      console.log(`    - ${entry.slug} (${entry.publish_before}) — nog ${entry.daysUntilDeadline} dag(en)`);
    }
  }

  if (upcoming.length > 0) {
    console.log(`\n  [OK] ${upcoming.length} post(s) gepland (> 2 weken):`);
    for (const entry of upcoming) {
      console.log(`    - ${entry.slug} (${entry.publish_before}) — nog ${entry.daysUntilDeadline} dag(en)`);
    }
  }

  if (noDeadline.length > 0) {
    console.log(`\n  [INFO] ${noDeadline.length} post(s) zonder deadline`);
  }

  // Write markdown report
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const md = generateMarkdown(classified, now);
  fs.writeFileSync(OUT_PATH, md, 'utf8');
  console.log(`\n  Rapport opgeslagen: ${OUT_PATH}`);

  const hasIssues = overdue.length > 0 || urgent.length > 0;

  if (hasIssues) {
    console.log('\n  Actie vereist: urgente of achterstallige posts gevonden.');
    process.exit(1);
  } else {
    console.log('\n  Geen urgente of achterstallige posts. Alles in orde.');
  }
}

main();
