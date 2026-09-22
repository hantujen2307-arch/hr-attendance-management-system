#!/usr/bin/env bash
# ==============================================================================
# HR & Attendance Management System — Automated PostgreSQL Backup Script
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/hr_attendance_${TIMESTAMP}.dump"
SQL_BACKUP_FILE="${BACKUP_DIR}/hr_attendance_${TIMESTAMP}.sql"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Resolve DATABASE_URL from environment or backend/.env
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "./backend/.env" ]; then
    DATABASE_URL=$(grep '^DATABASE_URL=' ./backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  elif [ -f "./.env" ]; then
    DATABASE_URL=$(grep '^DATABASE_URL=' ./.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not defined."
  exit 1
fi

# Clean Prisma query parameters (e.g. ?schema=public) for native pg_dump compatibility
CLEAN_DB_URL="${DATABASE_URL%%\?*}"

mkdir -p "${BACKUP_DIR}"

echo "================================================================="
echo "📦 Starting HR & Attendance Database Backup"
echo "📅 Timestamp: ${TIMESTAMP}"
echo "📁 Destination: ${BACKUP_FILE}"
echo "================================================================="

# 1. Execute Custom Archive Dump (compressed, fast, flexible for selective restores)
pg_dump -Fc --no-owner --no-privileges "${CLEAN_DB_URL}" -f "${BACKUP_FILE}"

# 2. Verify backup archive integrity
echo "🔍 Verifying backup archive header..."
if pg_restore -l "${BACKUP_FILE}" > /dev/null 2>&1; then
  FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "✅ Custom dump successfully verified (${FILE_SIZE})"
else
  echo "❌ Error: Backup verification failed. File may be corrupted."
  exit 1
fi

# 3. Optional plain SQL dump for portability / visual inspection
if [ "${GENERATE_PLAIN_SQL:-false}" = "true" ]; then
  echo "📄 Generating plain SQL dump: ${SQL_BACKUP_FILE}..."
  pg_dump --clean --if-exists --no-owner "${CLEAN_DB_URL}" -f "${SQL_BACKUP_FILE}"
  echo "✅ Plain SQL dump created."
fi

# 4. Retention cleanup (rotate backups older than RETENTION_DAYS)
echo "🧹 Applying retention policy (${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -type f -name "hr_attendance_*.dump" -mtime +"${RETENTION_DAYS}" -exec rm -f {} +
find "${BACKUP_DIR}" -type f -name "hr_attendance_*.sql" -mtime +"${RETENTION_DAYS}" -exec rm -f {} +

echo "🎉 Backup completed successfully."
echo "================================================================="
