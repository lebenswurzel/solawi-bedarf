#!/bin/bash

DATABASE=solawi
CONTAINER=solawi-bedarf-db-1
BACKUP_PATH=/backups/$1

if [ -z "$1" ]; then
  echo "Error: No backup file specified. The file must exist in the /backups folder in the container"
  echo "Usage: $0 <backup_filename_without_extension>"
  exit 1
fi

echo "Restoring database $DATABASE from file $BACKUP_PATH (in the container)"

# Check if the backup file exists
docker exec --user postgres -t $CONTAINER bash -c "[ -f $BACKUP_PATH ]"
if [ $? -ne 0 ]; then
  echo "Error: Backup file $BACKUP_PATH does not exist in the container."
  exit 1
fi

echo "The existing database will be DELETED!"
echo -n "Are you sure you want to continue? (y/N): "
read -r confirmation

# Proceed only if the user types 'y' or 'Y'
if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
  echo "Operation canceled."
  exit 0
fi

# Dropping the existing database
echo "Dropping the existing database..."
docker exec --user postgres -t $CONTAINER bash -c "dropdb $DATABASE"
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
docker exec --user postgres -t $CONTAINER bash -c "psql $DATABASE --single-transaction -f $BACKUP_PATH"
if [ $? -ne 0 ]; then
  echo "Error: Failed to restore the database from the backup."
  exit 1
fi

echo "Database restoration completed successfully."
