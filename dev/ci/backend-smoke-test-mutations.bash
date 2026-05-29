#!/bin/bash
# Mutation smoke tests: create depot, product category, and product; verify via list APIs.
# Requires: curl, jq
set -euo pipefail

SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://0.0.0.0:8184/api}"
CONFIG_ID=1
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

CURL_HEADERS=(
  --insecure
  -s
  -H 'Accept: */*'
  -H 'Accept-Language: en-US,en'
  -H 'Cache-Control: no-cache'
  -H 'Connection: keep-alive'
  -H 'Pragma: no-cache'
  -H 'Referer: http://0.0.0.0:8184/'
  -H 'Sec-GPC: 1'
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
)

AUTH=(-b "$COOKIE_JAR")

expect_2xx() {
  local method="$1"
  local path="$2"
  shift 2
  local http_code
  http_code="$(
    curl -X "$method" "${CURL_HEADERS[@]}" -o /dev/null -w "%{http_code}" \
      "$@" \
      "${SMOKE_BASE_URL}${path}"
  )"
  if [[ ! "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "FAIL $method $path — HTTP $http_code (expected 2xx)" >&2
    exit 1
  fi
  echo "OK   $method $path — HTTP $http_code"
}

request_json() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  shift 3
  local out http_code
  out="$(mktemp)"
  if [[ -n "$body" ]]; then
    http_code="$(
      curl -X "$method" "${CURL_HEADERS[@]}" -w "%{http_code}" -o "$out" \
        -H 'Content-Type: application/json' \
        "${AUTH[@]}" \
        "$@" \
        -d "$body" \
        "${SMOKE_BASE_URL}${path}"
    )"
  else
    http_code="$(
      curl -X "$method" "${CURL_HEADERS[@]}" -w "%{http_code}" -o "$out" \
        "${AUTH[@]}" \
        "$@" \
        "${SMOKE_BASE_URL}${path}"
    )"
  fi
  if [[ ! "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "FAIL $method $path — HTTP $http_code (expected 2xx)" >&2
    cat "$out" >&2
    rm -f "$out"
    exit 1
  fi
  cat "$out"
  rm -f "$out"
  echo "OK   $method $path — HTTP $http_code" >&2
}

post_json() {
  local path="$1"
  local json="$2"
  request_json POST "$path" "$json"
}

assert_jq_json() {
  local json="$1"
  local label="${@: -1}"
  set -- "${@:2:$#-2}"
  local jq_err
  jq_err="$(mktemp)"
  if ! echo "$json" | jq -e "$@" > /dev/null 2>"$jq_err"; then
    echo "FAIL jq assertion: $label" >&2
    if [[ -s "$jq_err" ]]; then
      echo "jq error: $(cat "$jq_err")" >&2
    fi
    echo "Response body:" >&2
    echo "$json" | jq . >&2 2>/dev/null || echo "$json" >&2
    rm -f "$jq_err"
    exit 1
  fi
  rm -f "$jq_err"
  echo "OK   jq: $label"
}

login() {
  echo "Mutation smoke test: logging in as admin:admin"
  expect_2xx GET /user/token \
    -c "$COOKIE_JAR" \
    -H 'authorization: Basic YWRtaW46YWRtaW4='
  echo "Logging successful"
}

login

suffix="$RANDOM"
depot_name="smoke-depot-${suffix}"
category_name="smoke-category-${suffix}"
product_name="smoke-product-${suffix}"

echo "Mutation smoke test: depot create + list"
depot_count_before="$(request_json GET /depot | jq '.depots | length')"

post_json /depot "$(jq -n \
  --arg name "$depot_name" \
  '{
    name: $name,
    address: "Smoke Test St",
    openingHours: "9-5",
    capacity: 12,
    active: true
  }')" >/dev/null

depots_json="$(request_json GET /depot)"
depot_count_after="$(echo "$depots_json" | jq '.depots | length')"
if [[ "$depot_count_after" -le "$depot_count_before" ]]; then
  echo "FAIL: depot count did not increase ($depot_count_before -> $depot_count_after)" >&2
  echo "$depots_json" | jq . >&2 2>/dev/null || echo "$depots_json" >&2
  exit 1
fi
echo "OK   depot count increased ($depot_count_before -> $depot_count_after)"

assert_jq_json "$depots_json" --arg n "$depot_name" \
  'any(.depots[]?; .name == $n and .active)' \
  "depot $depot_name listed and active"

echo "Mutation smoke test: product category create + list"
category_body="$(post_json /productCategory "$(jq -n \
  --arg name "$category_name" \
  --argjson configId "$CONFIG_ID" \
  '{
    name: $name,
    active: true,
    requisitionConfigId: $configId,
    typ: "SELFGROWN"
  }')")"
category_id="$(echo "$category_body" | jq -r '.id')"
if [[ -z "$category_id" || "$category_id" == "null" ]]; then
  echo "FAIL: product category POST did not return id" >&2
  echo "$category_body" >&2
  exit 1
fi
echo "OK   created product category id=$category_id"

categories_json="$(request_json GET "/productCategory?configId=${CONFIG_ID}")"
assert_jq_json "$categories_json" --arg n "$category_name" \
  'any(.productCategories[]?; .name == $n and .active)' \
  "product category $category_name listed"

echo "Mutation smoke test: product create + list"
post_json /productCategory/product "$(jq -n \
  --arg name "$product_name" \
  --argjson categoryId "$category_id" \
  '{
    name: $name,
    active: true,
    msrp: 1,
    frequency: 30,
    quantity: 20,
    quantityMin: 10,
    quantityMax: 30,
    quantityStep: 5,
    unit: "WEIGHT",
    vatRate: 7,
    productCategoryId: $categoryId
  }')" >/dev/null

categories_json="$(request_json GET "/productCategory?configId=${CONFIG_ID}")"
assert_jq_json "$categories_json" \
  --arg n "$product_name" \
  --argjson cid "$category_id" \
  'any(.productCategories[]?; .id == $cid and any(.products[]?; .name == $n and .active))' \
  "product $product_name listed under category $category_id"

echo "Mutation smoke test: all checks passed"
