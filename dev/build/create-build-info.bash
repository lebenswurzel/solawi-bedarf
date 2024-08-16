#!/bin/bash

# Get current Git information
GIT_HASH=$(git rev-parse HEAD)
GIT_HASH_SHORT=$(echo $GIT_HASH | cut -c 1-10)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
GIT_COMMIT_DATE=$(git log -1 --format=%cd)
CURRENT_DATE=$(date)


TARGET_PATH=buildInfo.ts

# Create json files
cat <<EOF > $TARGET_PATH
export const buildInfo = {
  buildDate: "$CURRENT_DATE",
  git: {
    hash: "$GIT_HASH",
    hashShort: "$GIT_HASH_SHORT",
    branch: "$GIT_BRANCH",
    tag: "$GIT_TAG",
    commitDate: "$GIT_COMMIT_DATE",
  }
};
EOF

echo "created $TARGET_PATH:"
cat $TARGET_PATH
