#!/usr/bin/env node
/*
 * Import moderated location observations into Supabase.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=... node .scripts/trust/import_location_observations.js observations.jsonl
 *   SUPABASE_SERVICE_KEY=... node .scripts/trust/import_location_observations.js observations.csv --dry-run
 *
 * Supported fields per row:
 *   location_id, source_type, field_name, value, confidence, evidence_url, notes
 */

const fs = require('fs');
const path = require('path');

const PROJECT_URL = process.env.SUPABASE_URL || 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const inputPath = process.argv.slice(2).find((arg) => !arg.startsWith('--'));

if (!inputPath) {
  console.error('Usage: SUPABASE_SERVICE_KEY=... node .scripts/trust/import_location_observations.js <file.{jsonl|csv}> [--dry-run]');
  process.exit(1);
}

if (!DRY_RUN && !SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function normalizeRow(row) {
  const locationId = Number.parseInt(row.location_id ?? row.locationId, 10);
  const sourceType = String(row.source_type ?? row.sourceType ?? '').trim();
  const fieldName = String(row.field_name ?? row.fieldName ?? '').trim();
  const rawValue = row.value_json ?? row.valueJson ?? row.value;
  let valueJson;
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) valueJson = null;
    else {
      try {
        valueJson = JSON.parse(trimmed);
      } catch {
        valueJson = trimmed;
      }
    }
  } else {
    valueJson = rawValue;
  }
  const confidenceRaw = row.confidence;
  const confidence = confidenceRaw === '' || confidenceRaw == null
    ? null
    : Number.parseFloat(confidenceRaw);

  if (!Number.isInteger(locationId) || locationId <= 0) throw new Error(`Invalid location_id: ${row.location_id}`);
  if (!['editor', 'partner', 'parent'].includes(sourceType)) throw new Error(`Invalid source_type for ${locationId}: ${sourceType}`);
  if (!fieldName) throw new Error(`Missing field_name for ${locationId}`);
  if (valueJson == null) throw new Error(`Missing value for ${locationId}/${fieldName}`);
  if (confidence != null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
    throw new Error(`Invalid confidence for ${locationId}/${fieldName}: ${confidenceRaw}`);
  }

  return {
    location_id: locationId,
    source_type: sourceType,
    field_name: fieldName,
    value_json: valueJson,
    confidence,
    evidence_url: row.evidence_url || row.evidenceUrl || null,
    notes: row.notes || null,
  };
}

async function insertBatch(batch) {
  const response = await fetch(`${PROJECT_URL}/rest/v1/location_observations`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(batch),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase insert failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function main() {
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const rows = absolutePath.endsWith('.jsonl')
    ? raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    : parseCsv(raw);
  const normalized = rows.map(normalizeRow);
  const byField = normalized.reduce((acc, row) => {
    acc[row.field_name] = (acc[row.field_name] || 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({
    file: absolutePath,
    rows: normalized.length,
    by_field: byField,
    dry_run: DRY_RUN,
  }, null, 2));

  if (DRY_RUN || !normalized.length) return;

  const batchSize = 200;
  let inserted = 0;
  for (let i = 0; i < normalized.length; i += batchSize) {
    const batch = normalized.slice(i, i + batchSize);
    await insertBatch(batch);
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${normalized.length}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
