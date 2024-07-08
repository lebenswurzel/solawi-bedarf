#!/bin/bash

# This helper script adds the AGPLv3 banner to source files
# Arguments:
#     --check     only check files for header consistency and exit with code 1 if a
#                 file would be modified by the script

APP_NAME="the SoLawi Bedarf app"

EXCLUDES='/node_modules/|/dist/|vite-env.d.ts|vfs_fonts.ts|eslintrc|backend/coverage'
FOLDERS='\./backend|\./frontend|\./shared/src'

MODIFIED_FILES=0
COUNT=0

while read -r FILE; do
  if [ ! -f "$FILE" ]; then
    echo "Could not find file $FILE"
    exit 1
  fi

  ((COUNT=COUNT+1))
  APP_NAME="$APP_NAME" python3 dev/apply_license_headers.py "$FILE" "$@"

  if [ "$?" != "0" ]; then
    ((MODIFIED_FILES=MODIFIED_FILES+1))
  fi
done < <(find . -type f -name '*.ts' -o -name '*.js' -o -name '*.vue' | grep -E "$FOLDERS" | grep -v -E "$EXCLUDES")

if [ "$1" == "--check" ]; then
  echo "$MODIFIED_FILES of $COUNT files need header fixing"
  exit $MODIFIED_FILES
fi

echo "Found $COUNT files"
