#!/bin/bash

# Script to apply security fixes after verifying backups are in place
# Make sure to run this script with a service role account

BACKUP_DIR="./nextjs-web-app/db/backups"
FIX_SCRIPT="./nextjs-web-app/backups/fix-rls-policies.sql"
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "full_restore_*.sql" -type f -printf "%T@ %p\n" | sort -nr | head -1 | cut -d' ' -f2-)

echo "===================================================================="
echo "SECURITY FIX APPLICATION SCRIPT"
echo "===================================================================="

# Check if backups exist
if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No backup files found in $BACKUP_DIR."
  echo "Please run the backup process before applying security fixes."
  echo "You can use the backup-script.sql and download-backups.sh scripts to create backups."
  exit 1
fi

echo "Latest backup found: $LATEST_BACKUP"
echo "Created on: $(stat -c %y "$LATEST_BACKUP")"
echo ""

# Verify fix script exists
if [ ! -f "$FIX_SCRIPT" ]; then
  echo "ERROR: Security fix script not found at $FIX_SCRIPT"
  exit 1
fi

echo "Security fix script: $FIX_SCRIPT"
echo ""
echo "This script will apply the following security fixes:"
echo "  1. Create restrictive RLS policies for the profiles table"
echo "  2. Add a defense-in-depth trigger to prevent direct credit updates"
echo "  3. Create an audit log table for tracking unauthorized attempts"
echo "  4. Update permissions to ensure secure access"
echo ""
echo "IMPORTANT WARNINGS:"
echo "  • These changes will modify database security policies"
echo "  • Ensure you have completed a full backup before proceeding"
echo "  • Application may require updates to work with new policies"
echo ""

read -p "Have you verified that backups are in place and wish to proceed? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
  echo "Security fix application cancelled."
  exit 1
fi

echo ""
echo "To apply the security fixes, follow these steps:"
echo "  1. Go to the Supabase Dashboard for your project"
echo "  2. Navigate to the SQL Editor"
echo "  3. Open the file: $FIX_SCRIPT"
echo "  4. Review the SQL commands carefully"
echo "  5. Execute the script"
echo ""
echo "After applying the fixes, verify that:"
echo "  • The application still functions correctly"
echo "  • Users cannot directly modify their credit balances"
echo "  • The audit log captures any unauthorized attempts"
echo ""
echo "If any issues arise, you can restore from the backup at:"
echo "$LATEST_BACKUP"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."

# Show post-application verification steps
echo ""
echo "===================================================================="
echo "POST-APPLICATION VERIFICATION STEPS"
echo "===================================================================="
echo "1. Verify RLS policies are correctly applied:"
echo "   SELECT * FROM pg_policies WHERE tablename = 'profiles';"
echo ""
echo "2. Test the trigger by attempting a direct credit update:"
echo "   UPDATE profiles SET credits = 999999 WHERE id = '<user-id>';"
echo ""
echo "3. Check if the attempt was logged in the audit log:"
echo "   SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;"
echo ""
echo "4. Ensure legitimate credit operations still work through RPC functions"
echo "====================================================================" 