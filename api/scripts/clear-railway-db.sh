#!/bin/bash
# Clear all data from Railway PostgreSQL database
# This script fetches the public database URL and runs the clearDatabase script

set -e

cd "$(dirname "$0")/.."

echo "🔍 Fetching Railway public database URL..."
PUBLIC_URL=$(railway variables --service Postgres --json 2>/dev/null | jq -r '.DATABASE_PUBLIC_URL')

if [ -z "$PUBLIC_URL" ]; then
  echo "❌ Could not fetch DATABASE_PUBLIC_URL from Railway"
  exit 1
fi

echo "🚀 Running database clear script..."
DATABASE_URL="$PUBLIC_URL" npx tsx src/scripts/clearDatabase.ts
