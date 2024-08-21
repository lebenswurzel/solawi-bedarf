#!/bin/bash

DATABASE=solawi
CONTAINER=solawi-bedarf-db-1
NOW=$(date --iso-8601=seconds)
BACKUPS_DIR=/backups
TARGET_PATH=$BACKUPS_DIR/$DATABASE_$NOW.sql.gz

echo "Backing up database $DATABASE to file $TARGET_PATH (in the container)"

echo "Making $BACKUPS_DIR writable for group 'postgres' to allow writing the backup"
docker exec -t $CONTAINER bash -c "chown :postgres $BACKUPS_DIR && chmod g+w $BACKUPS_DIR"
if [ $? -ne 0 ]; then
  echo "Error: unable to set writable permission to $BACKUPS_DIR"
  exit 1
fi

docker exec --user postgres -t $CONTAINER bash -c "pg_dump $DATABASE | gzip > $TARGET_PATH"
if [ $? -ne 0 ]; then
  echo "Error: Failed to create a database backup."
  exit 1
fi
echo "Created backup file $TARGET_PATH"
