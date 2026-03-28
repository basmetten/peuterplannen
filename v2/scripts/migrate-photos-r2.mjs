#!/usr/bin/env node
/**
 * migrate-photos-r2.mjs — One-time migration of location photos to Cloudflare R2
 *
 * Reads local /images/locations/{region}/{slug}/ directories,
 * uploads hero.webp files to R2, then updates photo_url in Supabase.
 *
 * Prerequisites:
 *   1. R2 bucket "peuterplannen-photos" created in Cloudflare dashboard
 *   2. R2 API token created (S3-compatible Access Key ID + Secret)
 *   3. Public access enabled on the bucket (or custom domain configured)
 *
 * Environment variables:
 *   R2_ACCOUNT_ID       — Cloudflare account ID
 *   R2_ACCESS_KEY_ID    — R2 S3-compatible access key
 *   R2_SECRET_ACCESS_KEY — R2 S3-compatible secret key
 *   R2_BUCKET_NAME      — Bucket name (default: peuterplannen-photos)
 *   R2_PUBLIC_URL        — Public URL prefix (e.g. https://photos.peuterplannen.nl)
 *   SUPABASE_URL         — Supabase project URL
 *   SUPABASE_SERVICE_KEY — Supabase service role key (write access)
 *   DRY_RUN=1            — Preview without uploading or updating DB
 *   SKIP_UPLOAD=1        — Skip R2 upload, only update DB (for re-runs)
 *   CONCURRENCY=N        — Parallel uploads (default: 10)
 *
 * Usage:
 *   # Dry run:
 *   DRY_RUN=1 node v2/scripts/migrate-photos-r2.mjs
 *
 *   # Full migration:
 *   node v2/scripts/migrate-photos-r2.mjs
 *
 *   # Re-run DB update only (photos already uploaded):
 *   SKIP_UPLOAD=1 node v2/scripts/migrate-photos-r2.mjs
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

/* ---------- Config ---------- */

const DRY_RUN = process.env.DRY_RUN === '1';
const SKIP_UPLOAD = process.env.SKIP_UPLOAD === '1';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);

const ACCOUNT_ID = requireEnv('R2_ACCOUNT_ID');
const ACCESS_KEY_ID = requireEnv('R2_ACCESS_KEY_ID');
const SECRET_ACCESS_KEY = requireEnv('R2_SECRET_ACCESS_KEY');
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'peuterplannen-photos';
const R2_PUBLIC_URL = requireEnv('R2_PUBLIC_URL');
const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_KEY = requireEnv('SUPABASE_SERVICE_KEY');

const ROOT = resolve(import.meta.dirname, '..', '..');
const IMAGES_DIR = join(ROOT, 'images', 'locations');

/* ---------- S3 Client (R2-compatible) ---------- */

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

/* ---------- Helpers ---------- */

function requireEnv(name) {
  const val = process.env[name];
  if (!val && !DRY_RUN) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return val || '';
}

/** Fetch all rows from Supabase with pagination. */
async function sbFetchAll(table, query) {
  const BATCH = 1000;
  const all = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}&limit=${BATCH}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < BATCH) break;
    offset += BATCH;
  }
  return all;
}

/** Update photo_url for a batch of locations in Supabase. */
async function sbUpdateBatch(updates) {
  // Supabase doesn't support batch PATCH natively, so we use individual requests
  // with concurrency control. For 2300+ rows, this takes ~30s at 10 concurrent.
  const chunks = [];
  for (let i = 0; i < updates.length; i += CONCURRENCY) {
    chunks.push(updates.slice(i, i + CONCURRENCY));
  }

  let done = 0;
  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async ({ id, newUrl }) => {
        const url = `${SUPABASE_URL}/rest/v1/locations?id=eq.${id}`;
        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ photo_url: newUrl }),
        });
        if (!res.ok) {
          console.error(`  Failed to update id=${id}: ${res.status}`);
        }
        done++;
        if (done % 100 === 0) {
          process.stdout.write(`  DB update: ${done}/${updates.length}\r`);
        }
      }),
    );
  }
  console.log(`  DB update: ${done}/${updates.length} complete`);
}

/** Check if an object exists in R2. */
async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Upload a file to R2. Returns true if uploaded, false if skipped. */
async function uploadFile(localPath, key) {
  // Check if already exists (idempotent re-runs)
  if (await objectExists(key)) return false;

  const body = readFileSync(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return true;
}

/** Run uploads with concurrency control. */
async function uploadAll(files) {
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  const chunks = [];
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    chunks.push(files.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async ({ localPath, key }) => {
        try {
          const didUpload = await uploadFile(localPath, key);
          if (didUpload) uploaded++;
          else skipped++;
        } catch (err) {
          console.error(`  Upload failed: ${key} — ${err.message}`);
          failed++;
        }
        const total = uploaded + skipped + failed;
        if (total % 50 === 0) {
          process.stdout.write(
            `  Upload: ${total}/${files.length} (${uploaded} new, ${skipped} exist, ${failed} failed)\r`,
          );
        }
      }),
    );
  }

  console.log(
    `  Upload: ${files.length} total (${uploaded} new, ${skipped} exist, ${failed} failed)`,
  );
  return { uploaded, skipped, failed };
}

