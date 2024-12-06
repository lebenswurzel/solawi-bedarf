#!/bin/bash

BASE_NAME=$(basename $(builtin cd $(dirname $(readlink -f "$0"))/../..; pwd))
CONTAINER=$BASE_NAME-db-1
BACKUPS_DIR=/backups

echo "Cleaning up old backups in $CONTAINER"

docker exec -t $CONTAINER sh -c "/backup_scripts/cleanup_backups_script.sh $BACKUPS_DIR"
if [ $? -ne 0 ]; then
  echo "Error cleaning backups in $BACKUPS_DIR in the container"
  exit 1
fi

echo "Done"
