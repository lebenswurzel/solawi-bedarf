#!/bin/bash

# Get current Git information
GIT_HASH=$(git rev-parse HEAD)
GIT_HASH_SHORT=$(echo $GIT_HASH | cut -c 1-10)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_TAG=$(git describe --tags --exact-match --abbrev=0 2>/dev/null)
GIT_COMMIT_DATE=$(git log -1 --format=%cd)
CURRENT_DATE=$(date)

MAINTENTANCE_ENABLED=false
MAINTENTANCE_MESSAGE=
if [ "$1" == "--maintenance" ]; then
  MAINTENTANCE_ENABLED=true
  MAINTENTANCE_MESSAGE="$2"
fi


TARGET_PATH=buildInfo.ts

# Create json files
cat <<EOF > $TARGET_PATH
import { BuildInfo } from "./types"
export const buildInfo: BuildInfo = {
  buildDate: "$CURRENT_DATE",
  git: {
    hash: "$GIT_HASH",
    hashShort: "$GIT_HASH_SHORT",
    branch: "$GIT_BRANCH",
    tag: "$GIT_TAG",
    commitDate: "$GIT_COMMIT_DATE",
  },
  maintenance: {
    enabled: $MAINTENTANCE_ENABLED,
    message: "$MAINTENTANCE_MESSAGE",
  },
};
EOF

echo "created $TARGET_PATH:"
cat $TARGET_PATH
