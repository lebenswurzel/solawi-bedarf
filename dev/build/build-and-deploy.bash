#!/bin/bash

SCRIPT_DIR=$(dirname "$0")

# Create buildInfo.ts containing build meta info
$SCRIPT_DIR/create-build-info.bash

# Build the Docker image
docker compose build
