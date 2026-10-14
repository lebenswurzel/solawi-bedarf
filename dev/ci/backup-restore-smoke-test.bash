#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(dirname "$0")
BACKUP_DIR="$SCRIPT_DIR/../../database/backups"

latest_backup=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1 || true)
if [ -z "$latest_backup" ]; then
  echo "No backup file found in $BACKUP_DIR" >&2
  exit 1
fi

backup_filename=$(basename "$latest_backup")
echo "Restoring latest backup: $backup_filename"

"$SCRIPT_DIR/../backup/database-restore.bash" --yes "$backup_filename"

echo "Re-running auth smoke tests after restore ..."
"$SCRIPT_DIR/smoke-test.bash" auth
