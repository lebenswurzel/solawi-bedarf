#!/bin/bash
# Pack the newest local database dump with the prod env files, encrypt the
# archive to an age public key, and upload it to a Nextcloud file-drop share.
#
# Skips with exit 0 when env-backup.env is missing. Cron can stay installed
# before offsite backup is configured.
#
# The age private identity must not be on this machine and must not be in the
# archive. KeePass holds that identity.

set -euo pipefail
umask 077

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
CONFIG="$REPO_ROOT/env-backup.env"
BACKUP_DIR="$REPO_ROOT/database/backups"
# database/ is created by Docker as root, so the deploy user cannot write there.
OFFSITE_DIR="$REPO_ROOT/offsite"

if [ ! -f "$CONFIG" ]; then
  echo "Offsite backup is not configured ($CONFIG missing). Skipping."
  exit 0
fi

# Read KEY=VALUE lines. The file is not executed as a shell script.
while IFS= read -r config_line || [ -n "$config_line" ]; do
  config_line="${config_line#"${config_line%%[![:space:]]*}"}"
  config_line="${config_line%$'\r'}"
  case "$config_line" in
    ''|\#*) continue ;;
  esac
  case "$config_line" in
    *=*) ;;
    *)
      echo "Error: invalid line in $CONFIG"
      exit 1
      ;;
  esac
  config_key=${config_line%%=*}
  config_value=${config_line#*=}
  if [[ "$config_key" =~ [^A-Za-z0-9_] ]]; then
    echo "Error: invalid setting name $config_key in $CONFIG"
    exit 1
  fi
  if [ "${#config_value}" -ge 2 ]; then
    case "$config_value" in
      \"*\"|\'*\') config_value=${config_value:1:${#config_value}-2} ;;
    esac
  fi
  case "$config_key" in
    AGE_RECIPIENT) AGE_RECIPIENT=$config_value ;;
    NEXTCLOUD_WEBDAV_URL) NEXTCLOUD_WEBDAV_URL=$config_value ;;
    NEXTCLOUD_SHARE_TOKEN) NEXTCLOUD_SHARE_TOKEN=$config_value ;;
    NEXTCLOUD_SHARE_PASSWORD) NEXTCLOUD_SHARE_PASSWORD=$config_value ;;
    OFFSITE_EXTRA_FILES) OFFSITE_EXTRA_FILES=$config_value ;;
    MAX_DUMP_AGE_SECONDS) MAX_DUMP_AGE_SECONDS=$config_value ;;
    OFFSITE_RETRY_KEEP) OFFSITE_RETRY_KEEP=$config_value ;;
    *)
      echo "Error: unknown setting $config_key in $CONFIG"
      exit 1
      ;;
  esac
done < "$CONFIG"
unset config_line config_key config_value

MAX_DUMP_AGE_SECONDS="${MAX_DUMP_AGE_SECONDS:-21600}"
OFFSITE_RETRY_KEEP="${OFFSITE_RETRY_KEEP:-7}"

if [ -z "${AGE_RECIPIENT:-}" ] || [ -z "${NEXTCLOUD_WEBDAV_URL:-}" ] || [ -z "${NEXTCLOUD_SHARE_TOKEN:-}" ]; then
  echo "Error: env-backup.env must set AGE_RECIPIENT, NEXTCLOUD_WEBDAV_URL, and NEXTCLOUD_SHARE_TOKEN."
  exit 1
fi

case "$AGE_RECIPIENT" in
  AGE-SECRET-KEY-*)
    echo "Error: AGE_RECIPIENT must be the public recipient, not the private identity."
    exit 1
    ;;
esac

case "$NEXTCLOUD_WEBDAV_URL" in
  https://*) ;;
  *)
    echo "Error: NEXTCLOUD_WEBDAV_URL must start with https://"
    exit 1
    ;;
esac

