#!/bin/bash
# Helper script for running npm commands in a specific directory
# Needed for running custom pre-commit hooks from .pre-commit-config.yaml

(
  cd $1
  npm run $2
  exit $?
)
