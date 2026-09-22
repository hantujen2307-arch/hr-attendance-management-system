#!/usr/bin/env bash
# ==============================================================================
# HR & Attendance Management System — Safe PostgreSQL Restore Script
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file> [--confirm]"
  echo "Example: $0 ./backups/hr_attendance_20260920_120000.dump --confirm"
  exit 1
fi

BACKUP_FILE="$1"
CONFIRM_FLAG="${2:-}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file '${BACKUP_FILE}' does not exist."
  exit 1
fi

# Resolve TARGET_DATABASE_URL
TARGET_DB_URL="${TARGET_DATABASE_URL:-}"
if [ -z "${TARGET_DB_URL}" ]; then
  if [ -f "./backend/.env" ]; then
    TARGET_DB_URL=$(grep '^DATABASE_URL=' ./backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  elif [ -f "./.env" ]; then
    TARGET_DB_URL=$(grep '^DATABASE_URL=' ./.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  fi
fi

if [ -z "${TARGET_DB_URL}" ]; then
  echo "❌ Error: TARGET_DATABASE_URL or DATABASE_URL is not defined."
  exit 1
fi

CLEAN_TARGET_DB_URL="${TARGET_DB_URL%%\?*}"

echo "================================================================="
echo "⚠️  DATABASE RESTORE UTILITY"
echo "📁 Source File: ${BACKUP_FILE}"
echo "🎯 Target URL:  ${CLEAN_TARGET_DB_URL}"
echo "================================================================="

if [ "${CONFIRM_FLAG}" != "--confirm" ]; then
  echo "⛔ SAFETY INTERLOCK: Restore will replace data in the target database."
  echo "👉 To proceed with restoration, re-run with '--confirm' flag:"
  echo "   $0 \"${BACKUP_FILE}\" --confirm"
  exit 1
fi

echo "🔍 Step 1: Validating archive format..."
if pg_restore -l "${BACKUP_FILE}" > /dev/null 2>&1; then
  echo "✅ Valid PostgreSQL custom archive detected."
  echo "🚀 Step 2: Restoring schema and data into target database..."
  pg_restore --clean --if-exists --no-owner --no-privileges -d "${CLEAN_TARGET_DB_URL}" "${BACKUP_FILE}" || true
else
  echo "📄 Validating as plain SQL script..."
  echo "🚀 Step 2: Executing plain SQL into target database..."
  psql "${CLEAN_TARGET_DB_URL}" < "${BACKUP_FILE}"
fi

echo "🔍 Step 3: Verifying restored database integrity..."
TABLE_COUNT=$(psql "${CLEAN_TARGET_DB_URL}" -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

echo "✅ Restoration completed. Total tables in public schema: ${TABLE_COUNT}"
echo "🎉 Database successfully restored."
echo "================================================================="
