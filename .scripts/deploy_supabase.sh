#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROJECT_REF="${SUPABASE_PROJECT_REF:-$(cat supabase/.temp/project-ref 2>/dev/null || true)}"
SUPABASE_MANAGEMENT_API="${SUPABASE_MANAGEMENT_API:-https://api.supabase.com/v1}"
AUTH_TEMPLATE_PATH="${ROOT_DIR}/supabase/auth/magic-link-template.html"
AUTH_MAGIC_LINK_SUBJECT="${AUTH_MAGIC_LINK_SUBJECT:-Je PeuterPlannen inlogcode: {{ .Token }}}"
AUTH_OTP_LENGTH="${AUTH_OTP_LENGTH:-6}"
AUTH_OTP_EXP="${AUTH_OTP_EXP:-900}"
OUTPUT_DIR="${ROOT_DIR}/output/supabase"

DEFAULT_ORIGINS=(
  "https://peuterplannen.nl/**"
  "https://www.peuterplannen.nl/**"
  "https://admin.peuterplannen.nl/**"
  "https://partner.peuterplannen.nl/**"
)

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required binary: $1" >&2
    exit 1
  fi
}

require_bin curl
require_bin jq
require_bin supabase

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "SUPABASE_ACCESS_TOKEN is required." >&2
  exit 1
fi

if [[ -z "${PROJECT_REF}" ]]; then
  echo "SUPABASE_PROJECT_REF is required or supabase/.temp/project-ref must exist." >&2
  exit 1
fi

if [[ ! -f "${AUTH_TEMPLATE_PATH}" ]]; then
  echo "Missing auth template: ${AUTH_TEMPLATE_PATH}" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

management_query() {
  local sql="$1"
  curl -fsS -X POST \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "${SUPABASE_MANAGEMENT_API}/projects/${PROJECT_REF}/database/query" \
    --data-binary @<(jq -n --arg query "${sql}" '{query:$query}')
}

should_consider_migrations() {
  local mode="${DEPLOY_SUPABASE_MIGRATIONS:-auto}"

  case "$mode" in
    always|auto) return 0 ;;
    never) return 1 ;;
    *)
      echo "Invalid DEPLOY_SUPABASE_MIGRATIONS value: ${mode}" >&2
      exit 1
      ;;
  esac
}

git_changed_paths() {
  if [[ -n "${CI_BASE_SHA:-}" && -n "${CI_HEAD_SHA:-}" ]]; then
    if git rev-parse --verify "${CI_BASE_SHA}^{commit}" >/dev/null 2>&1 && git rev-parse --verify "${CI_HEAD_SHA}^{commit}" >/dev/null 2>&1; then
      git diff --name-only "${CI_BASE_SHA}" "${CI_HEAD_SHA}" -- "$@" || true
      return 0
    fi
  fi

  if git rev-parse --verify HEAD^ >/dev/null 2>&1; then
    git diff --name-only HEAD^ HEAD -- "$@" || true
  fi
  git diff --name-only -- "$@" || true
  git diff --cached --name-only -- "$@" || true
}

