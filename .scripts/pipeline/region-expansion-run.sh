#!/bin/bash
# region-expansion-run.sh — Overnight region expansion pipeline
# Scheduled to run at 02:15 via cron
#
# Pipeline:
# 1. expand-regions.js — OSM discovery + Google Places + website scraping + photos + insert
# 2. photo-upgrade.js — find better photos for new locations without good ones
# 3. quality-check-photos.js — Gemini scoring for any new photos
# 4. truth-upgrade.js — run enrichment on just the new locations (high IDs)

set -euo pipefail

cd /Users/basmetten/peuterplannen
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
# Load GEMINI_API_KEY from .supabase_env (gitignored)
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .supabase_env | cut -d= -f2)

LOG_DIR=".scripts/pipeline/output"
LOG_FILE="$LOG_DIR/region-expansion-$(date +%Y%m%d).log"

log() {
  echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "═══ REGION EXPANSION RUN START ═══"
log "Target: 6 new regions (Leeuwarden, Alkmaar, Emmen, Venlo, Heerlen, Deventer)"

# Step 1: Full expansion pipeline (OSM + Google + website + photos + descriptions + insert)
log "Step 1/4: expand-regions.js (full pipeline)..."
node .scripts/pipeline/expand-regions.js 2>&1 | tee -a "$LOG_FILE" || {
  log "Step 1 had errors, continuing..."
}

# Step 2: Photo upgrade pass for new locations without good photos
log "Step 2/4: photo-upgrade.js (find better photos for new locations)..."
node .scripts/pipeline/photo-upgrade.js 2>&1 | tee -a "$LOG_FILE" || {
  log "Step 2 failed, continuing..."
}

# Step 3: Gemini quality scoring for new photos
log "Step 3/4: quality-check-photos.js (score new photos)..."
GEMINI_MAX_RPD=300 node .scripts/pipeline/quality-check-photos.js 2>&1 | tee -a "$LOG_FILE" || {
  log "Step 3 failed, continuing..."
}

# Step 4: Filter any logo photos that slipped through
log "Step 4/4: filter-logo-photos.js..."
node .scripts/pipeline/filter-logo-photos.js 2>&1 | tee -a "$LOG_FILE" || {
  log "Step 4 failed, continuing..."
}

# Summary
log "═══ REGION EXPANSION RUN COMPLETE ═══"
log "Check results:"
log "  cat $LOG_FILE"
log "  Check expand-regions-progress.json for details"
