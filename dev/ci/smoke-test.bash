#!/bin/bash
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:8184}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3100}"
PHP_URL="${PHP_URL:-http://127.0.0.1:8180}"
SMOKE_USER="${INITIAL_USERNAME:-admin}"
SMOKE_PASS="${INITIAL_PASSWORD:-admin}"

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

section() {
  echo "==> $1"
}

pass() {
  echo "PASS: $1"
}

require_command() {
  if ! command -v "$1" > /dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

run_infrastructure() {
  section "Frontend serves SPA"
  local frontend_body
  frontend_body=$(curl -sf "$FRONTEND_URL/")
  if ! grep -q '<div id="app">' <<< "$frontend_body"; then
    echo "Frontend response does not contain app mount point" >&2
    exit 1
  fi
  pass "Frontend serves SPA"

  section "Backend version endpoint"
  local backend_version
  backend_version=$(curl -sf "$BACKEND_URL/version")
  echo "$backend_version" | jq -e '.buildInfo and .serverTimeZone' > /dev/null
  pass "Backend version endpoint returns valid JSON"

  section "nginx proxies /api to backend"
  local proxied_version
  proxied_version=$(curl -sf "$FRONTEND_URL/api/version")
  echo "$proxied_version" | jq -e '.buildInfo.maintenance != null and .serverTimeZone != null' > /dev/null
  pass "nginx proxies /api/version"

  section "Public text content endpoint"
  local text_content
  text_content=$(curl -sf "$FRONTEND_URL/api/content/text")
  echo "$text_content" | jq -e '.textContent | length > 0' > /dev/null
  pass "Public text content endpoint"

  section "PHP password sidecar"
  local php_welcome
  php_welcome=$(curl -sf "$PHP_URL/")
  if ! grep -q 'Willkommen' <<< "$php_welcome"; then
    echo "PHP sidecar welcome page not found" >&2
    exit 1
  fi

  local php_container php_hash verify_payload verify_response
  php_container=$(docker compose ps -q php)
  php_hash=$(docker exec "$php_container" php -r 'echo password_hash("smoke-test", PASSWORD_DEFAULT);')
  verify_payload=$(
    jq -nc --arg password "smoke-test" --arg hash "$php_hash" \
      '{password: $password, hash: $hash}'
  )
  verify_response=$(
    curl -sf "$PHP_URL/" \
      -X POST \
      -H 'Content-Type: application/json' \
      -d "$verify_payload"
  )
  if ! echo "$verify_response" | jq -e '.verify == true' > /dev/null; then
    echo "Unexpected PHP verify response: $verify_response" >&2
    exit 1
  fi
  pass "PHP password sidecar"
}

run_auth() {
  section "Login sets auth cookie"
  local login_headers login_status
  login_headers=$(mktemp)

  login_status=$(
    curl -s -o /dev/null -w '%{http_code}' \
      -u "$SMOKE_USER:$SMOKE_PASS" \
      -c "$COOKIE_JAR" \
      -D "$login_headers" \
      "$FRONTEND_URL/api/user/token"
  )
  if [ "$login_status" != "204" ]; then
    echo "Expected login status 204, got $login_status" >&2
    exit 1
  fi
  if ! grep -qi '^set-cookie:.*token=' "$login_headers"; then
    echo "Login response did not set token cookie" >&2
    exit 1
  fi
  pass "Login sets auth cookie"

  section "Authenticated user endpoint"
  local users_response
  users_response=$(curl -sf -b "$COOKIE_JAR" "$FRONTEND_URL/api/user")
  echo "$users_response" | jq -e --arg user "$SMOKE_USER" '.users[] | select(.name == $user)' > /dev/null
  pass "Authenticated user endpoint"

  section "Authenticated config endpoint"
  local config_response
  config_response=$(curl -sf -b "$COOKIE_JAR" "$FRONTEND_URL/api/config")
  echo "$config_response" | jq -e '.config.id != null and (.availableConfigs | length > 0)' > /dev/null
  pass "Authenticated config endpoint"

  rm -f "$login_headers"
}

usage() {
  echo "Usage: $0 [all|infrastructure|auth]"
}

main() {
  require_command curl
  require_command jq

  case "${1:-all}" in
    infrastructure)
      run_infrastructure
      ;;
    auth)
      run_auth
      ;;
    all)
      run_infrastructure
      run_auth
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac

  echo "All smoke tests passed."
}

main "$@"