if ! [[ "$MAX_DUMP_AGE_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "Error: MAX_DUMP_AGE_SECONDS must be a non-negative integer."
  exit 1
fi

if ! [[ "$OFFSITE_RETRY_KEEP" =~ ^[0-9]+$ ]]; then
  echo "Error: OFFSITE_RETRY_KEEP must be a non-negative integer."
  exit 1
fi

if ! command -v age >/dev/null 2>&1; then
  echo "Error: age is not installed."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is not installed."
  exit 1
fi

mkdir -p "$OFFSITE_DIR"
chmod 700 "$OFFSITE_DIR"

stage=$(mktemp -d)
chmod 700 "$stage"
plaintext=""
failed=0

cleanup() {
  rm -rf -- "$stage"
  if [ -n "$plaintext" ] && [ -f "$plaintext" ]; then
    rm -f -- "$plaintext"
  fi
}
trap cleanup EXIT

url_encode() {
  local raw="$1"
  local i c hex out=""
  for ((i = 0; i < ${#raw}; i++)); do
    c=${raw:i:1}
    case "$c" in
      [a-zA-Z0-9._-]) out+="$c" ;;
      *)
        printf -v hex '%%%02X' "'$c"
        out+="$hex"
        ;;
    esac
  done
  printf '%s' "$out"
}

upload_one() {
  local file="$1"
  local base url
  base=$(basename "$file")
  # Encode the filename so '+' in the timestamp survives the WebDAV path.
  url="${NEXTCLOUD_WEBDAV_URL%/}/$(url_encode "$base")"
  if curl --fail --silent --show-error --retry 3 \
    --user "${NEXTCLOUD_SHARE_TOKEN}:${NEXTCLOUD_SHARE_PASSWORD:-}" \
    -T "$file" \
    "$url"; then
    rm -f -- "$file"
    echo "Uploaded $base"
    return 0
  fi
  echo "Error: upload failed for $base; kept $file"
  failed=1
  return 0
}

upload_pending() {
  local file
  local pending=()
  shopt -s nullglob
  pending=("$OFFSITE_DIR"/*.tar.age)
  shopt -u nullglob
  for file in "${pending[@]}"; do
    upload_one "$file"
  done
}

prune_retry_buffer() {
  local count overflow i
  local remaining=()
  mapfile -t remaining < <(find "$OFFSITE_DIR" -maxdepth 1 -type f -name '*.tar.age' -printf '%T@ %p\n' | sort -n | cut -d' ' -f2-)
  count=${#remaining[@]}
  overflow=$((count - OFFSITE_RETRY_KEEP))
  if [ "$overflow" -le 0 ]; then
    return
  fi
  for ((i = 0; i < overflow; i++)); do
    echo "Removing old unsent archive ${remaining[$i]}"
    rm -f -- "${remaining[$i]}"
  done
}

refuse_private_identity() {
  local src="$1"
  if grep -q -- 'AGE-SECRET-KEY-' "$src"; then
    echo "Error: $src contains an age private identity and will not be archived."
    exit 1
  fi
}

copy_private() {
  local src="$1"
  local dest="$2"
  refuse_private_identity "$src"
  cp -- "$src" "$dest"
  chmod 600 "$dest"
}

upload_pending

newest=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql.gz' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -n 1 | cut -d' ' -f2- || true)
if [ -z "$newest" ] || [ ! -f "$newest" ]; then
  echo "Error: no database dump in $BACKUP_DIR"
  prune_retry_buffer
  exit 1
fi

now=$(date +%s)
mtime=$(stat -c %Y "$newest")
dump_age=$((now - mtime))
if [ "$dump_age" -gt "$MAX_DUMP_AGE_SECONDS" ]; then
  echo "Error: newest dump $newest is ${dump_age}s old (limit ${MAX_DUMP_AGE_SECONDS}s)."
  prune_retry_buffer
  exit 1
fi

copy_private "$newest" "$stage/$(basename "$newest")"

for required in env-be-prod.env env-db-prod.env .env; do
  if [ ! -f "$REPO_ROOT/$required" ]; then
    echo "Error: missing $REPO_ROOT/$required"
    prune_retry_buffer
    exit 1
  fi
  copy_private "$REPO_ROOT/$required" "$stage/$required"
done

if [ -n "${OFFSITE_EXTRA_FILES:-}" ]; then
  read -r -a extra_files <<< "$OFFSITE_EXTRA_FILES"
  for extra in "${extra_files[@]}"; do
    if [[ "$extra" != /* ]]; then
      extra="$REPO_ROOT/$extra"
    fi
    if [ ! -f "$extra" ]; then
      echo "Error: extra file $extra does not exist."
      prune_retry_buffer
      exit 1
    fi
    extra_base=$(basename "$extra")
    extra_dest="$stage/extra/$extra_base"
    if [ -e "$extra_dest" ]; then
      echo "Error: duplicate extra file name $extra_base"
      prune_retry_buffer
      exit 1
    fi
    mkdir -p "$stage/extra"
    chmod 700 "$stage/extra"
    copy_private "$extra" "$extra_dest"
  done
fi

stamp=$(date +%Y-%m-%dT%H%M%S%N%z)
archive_base="solawi-bedarf-${stamp}.tar"
plaintext="$OFFSITE_DIR/$archive_base"
encrypted="${plaintext}.age"

if [ -e "$plaintext" ] || [ -e "$encrypted" ]; then
  echo "Error: $encrypted already exists."
  plaintext=""
  prune_retry_buffer
  exit 1
fi

tar -C "$stage" -cf "$plaintext" .
if ! age -r "$AGE_RECIPIENT" -o "$encrypted" "$plaintext"; then
  rm -f -- "$plaintext" "$encrypted"
  plaintext=""
  echo "Error: encryption failed."
  prune_retry_buffer
  exit 1
fi
chmod 600 "$encrypted"
rm -f -- "$plaintext"
plaintext=""

if [ ! -s "$encrypted" ]; then
  echo "Error: encrypted archive is empty."
  prune_retry_buffer
  exit 1
fi

echo "Created $encrypted"
upload_one "$encrypted"
prune_retry_buffer

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "Offsite backup finished."
