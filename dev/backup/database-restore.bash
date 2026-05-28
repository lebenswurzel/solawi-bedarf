#!/bin/bash

DATABASE=solawi
BASE_NAME=$(basename $(builtin cd $(dirname $(readlink -f "$0"))/../..; pwd))
CONTAINER=$BASE_NAME-db-1

AUTO_CONFIRM=false
BACKUP_FILENAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y)
      AUTO_CONFIRM=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--yes] <backup_filename>"
      exit 0
      ;;
    *)
      if [ -n "$BACKUP_FILENAME" ]; then
        echo "Error: Unexpected argument '$1'."
        echo "Usage: $0 [--yes] <backup_filename>"
        exit 1
      fi
      BACKUP_FILENAME=$1
      shift
      ;;
  esac
done

if [ -z "$BACKUP_FILENAME" ]; then
  echo "Error: No backup file specified. The file must exist in the /backups folder in the container"
  echo "Usage: $0 [--yes] <backup_filename>"
  exit 1
fi

BACKUP_PATH=/backups/$BACKUP_FILENAME

echo "Restoring database $DATABASE from file $BACKUP_PATH in the container $CONTAINER"

# Check if the backup file exists
docker exec --user postgres -t $CONTAINER bash -c "[ -f $BACKUP_PATH ]"
if [ $? -ne 0 ]; then
  echo "Error: Backup file $BACKUP_PATH does not exist in the container."
  exit 1
fi

if [ "$AUTO_CONFIRM" != true ]; then
  echo "The existing database will be DELETED!"
  echo -n "Are you sure you want to continue? (y/N): "
  read -r confirmation

  # Proceed only if the user types 'y' or 'Y'
  if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
    echo "Operation canceled."
    exit 0
  fi
fi

# Dropping the existing database
echo "Dropping the existing database..."
dropdb_flags=""
if [ "$AUTO_CONFIRM" = true ]; then
  dropdb_flags="--force"
fi
docker exec --user postgres -t $CONTAINER bash -c "dropdb $dropdb_flags $DATABASE"
if [ $? -ne 0 ]; then
  echo "Error: Failed to drop the database."
  exit 1
fi

# Creating a new database
echo "Creating a new database..."
docker exec --user postgres -t $CONTAINER bash -c "createdb $DATABASE"
if [ $? -ne 0 ]; then
  echo "Error: Failed to create the database."
  exit 1
fi

# Restoring the backup
echo "Restoring the database from the backup file..."
docker exec --user postgres -t $CONTAINER bash -c "gunzip -c $BACKUP_PATH | psql $DATABASE --single-transaction"
if [ $? -ne 0 ]; then
  echo "Error: Failed to restore the database from the backup."
  exit 1
fi

echo "Database restoration completed successfully."