function_deploy_targets() {
  local function_dirs=()
  local changed_shared changed entries_out=() fn mode

  while IFS= read -r fn; do
    [[ -n "${fn}" ]] && function_dirs+=("${fn}")
  done < <(find supabase/functions -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | grep -v '^_shared$' | sort)

  changed_shared="$(git_changed_paths supabase/functions/_shared)"
  if [[ -n "${changed_shared}" ]]; then
    for fn in "${function_dirs[@]}"; do
      case "${fn}" in
        admin-api|create-checkout-session|create-customer-portal-session|generate-plan|stripe-webhook)
          mode="no-verify"
          ;;
        *)
          mode="verify"
          ;;
      esac
      printf '%s:%s\n' "${fn}" "${mode}"
    done
    return 0
  fi

  for fn in "${function_dirs[@]}"; do
    changed="$(git_changed_paths "supabase/functions/${fn}")"
    if [[ -n "${changed}" ]]; then
      case "${fn}" in
        admin-api|create-checkout-session|create-customer-portal-session|generate-plan|stripe-webhook)
          mode="no-verify"
          ;;
        *)
          mode="verify"
          ;;
      esac
      entries_out+=("${fn}:${mode}")
    fi
  done

  if [[ ${#entries_out[@]} -eq 0 ]]; then
    return 0
  fi

  printf '%s\n' "${entries_out[@]}"
}

patch_auth_config() {
  local backup_path current_config allow_list_csv defaults_json payload verify_json
  backup_path="${OUTPUT_DIR}/auth-config-before-$(date -u +%Y%m%dT%H%M%SZ).json"

  current_config="$(curl -fsS \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "${SUPABASE_MANAGEMENT_API}/projects/${PROJECT_REF}/config/auth")"

  printf '%s\n' "${current_config}" > "${backup_path}"

  defaults_json="$(
    printf '%s\n' "${DEFAULT_ORIGINS[@]}" | jq -R . | jq -s .
  )"

  allow_list_csv="$(
    jq -r -n \
      --arg current_raw "$(printf '%s\n' "${current_config}" | jq -r '.uri_allow_list // ""')" \
      --argjson defaults "${defaults_json}" \
      '
        ((($current_raw | gsub("^\"|\"$"; "")) | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))) + $defaults)
        | map(select(type=="string" and length > 0))
        | unique
        | join(",")
      '
  )"

  payload="$(
    jq -n \
      --arg subject "${AUTH_MAGIC_LINK_SUBJECT}" \
      --rawfile template "${AUTH_TEMPLATE_PATH}" \
      --argjson otp_length "${AUTH_OTP_LENGTH}" \
      --argjson otp_exp "${AUTH_OTP_EXP}" \
      --arg allow_list "${allow_list_csv}" \
      '{
        mailer_subjects_magic_link: $subject,
        mailer_templates_magic_link_content: $template,
        mailer_otp_length: $otp_length,
        mailer_otp_exp: $otp_exp,
        uri_allow_list: $allow_list
      }'
  )"

  curl -fsS -X PATCH \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${payload}" \
    "${SUPABASE_MANAGEMENT_API}/projects/${PROJECT_REF}/config/auth" >/dev/null

  verify_json="$(curl -fsS \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "${SUPABASE_MANAGEMENT_API}/projects/${PROJECT_REF}/config/auth")"

  printf '%s\n' "${verify_json}" > "${OUTPUT_DIR}/auth-config-after.json"

  if [[ "$(printf '%s\n' "${verify_json}" | jq -r '.mailer_subjects_magic_link // empty')" != "${AUTH_MAGIC_LINK_SUBJECT}" ]]; then
    echo "Auth config verification failed: mail subject mismatch." >&2
    exit 1
  fi

  if ! printf '%s\n' "${verify_json}" | jq -e '.mailer_templates_magic_link_content // "" | contains("{{ .Token }}")' >/dev/null; then
    echo "Auth config verification failed: OTP token missing from live template." >&2
    exit 1
  fi
}

