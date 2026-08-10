#!/bin/bash
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:8184}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3100}"
TIMEOUT="${WAIT_TIMEOUT:-120}"
INTERVAL="${WAIT_INTERVAL:-2}"

wait_for_url() {
  local name=$1
  local url=$2
  local elapsed=0

  echo "Waiting for $name at $url ..."
  while [ "$elapsed" -lt "$TIMEOUT" ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo "$name is ready (${elapsed}s)"
      return 0
    fi
    sleep "$INTERVAL"
    elapsed=$((elapsed + INTERVAL))
  done

  echo "Timeout waiting for $name at $url after ${TIMEOUT}s"
  return 1
}

wait_for_compose_health() {
  local services=(db be fe php)
  local elapsed=0

  echo "Waiting for compose service healthchecks ..."
  while [ "$elapsed" -lt "$TIMEOUT" ]; do
    local all_healthy=true
    for service in "${services[@]}"; do
      local health
      health=$(docker compose ps "$service" --format '{{.Health}}' 2>/dev/null || true)
      if [ -n "$health" ] && [ "$health" != "healthy" ]; then
        all_healthy=false
        break
      fi
    done

    if [ "$all_healthy" = true ]; then
      echo "All compose healthchecks passed (${elapsed}s)"
      return 0
    fi

    sleep "$INTERVAL"
    elapsed=$((elapsed + INTERVAL))
  done

  echo "Timeout waiting for compose healthchecks after ${TIMEOUT}s"
  docker compose ps
  return 1
}

wait_for_compose_health
wait_for_url "backend" "$BACKEND_URL/version"
wait_for_url "frontend (nginx proxy)" "$FRONTEND_URL/api/version"
