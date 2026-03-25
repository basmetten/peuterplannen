#!/bin/bash
# photo-improvement-run.sh — Overnight photo quality improvement
# Scheduled to run at midnight via cron
#
# Pipeline:
# 1. photo-upgrade.js — scrape better photos for score ≤2 (Playwright)
# 2. filter-logo-photos.js — remove logos that slipped through
# 3. quality-check-photos.js — re-score all new/changed photos with Gemini
# 4. photo-upgrade.js (pass 2) — try again for any still-bad photos
# 5. quality-check-photos.js (pass 2) — final scoring

set -euo pipefail

cd /Users/basmetten/peuterplannen
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
# Load GEMINI_API_KEY from .supabase_env (gitignored)
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .supabase_env | cut -d= -f2)

LOG_DIR=".scripts/pipeline/output"
LOG_FILE="$LOG_DIR/photo-improvement-$(date +%Y%m%d).log"

log() {
  echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "═══ PHOTO IMPROVEMENT RUN START ═══"
log "Target: 105 locations with no photo or score ≤2"

# Step 1: Scrape better photos (Playwright, concurrency 2)
log "Step 1/5: photo-upgrade.js (scrape better photos)..."
node .scripts/pipeline/photo-upgrade.js 2>&1 | tee -a "$LOG_FILE" || {
  log "Step 1 failed, continuing..."
}

# Step 2: Filter logos
log "Step 2/5: filter-logo-photos.js..."
node .scripts/pipeline/filter-logo-photos.js 2>&1 | tee -a "$LOG_FILE" || {
  log "Step 2 failed, continuing..."
}

# Step 3: Re-score with Gemini (rate limited: 7s between calls)
log "Step 3/5: quality-check-photos.js (Gemini scoring pass 1)..."
RESCORE=1 GEMINI_MAX_RPD=450 node .scripts/pipeline/quality-check-photos.js 2>&1 | tee -a "$LOG_FILE" || {
  log "Step 3 failed, continuing..."
}

# Step 4: Second pass — upgrade any still-bad photos
log "Step 4/5: photo-upgrade.js (pass 2, remaining bad photos)..."
node .scripts/pipeline/photo-upgrade.js 2>&1 | tee -a "$LOG_FILE" || {
  log "Step 4 failed, continuing..."
}

# Step 5: Final Gemini scoring for new photos
log "Step 5/5: quality-check-photos.js (final scoring)..."
GEMINI_MAX_RPD=200 node .scripts/pipeline/quality-check-photos.js 2>&1 | tee -a "$LOG_FILE" || {
  log "Step 5 failed, continuing..."
}

# Summary
log "═══ PHOTO IMPROVEMENT RUN COMPLETE ═══"
log "Check results:"
log "  cat $LOG_FILE"
log "  node -e \"const{createSupabaseClient}=require('./.scripts/pipeline/db');const db=createSupabaseClient('.');db.rest('locations?photo_quality=lte.2&select=id').then(r=>console.log('Still bad:',r.length))\""