deploy_functions() {
  local functions
  mapfile -t functions < <(function_deploy_targets)

  supabase login --token "${SUPABASE_ACCESS_TOKEN}" >/dev/null

  if [[ ${#functions[@]} -eq 0 ]]; then
    echo "No function changes detected; skipping function deploy."
    return 0
  fi

  for entry in "${functions[@]}"; do
    local fn="${entry%%:*}" mode="${entry##*:}" attempt=1
    while true; do
      echo "Deploying function ${fn} (attempt ${attempt})..."
      set +e
      if [[ "${mode}" == "no-verify" ]]; then
        supabase functions deploy "${fn}" --project-ref "${PROJECT_REF}" --use-api --no-verify-jwt
      else
        supabase functions deploy "${fn}" --project-ref "${PROJECT_REF}" --use-api
      fi
      local status=$?
      set -e
      if [[ ${status} -eq 0 ]]; then
        break
      fi
      if [[ ${attempt} -ge 3 ]]; then
        echo "Function deploy failed for ${fn} after ${attempt} attempts." >&2
        exit ${status}
      fi
      echo "Function deploy for ${fn} failed; retrying after backoff..." >&2
      sleep $((attempt * 10))
      attempt=$((attempt + 1))
    done
  done
}

push_migrations_if_needed() {
  local applied_json migration_file basename applied_version migration_name legacy_version

  if ! should_consider_migrations; then
    echo "Migration deploy disabled by DEPLOY_SUPABASE_MIGRATIONS=${DEPLOY_SUPABASE_MIGRATIONS:-auto}."
    return 0
  fi

  applied_json="$(
    management_query "select version, coalesce(name, '') as name from supabase_migrations.schema_migrations order by version"
  )"

  local pending_count=0
  shopt -s nullglob
  for migration_file in "${ROOT_DIR}"/supabase/migrations/*.sql; do
    basename="$(basename "${migration_file}" .sql)"
    migration_name="${basename#*_}"
    legacy_version="${basename%%_*}"
    applied_version="$(
      printf '%s\n' "${applied_json}" | jq -r \
        --arg version "${basename}" \
        --arg legacy_version "${legacy_version}" \
        --arg name "${migration_name}" \
        '
          map(select(
            .version == $version
            or (.version == $legacy_version and ((.name // "") == $name or (.name // "") == ""))
          ))
          | first
          | .version // empty
        '
    )"

    if [[ -n "${applied_version}" ]]; then
      continue
    fi

    pending_count=$((pending_count + 1))
    echo "Applying migration ${basename} via Supabase management API..."
    management_query "$(cat "${migration_file}")" >/dev/null
    management_query "insert into supabase_migrations.schema_migrations(version, name) values ('${basename}', '${migration_name}') on conflict (version) do nothing" >/dev/null
  done
  shopt -u nullglob

  if [[ ${pending_count} -eq 0 ]]; then
    echo "No pending migrations detected; remote schema is current."
  fi
}

smoke_check() {
  local admin_headers partner_headers portal_status

  admin_headers="$(curl -fsS -i -X OPTIONS \
    'https://'"${PROJECT_REF}"'.supabase.co/functions/v1/admin-api' \
    -H 'Origin: https://admin.peuterplannen.nl' \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: authorization,content-type,x-request-id,apikey,x-client-info')"

  partner_headers="$(curl -fsS -i -X OPTIONS \
    'https://'"${PROJECT_REF}"'.supabase.co/functions/v1/create-checkout-session' \
    -H 'Origin: https://partner.peuterplannen.nl' \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: authorization,content-type,x-request-id,apikey,x-client-info')"

  portal_status="$(curl -s -o /dev/null -w '%{http_code}' -X POST \
    'https://'"${PROJECT_REF}"'.supabase.co/functions/v1/create-customer-portal-session')"

  printf '%s\n' "${admin_headers}" > "${OUTPUT_DIR}/admin-api-options.txt"
  printf '%s\n' "${partner_headers}" > "${OUTPUT_DIR}/partner-checkout-options.txt"

  if ! printf '%s\n' "${admin_headers}" | grep -qi 'access-control-allow-headers: .*x-request-id'; then
    echo "Admin API smoke check failed: x-request-id missing from CORS." >&2
    exit 1
  fi

  if ! printf '%s\n' "${partner_headers}" | grep -qi 'access-control-allow-headers: .*x-request-id'; then
    echo "Checkout smoke check failed: x-request-id missing from CORS." >&2
    exit 1
  fi

  if [[ "${portal_status}" != "401" ]]; then
    echo "Customer portal function smoke check failed: expected 401 for unauthenticated POST, got ${portal_status}." >&2
    exit 1
  fi
}

patch_auth_config
deploy_functions
push_migrations_if_needed
smoke_check

echo "Supabase auth, functions, and optional migrations deployed successfully for ${PROJECT_REF}."
