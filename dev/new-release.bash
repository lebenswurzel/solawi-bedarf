#!/bin/bash

set -e

error() {
  echo "$1" >&2
}

# Function to get the last version from CHANGELOG.md
get_last_version() {
    grep "^# v[0-9]\+\.[0-9]\+\.[0-9]\+" CHANGELOG.md | tail -n 1 | sed 's/^# v//;s/ -.*$//'
}

# Function to check if there are new migrations since last release
has_new_migrations() {
    last_version=$(get_last_version)
    last_tag_date=$(git log -1 --format=%ai "v$last_version" 2>/dev/null || echo "1970-01-01")

    # Check if any migration files were modified after the last release
    if git ls-files --modified backend/src/migrations/* | grep -q "backend/src/migrations/"; then
        return 0
    fi

    # Check if any new migration files were added after the last release
    if git log --since="$last_tag_date" --name-only --pretty=format: | grep -q "^backend/src/migrations/"; then
        return 0
    fi

    return 1
}

# Function to suggest new version
suggest_version() {
    last_version=$(get_last_version)
    IFS='.' read -r major minor bugfix <<< "$last_version"

    if has_new_migrations; then
        # Increase minor version and reset bugfix
        new_minor=$((minor + 1))
        echo "v$major.$new_minor.0"
    else
        # Only increase bugfix version
        new_bugfix=$((bugfix + 1))
        echo "v$major.$minor.$new_bugfix"
    fi
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

# Step 1: Suggest and prompt for the new version
suggested_version=$(suggest_version)
new_version=$(prompt "Enter the new version (suggested: $suggested_version)")

# If user didn't enter anything, use the suggested version
if [[ -z "$new_version" ]]; then
    new_version=$suggested_version
fi

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

# Step 4: Extract release notes from the renamed section
# This assumes that the renamed section is formatted as:
# [vX.Y.Z] - YYYY-MM-DD - Release Title
# followed by the list of changes until the next header.
release_notes=$(sed -n "/^\# $new_version - .*$/,/^\# NEW/p" CHANGELOG.md | sed '1d;$d')
echo "Release notes: $release_notes"

# Step 5: Commit CHANGELOG.md
git add CHANGELOG.md

echo "Commit and push the new release to Github? (y/N)"
echo -n "Are you sure you want to continue? (y/N): "
read -r confirmation

# Proceed only if the user types 'y' or 'Y'
if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
  echo "Operation canceled."
  exit 0
fi

git commit -m "Neues Release $new_version"

# Step 6: Create a new tag
git tag "$new_version"

# Step 7: Push changes and tags to GitHub
git push origin main --tags

# Step 8: Create the GitHub release
gh release create "$new_version" \
    --title "$release_title" \
    --notes "$release_notes"

echo "Release $new_version titled '$release_title' created and published successfully."