/* ---------- Main ---------- */

async function main() {
  console.log('=== PeuterPlannen Photo Migration to R2 ===');
  console.log(`  Bucket: ${BUCKET_NAME}`);
  console.log(`  Public URL: ${R2_PUBLIC_URL}`);
  console.log(`  Source: ${IMAGES_DIR}`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : SKIP_UPLOAD ? 'DB UPDATE ONLY' : 'FULL MIGRATION'}`);
  console.log();

  // Step 1: Scan local files
  console.log('Step 1: Scanning local photo directories...');
  const regions = readdirSync(IMAGES_DIR).filter((f) =>
    statSync(join(IMAGES_DIR, f)).isDirectory(),
  );

  const files = [];
  for (const region of regions) {
    const regionDir = join(IMAGES_DIR, region);
    const locations = readdirSync(regionDir).filter((f) =>
      statSync(join(regionDir, f)).isDirectory(),
    );

    for (const slug of locations) {
      const heroPath = join(regionDir, slug, 'hero.webp');
      if (existsSync(heroPath)) {
        files.push({
          region,
          slug,
          localPath: heroPath,
          key: `${region}/${slug}/hero.webp`,
          oldUrl: `/images/locations/${region}/${slug}/hero.webp`,
          newUrl: `${R2_PUBLIC_URL}/${region}/${slug}/hero.webp`,
        });
      }
    }
  }
  console.log(`  Found ${files.length} hero.webp files across ${regions.length} regions`);
  console.log();

  if (DRY_RUN) {
    console.log('DRY RUN — showing first 10 files:');
    files.slice(0, 10).forEach((f) => {
      const size = statSync(f.localPath).size;
      console.log(`  ${f.key} (${(size / 1024).toFixed(0)}KB) → ${f.newUrl}`);
    });

    const totalSize = files.reduce((sum, f) => sum + statSync(f.localPath).size, 0);
    console.log(`\n  Total: ${files.length} files, ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
    console.log('\nRe-run without DRY_RUN=1 to execute.');
    return;
  }

  // Step 2: Upload to R2
  if (!SKIP_UPLOAD) {
    console.log('Step 2: Uploading to R2...');
    const result = await uploadAll(files);
    if (result.failed > 0) {
      console.error(`\n${result.failed} uploads failed. Fix errors and re-run.`);
      process.exit(1);
    }
    console.log();
  } else {
    console.log('Step 2: Skipped (SKIP_UPLOAD=1)');
    console.log();
  }

  // Step 3: Fetch current DB state
  console.log('Step 3: Fetching location data from Supabase...');
  const locations = await sbFetchAll(
    'locations',
    'select=id,slug,region,photo_url&photo_url=not.is.null',
  );
  console.log(`  Found ${locations.length} locations with photos in DB`);

  // Step 4: Build update map
  // Match DB records to uploaded files by their old relative URL
  const fileByOldUrl = new Map(files.map((f) => [f.oldUrl, f]));
  const fileByThumbUrl = new Map(
    files.map((f) => [f.oldUrl.replace('/hero.webp', '/thumb.webp'), f]),
  );

  const updates = [];
  let alreadyMigrated = 0;

  for (const loc of locations) {
    const url = loc.photo_url;
    if (!url) continue;

    // Already an R2 URL
    if (url.startsWith(R2_PUBLIC_URL)) {
      alreadyMigrated++;
      continue;
    }

    // Match by hero URL
    let file = fileByOldUrl.get(url);
    // Some DB entries point to thumb.webp — upgrade to hero.webp
    if (!file) file = fileByThumbUrl.get(url);

    if (file) {
      updates.push({ id: loc.id, newUrl: file.newUrl });
    }
  }

  console.log(`  ${updates.length} locations to update`);
  console.log(`  ${alreadyMigrated} already migrated`);
  console.log(`  ${locations.length - updates.length - alreadyMigrated} unmatched (no local file)`);
  console.log();

  // Step 5: Update Supabase
  if (updates.length > 0) {
    console.log('Step 4: Updating Supabase photo_url values...');
    await sbUpdateBatch(updates);
    console.log();
  }

  console.log('=== Migration complete ===');
  console.log(`  ${files.length} files in R2`);
  console.log(`  ${updates.length} DB records updated`);
  console.log(`  Public URL pattern: ${R2_PUBLIC_URL}/{region}/{slug}/hero.webp`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
