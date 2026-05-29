#!/bin/bash
set -euo pipefail

SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://0.0.0.0:8184/api}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

CURL_COMMON=(
  --insecure
  -s
  -o /dev/null
  -H 'Accept: */*'
  -H 'Accept-Language: en-US,en'
  -H 'Cache-Control: no-cache'
  -H 'Connection: keep-alive'
  -H 'Pragma: no-cache'
  -H 'Referer: http://0.0.0.0:8184/'
  -H 'Sec-GPC: 1'
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
)

expect_2xx() {
  local method="$1"
  local path="$2"
  shift 2
  local http_code
  http_code="$(
    curl -X "$method" "${CURL_COMMON[@]}" -w "%{http_code}" \
      "$@" \
      "${SMOKE_BASE_URL}${path}"
  )"
  if [[ ! "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "FAIL $method $path — HTTP $http_code (expected 2xx)" >&2
    exit 1
  fi
  echo "OK   $method $path — HTTP $http_code"
}

login() {
  echo "Smoke test: logging in as admin:admin"
  # base64(admin:admin) -> YWRtaW46YWRtaW4=
  expect_2xx GET /user/token \
    -c "$COOKIE_JAR" \
    -H 'authorization: Basic YWRtaW46YWRtaW4='
  echo "Logging successful"
}

echo "Smoke test: unauthenticated sanity check"
expect_2xx GET /version?id=0

login

echo "Smoke test: authenticated API checks"
AUTH=(-b "$COOKIE_JAR")

expect_2xx GET /user "${AUTH[@]}"
expect_2xx GET '/config?configId=1' "${AUTH[@]}"
expect_2xx GET /depot "${AUTH[@]}"
expect_2xx GET '/productCategory?configId=1' "${AUTH[@]}"
expect_2xx GET '/applicant?state=NEW' "${AUTH[@]}"
expect_2xx GET '/shipments?configId=1&includeItems=false&shipmentType=NORMAL' "${AUTH[@]}"
expect_2xx GET '/commercialDeliveries?includeItems=false' "${AUTH[@]}"
expect_2xx GET /users/commercial "${AUTH[@]}"
expect_2xx GET '/bi?configId=1' "${AUTH[@]}"
expect_2xx GET '/bi/availabilityWeights?configId=1' "${AUTH[@]}"
expect_2xx GET '/overview?configId=1' "${AUTH[@]}"
expect_2xx GET /error-log "${AUTH[@]}"

echo "Smoke test: all checks passed"
