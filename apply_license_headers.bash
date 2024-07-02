#!/bin/bash

# This helper script adds the AGPLv3 banner to source files
# Arguments:
#     --check     only check files for header consistency and exit with code 1 if a
#                 file would be modified by the script

APP_NAME="the SoLawi Bedarf app"

EXCLUDES='/node_modules/|/dist/|vite-env.d.ts|vfs_fonts.ts|eslintrc'
FOLDERS='\./backend|\./frontend|\./shared/src'

MODIFIED_FILE=0

while read -r FILE; do
  if [ ! -f "$FILE" ]; then
    echo "Could not find file $FILE"
    exit 1
  fi

  APP_NAME="$APP_NAME" python3 dev/apply_license_headers.py "$FILE" "$@"

  if [ "$?" != "0" ]; then
    MODIFIED_FILE=1
  fi
done < <(find . -type f -name '*.ts' -o -name '*.js' -o -name '*.vue' | grep -E "$FOLDERS" | grep -v -E "$EXCLUDES")

if [ "$1" == "--check" ]; then
  echo $MODIFIED_FILE
  exit $MODIFIED_FILE
fi
