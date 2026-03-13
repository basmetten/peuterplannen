#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SITE_URL="${SITE_URL:-https://peuterplannen.nl}"

echo "Building site..."
npm run build

echo "Running audits..."
node .scripts/audit_internal_consistency.js --strict
node .scripts/audit_portals.js --strict
node .scripts/audit_seo_quality.js --strict

echo "Deploying to Cloudflare Worker..."
npx wrangler deploy

echo "Deployment complete: ${SITE_URL}"
