#!/bin/bash

if [ -f "env-be-prod.env" ]; then
  echo "Error: env-be-prod.env already exists. Aborting!"
  exit 1
fi
if [ -f "env-db-prod.env" ]; then
  echo "Error: env-db-prod.env already exists. Aborting!"
  exit 1
fi

cp env-be-dev.env env-be-prod.env
cp env-db-dev.env env-db-prod.env
