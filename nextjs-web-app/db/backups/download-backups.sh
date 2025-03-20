#!/bin/bash

# Script to download database backups from Supabase via the dashboard
# Make sure you're logged into the Supabase CLI before running this script

BACKUP_DIR="./nextjs-web-app/db/backups"
DATE_STAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR/raw_$DATE_STAMP"
mkdir -p "$BACKUP_DIR/sql_$DATE_STAMP"

echo "Downloading database backups..."

# These files should be downloaded from the SQL Editor output in Supabase Dashboard
# after running the backup-script.sql

FILES_TO_DOWNLOAD=(
  "profiles_data_backup.csv"
  "credit_history_backup.csv"
  "subscription_history_backup.csv"
  "credit_purchases_backup.csv"
  "profiles_schema_backup.sql"
  "profiles_policies_backup.sql"
  "add_user_credits_function_backup.sql"
  "deduct_user_credits_function_backup.sql"
  "reset_daily_credits_function_backup.sql"
  "initialize_user_credits_function_backup.sql"
  "deduct_generation_credit_function_backup.sql"
  "profiles_triggers_backup.sql"
  "create_profiles_backup_table.sql"
)

# Instructions for manual download
echo "===================================================================="
echo "MANUAL BACKUP INSTRUCTIONS:"
echo "===================================================================="
echo "1. Go to the Supabase Dashboard for your project"
echo "2. Navigate to the SQL Editor"
echo "3. Paste and run the contents of backup-script.sql"
echo "4. For each output, click 'Download' and save to $BACKUP_DIR/raw_$DATE_STAMP/"
echo "5. Once all files are downloaded, return to this terminal"
echo "===================================================================="

read -p "Have you completed the manual backup process? (y/n): " completed

if [ "$completed" != "y" ]; then
  echo "Backup process cancelled. Please complete the manual backup steps first."
  exit 1
fi

# Create a full backup script with SQL commands for restoration
cat << EOF > "$BACKUP_DIR/full_restore_$DATE_STAMP.sql"
-- Full Restoration Script for Chaos Coder Database Backup
-- Generated on: $(date)
-- WARNING: Use this script with caution as it will overwrite existing data

-- Create backup tables
$(cat "$BACKUP_DIR/raw_$DATE_STAMP/create_profiles_backup_table.sql")

-- Schema backup
$(cat "$BACKUP_DIR/raw_$DATE_STAMP/profiles_schema_backup.sql")

-- Functions backup
$(cat "$BACKUP_DIR/raw_$DATE_STAMP/add_user_credits_function_backup.sql")
$(cat "$BACKUP_DIR/raw_$DATE_STAMP/deduct_user_credits_function_backup.sql")
$(cat "$BACKUP_DIR/raw_$DATE_STAMP/reset_daily_credits_function_backup.sql")
$(cat "$BACKUP_DIR/raw_$DATE_STAMP/initialize_user_credits_function_backup.sql")
$(cat "$BACKUP_DIR/raw_$DATE_STAMP/deduct_generation_credit_function_backup.sql")

-- Policies backup
$(cat "$BACKUP_DIR/raw_$DATE_STAMP/profiles_policies_backup.sql")

-- Triggers backup
$(cat "$BACKUP_DIR/raw_$DATE_STAMP/profiles_triggers_backup.sql")
EOF

echo "Backup files have been processed."
echo "Complete backup script saved to: $BACKUP_DIR/full_restore_$DATE_STAMP.sql"
echo ""
echo "To restore from this backup, execute the script using the Supabase SQL Editor."
echo "IMPORTANT: Verify that data has been properly backed up before applying any security fixes!" 