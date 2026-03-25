#!/usr/bin/env bash
# Voortgangsbalk voor alle lopende pipeline-runs
# Gebruik: bash .scripts/pipeline/watch_progress.sh

TASKS="brj660kyu btlguixmt bavq9be1v b4qlf7z3e bo1kwzvvs bzj4iyjjh"
TASK_NAMES="Amsterdam Rotterdam DenHaag Haarlem Amersfoort Leiden"

LABELS=("Amsterdam" "Rotterdam" "Den Haag" "Haarlem" "Amersfoort" "Leiden"
        "Almere" "Apeldoorn" "Arnhem" "Breda" "Eindhoven"
        "Gooi+V" "Groningen" "Nijmegen" "Tilburg" "UtrHeuvelrug" "'s-Hertogenbosch")

log_for() {
  local name="$1"
  case "$name" in
    Amsterdam)    echo "/private/tmp/claude-501/-Users-basmetten/tasks/brj660kyu.output" ;;
    Rotterdam)    echo "/private/tmp/claude-501/-Users-basmetten/tasks/btlguixmt.output" ;;
    "Den Haag")   echo "/private/tmp/claude-501/-Users-basmetten/tasks/bavq9be1v.output" ;;
    Haarlem)      echo "/private/tmp/claude-501/-Users-basmetten/tasks/b4qlf7z3e.output" ;;
    Amersfoort)   echo "/private/tmp/claude-501/-Users-basmetten/tasks/bo1kwzvvs.output" ;;
    Leiden)       echo "/private/tmp/claude-501/-Users-basmetten/tasks/bzj4iyjjh.output" ;;
    *)            echo "/tmp/pipeline_$(echo "$name" | tr ' ' '_' | sed "s/'s-/_s-/").log" ;;
  esac
}

phase_of() {
  local last
  last=$(tail -2 "$1" 2>/dev/null | tr '\n' ' ')
  if echo "$last" | grep -q "Run complete\|approved\|Promoted"; then
    local approved=$(grep -o 'approved=[0-9]*' "$1" 2>/dev/null | tail -1 | cut -d= -f2)
    echo "✅ klaar  (approved=${approved:-?})"
  elif echo "$last" | grep -q "Scoring via Codex\|[3b]/4"; then
    echo "🤖 scoring..."
  elif echo "$last" | grep -q "Enriching"; then
    echo "🔍 enriching..."
  elif echo "$last" | grep -q "Upserting\|queued"; then
    local n=$(grep -o 'queued for scoring: [0-9]*' "$1" 2>/dev/null | tail -1 | awk '{print $NF}')
    echo "📥 upsert    (${n:-?} kandidaten)"
  elif echo "$last" | grep -q "Discovering\|Discovered"; then
    local n=$(grep -o 'Discovered: [0-9]*' "$1" 2>/dev/null | tail -1 | awk '{print $NF}')
    echo "🗺️  discover  (${n:-...})"
  elif echo "$last" | grep -q "failed\|Error\|error"; then
    echo "❌ FOUT"
  else
    echo "⏳ wacht..."
  fi
}

while true; do
  clear
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║       PeuterPlannen Pipeline — $(date '+%H:%M:%S')              ║"
  echo "╠══════════════════════════════════════════════════════╣"
  printf "║  %-20s  %-30s ║\n" "Regio" "Status"
  echo "╠══════════════════════════════════════════════════════╣"

  for name in "Amsterdam" "Rotterdam" "Den Haag" "Haarlem" "Amersfoort" "Leiden" \
              "Almere" "Apeldoorn" "Arnhem" "Breda" "Eindhoven" \
              "Gooi_en_Vechtstreek" "Groningen" "Nijmegen" "Tilburg" \
              "Utrechtse_Heuvelrug" "_s-Hertogenbosch"; do
    logfile=$(log_for "$name")
    display=$(echo "$name" | sed "s/_/ /g;s/ s-/'s-/")
    phase=$(phase_of "$logfile")
    printf "║  %-20s  %-30s ║\n" "${display:0:20}" "${phase:0:30}"
  done

  echo "╚══════════════════════════════════════════════════════╝"
  echo "  Ververs elke 15s — Ctrl+C om te stoppen"
  sleep 15
done
