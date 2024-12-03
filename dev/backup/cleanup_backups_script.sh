#!/bin/sh

# Set default backup directory if not provided
BACKUP_DIR="${1:-/backups}"

# Retention settings (in days)
KEEP_ALL_DAYS=3
KEEP_DAILY_DAYS=7
KEEP_WEEKLY_WEEKS=28  # 4 weeks
KEEP_MONTHLY_MONTHS=180  # 6 months

# Ensure the backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory $BACKUP_DIR does not exist"
    exit 1
fi

# Function to extract date from filename
extract_date() {
    echo "$1" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}'
}

# Function to calculate days between two dates
days_between() {
    # Convert dates to timestamp
    local date1=$(date -d "$1" +%s)
    local date2=$(date -d "$2" +%s)

    # Calculate and return absolute difference in days
    echo $(( (date2 - date1) / 86400 ))
}

# Get current date
NOW=$(date +%Y-%m-%d)

# Collect and process backup files
cd "$BACKUP_DIR" || exit 1

# Temporary files to track backups to keep
KEEP_FILE=$(mktemp)
DAILY_KEEP=$(mktemp)
WEEKLY_KEEP=$(mktemp)
MONTHLY_KEEP=$(mktemp)

# Process all backup files
for file in *; do
    # Skip if not a file
    [ -f "$file" ] || continue

    # Extract date from filename
    FILE_DATE=$(extract_date "$file")
    [ -z "$FILE_DATE" ] && continue

    # Calculate days since backup
    DAYS_AGO=$(days_between "$FILE_DATE" "$NOW")

    # Rule 1: Keep all backups for the past 3 days
    if [ "$DAYS_AGO" -le "$KEEP_ALL_DAYS" ]; then
        echo "$file" >> "$KEEP_FILE"
        continue
    fi

    # Rule 2: Keep latest backup of each day for 7 days
    if [ "$DAYS_AGO" -le "$KEEP_DAILY_DAYS" ]; then
        # Store only if no backup for this date exists
        if ! grep -q "^$FILE_DATE" "$DAILY_KEEP"; then
            echo "$FILE_DATE $file" >> "$DAILY_KEEP"
        fi
        continue
    fi

    # Rule 3: Keep latest backup of each week for 4 weeks
    WEEK=$(date -d "$FILE_DATE" +%Y-%W)
    if [ "$DAYS_AGO" -le "$KEEP_WEEKLY_WEEKS" ]; then
        # Store only if no backup for this week exists
        if ! grep -q "^$WEEK" "$WEEKLY_KEEP"; then
            echo "$WEEK $file" >> "$WEEKLY_KEEP"
        fi
        continue
    fi

    # Rule 4: Keep one backup per month for 6 months
    MONTH=$(date -d "$FILE_DATE" +%Y-%m)
    if [ "$DAYS_AGO" -le "$KEEP_MONTHLY_MONTHS" ]; then
        # Store only if no backup for this month exists
        if ! grep -q "^$MONTH" "$MONTHLY_KEEP"; then
            echo "$MONTH $file" >> "$MONTHLY_KEEP"
        fi
        continue
    fi
done

# Extract files to keep from each list
cut -d' ' -f2- "$DAILY_KEEP" >> "$KEEP_FILE"
cut -d' ' -f2- "$WEEKLY_KEEP" >> "$KEEP_FILE"
cut -d' ' -f2- "$MONTHLY_KEEP" >> "$KEEP_FILE"

# Find and delete files not in keep list
for file in *; do
    [ -f "$file" ] || continue
    if ! grep -qx "$file" "$KEEP_FILE"; then
        echo "Deleting: $file"
        rm "$file"
    fi
done

# Clean up temporary files
rm "$KEEP_FILE" "$DAILY_KEEP" "$WEEKLY_KEEP" "$MONTHLY_KEEP"
