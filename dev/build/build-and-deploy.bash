#!/bin/bash

usage() {
  echo "Usage: $0 (init|update) [--maintentance MESSAGE]"
}

if [ -z "$1" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  echo "Script for inital deployment and updating the app. Must be called with 'init' or 'update' as argument."
  usage
  exit 1
fi

if [ "$1" != "init" ] && [ "$1" != "update" ]; then
  echo "Error: Unsupported option '$1'."
  usage
  exit 1
fi

if [ "$2" != "" ] && [ "$2" != "--maintenance" ]; then
  echo "Error: Unsupported option '$2'."
  usage
  exit 1
fi

SCRIPT_DIR=$(dirname "$0")

# Create buildInfo.ts containing build meta info
$SCRIPT_DIR/create-build-info.bash $2 "$3"

if [ "$1" = "update" ]; then
  # Create a backup of the current database
  $SCRIPT_DIR/../backup/database-backup.bash
  if [ $? -ne 0 ]; then
    echo "Backup failed ... aborting!"
    exit 1
  fi
fi

# Build the Docker images
docker compose build

if [ $? -ne 0 ]; then
  echo "Error: building failed!"
  exit 1
fi

echo "Build successful! Run 'docker compose up -d' to start the new build"
