#!/bin/bash

SCRIPT_DIR=$(dirname "$0")

# Create buildInfo.ts containing build meta info
$SCRIPT_DIR/create-build-info.bash

# Create a backup of the current database
$SCRIPT_DIR/../backup/database-backup.bash
if [ $? -ne 0 ]; then
  echo "Backup failed ... aborting!"
  exit 1
fi

# Build the Docker images
docker compose build

if [ $? -ne 0 ]; then
  echo "Error: building failed!"
  exit 1
fi
echo "Build successful! Run 'docker compose up -d' to start the new build"
