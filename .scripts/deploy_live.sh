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

echo "Purging Cloudflare CDN cache..."
if [[ -f "${HOME}/.env.cloudflare" ]]; then
  source "${HOME}/.env.cloudflare"
  ZONE_ID=$(curl -sS -f "https://api.cloudflare.com/client/v4/zones?name=peuterplannen.nl" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['result'][0]['id'])")
  curl -sS -f -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"purge_everything":true}'
  echo "Cache purged."
else
  echo "WARNING: ~/.env.cloudflare not found — skipping cache purge."
  echo "Run manually: source ~/.env.cloudflare && curl purge command"
fi

echo "Smoke test..."
status=$(curl -sS -o /dev/null -w "%{http_code}" "${SITE_URL}/app.html")
if [[ "$status" != "200" ]]; then
  echo "ERROR: Smoke test failed — ${SITE_URL}/app.html returned HTTP $status"
  exit 1
fi
echo "Smoke test passed (HTTP $status)"

echo "Deployment complete: ${SITE_URL}"
