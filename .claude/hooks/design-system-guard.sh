#!/usr/bin/env bash
# PreToolUse hook: reminds Claude to use design tokens before editing frontend files
# Reads the tool input JSON from stdin

INPUT=$(cat)

# Extract the file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only fire for frontend files (CSS, HTML, JS) — skip minified, node_modules, and DESIGN.md itself
if [[ "$FILE_PATH" =~ \.(css|html|js)$ ]] && \
   [[ ! "$FILE_PATH" =~ \.min\. ]] && \
   [[ ! "$FILE_PATH" =~ \.bundle\. ]] && \
   [[ ! "$FILE_PATH" =~ node_modules ]] && \
   [[ ! "$FILE_PATH" =~ DESIGN\.md ]]; then
  cat <<'MSG'
DESIGN SYSTEM: You are editing a frontend file. Before writing CSS values:
- Use tokens from design-system.css (--pp-* or --wg-* custom properties)
- NEVER hardcode colors, font-sizes, spacing, border-radius, or shadows
- Check DESIGN.md for component specs and token names
- After CSS changes, run: node .scripts/audit_design_tokens.js
MSG
fi

exit 0
