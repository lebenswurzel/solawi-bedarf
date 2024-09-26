#!/bin/bash

set -e

error() {
  echo "$1" >&2
}

# Step 0: Verify Current Branch is 'main'
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
    error "Error: You are on branch '$current_branch'. Switch to 'main' to execute the release script."
    exit 1
fi

# Ensure GitHub CLI is installed
if ! command -v gh &> /dev/null
then
    error "GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/"
    exit 1
fi

# Function to prompt user for input
prompt() {
    read -p "$1: " input
    echo "$input"
}

# Step 1: Prompt user for the new version
new_version=$(prompt "Enter the new version (e.g., v1.2.3)")

# Validate the version format (basic check)
if [[ ! "$new_version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    error "Error: Version must follow the format vX.Y.Z (e.g., v1.2.3)"
    exit 1
fi

echo "New version: $new_version"

# Step 2: Prompt user for the release title
release_title=$(prompt "Enter the release title")

if [[ -z "$release_title" ]]; then
    error "Error: Release title cannot be empty."
    exit 1
fi

echo "Release title: $release_title"

# Step 3: Update CHANGELOG.md
if grep -q "^# NEW" CHANGELOG.md; then
    # Rename # NEW to the new version with the release title and date
    current_date=$(date +%Y-%m-%d)
    sed -i.bak "s/^# NEW/# $new_version - $current_date - $release_title/" CHANGELOG.md
    # Add a new # NEW section at the top
    echo -e "\n# NEW" >> CHANGELOG.md
    rm CHANGELOG.md.bak
else
    error "ERROR: CHANGELOG.md does not have a # NEW section."
    exit 1
fi

# Step 4: Commit CHANGELOG.md
git add CHANGELOG.md
git commit -m "chore: release $new_version"

# Step 5: Create a new tag
git tag "$new_version"

# Step 6: Push changes and tags to GitHub
git push origin main --tags

# Step 7: Extract release notes from the renamed section
# This assumes that the renamed section is formatted as:
# [vX.Y.Z] - YYYY-MM-DD - Release Title
# followed by the list of changes until the next header.

release_notes=$(sed -n "/^\# $new_version - .*$/,/^\#/p" CHANGELOG.md | sed '1d;$d')

# Step 8: Create the GitHub release
gh release create "$new_version" \
    --title "$release_title" \
    --notes "$release_notes"

echo "Release $new_version titled '$release_title' created and published successfully."
