#!/bin/bash

DATABASE=solawi
CONTAINER=solawi-bedarf-db-1
NOW=$(date --iso-8601=seconds)
TARGET_PATH=/backups/$DATABASE_$NOW.sql.gz

echo "Backing up database $DATABASE to file $TARGET_PATH (in the container)"
docker exec --user postgres -t $CONTAINER bash -c "pg_dump $DATABASE | gzip > $TARGET_PATH"
if [ $? -ne 0 ]; then
  echo "Error: Failed to create a database backup."
  exit 1
fi
echo "Created backup file $TARGET_PATH"