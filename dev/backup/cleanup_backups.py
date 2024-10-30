import os
import re
import sys
from datetime import datetime, timedelta
from collections import defaultdict


def collect_backup_files(backup_dir):

  # Define retention periods
  today = datetime.now()
  keep_all_for_days = 3
  keep_daily_for_days = 7
  keep_weekly_for_weeks = 4
  keep_monthly_for_months = 6

  # Regex pattern to extract date from filename
  date_pattern = re.compile(r"(\d{4}-\d{2}-\d{2})T")

  # Get all backup files with their dates
  backup_files = []
  for filename in os.listdir(backup_dir):
      match = date_pattern.search(filename)
      if match:
          file_date = datetime.strptime(match.group(1), "%Y-%m-%d")
          backup_files.append((file_date, filename))

  # Sort by date (newest first)
  backup_files.sort(reverse=True, key=lambda x: x[0])

  # Categorize backups to keep
  to_keep = set()
  daily_backups = defaultdict(list)
  weekly_backups = defaultdict(list)
  monthly_backups = defaultdict(list)

  for file_date, filename in backup_files:
      delta_days = (today - file_date).days

      # Rule 1: Keep all backups for the past 3 days
      if delta_days <= keep_all_for_days:
          to_keep.add(filename)
          continue

      # Rule 2: Keep the latest backup of each day for the past 7 days
      if delta_days <= keep_daily_for_days:
          if file_date.date() not in daily_backups:
              daily_backups[file_date.date()] = filename
          continue

      # Rule 3: Keep the latest backup of each week for the past 4 weeks
      if delta_days <= keep_weekly_for_weeks * 7:
          week = file_date.isocalendar().week
          year_week = (file_date.year, week)
          if year_week not in weekly_backups:
              weekly_backups[year_week] = filename
          continue

      # Rule 4: Keep one backup per month for the past 6 months
      if delta_days <= keep_monthly_for_months * 30:
          month = file_date.month
          year_month = (file_date.year, month)
          if year_month not in monthly_backups:
              monthly_backups[year_month] = filename
          continue

  # Consolidate backups to keep
  to_keep.update(daily_backups.values())
  to_keep.update(weekly_backups.values())
  to_keep.update(monthly_backups.values())
  to_delete = set(f[1] for f in backup_files) - to_keep
  return sorted(os.path.join(backup_dir, f) for f in to_delete)


def delete_files(file_list):
  # Delete backups not in the 'to_keep' set
  for filename in file_list:
        os.remove(filename)
        print(f"Deleted: {filename}")


if __name__ == '__main__':
  backups_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), 'database/backups')
  print(f'Cleaning up backup files in {backups_path}')
  to_delete = collect_backup_files(backups_path)
  print(f'Found {len(to_delete)} files for deletion')
  delete_files(to_delete)
