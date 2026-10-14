#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(dirname "$0")
exec "$SCRIPT_DIR/smoke-test.bash" "$@"
