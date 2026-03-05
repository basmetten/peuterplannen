#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SITE_URL="${SITE_URL:-https://peuterplannen.nl}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"
MAX_RETRIES="${MAX_RETRIES:-3}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-15}"
POLL_MAX_ATTEMPTS="${POLL_MAX_ATTEMPTS:-40}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit/stash first, then run deploy script."
  exit 1
fi

push_with_rebase() {
  local push_attempt
  for push_attempt in 1 2 3; do
    if git push origin "$TARGET_BRANCH"; then
      return 0
    fi
    echo "Push failed (attempt ${push_attempt}); rebasing on origin/${TARGET_BRANCH} and retrying."
    git pull --rebase origin "$TARGET_BRANCH"
  done
  return 1
}

wait_until_live() {
  local deploy_id="$1"
  local attempt
  for ((attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++)); do
    local ts response
    ts="$(date +%s)"
    response="$(curl -fsSL -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
      "${SITE_URL}/.build-version.txt?v=${ts}" 2>/dev/null || true)"
    if [[ "$response" == *"$deploy_id"* ]]; then
      echo "Live confirmed for deploy id: ${deploy_id}"
      return 0
    fi
    echo "Waiting for live deploy (${attempt}/${POLL_MAX_ATTEMPTS})..."
    sleep "$POLL_INTERVAL_SECONDS"
  done
  return 1
}

echo "Starting live deployment flow for ${SITE_URL} on branch ${TARGET_BRANCH}."

for ((retry = 1; retry <= MAX_RETRIES; retry++)); do
  deploy_id="$(date -u +%Y%m%dT%H%M%SZ)-r${retry}-$RANDOM"
  printf "deploy_id=%s\nutc=%s\n" "$deploy_id" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > .build-version.txt

  git add .build-version.txt
  git commit -m "Deploy marker ${deploy_id}"

  push_with_rebase

  if wait_until_live "$deploy_id"; then
    echo "Deployment completed successfully."
    exit 0
  fi

  echo "Deploy attempt ${retry}/${MAX_RETRIES} not yet live."
done

echo "Deployment failed after ${MAX_RETRIES} attempts."
exit 1
