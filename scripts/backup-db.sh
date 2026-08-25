#!/usr/bin/env bash
set -euo pipefail
ROOT=/home/arvadigital/backups/tracker-system
SECRET=/home/arvadigital/tracker-system/.secure/db_password
mkdir -p "$ROOT"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="$ROOT/tracker_system_${STAMP}.sql.gz"
export PGPASSWORD="$(cat "$SECRET")"
pg_dump --host=127.0.0.1 --port=5432 --username=tracker_app --dbname=tracker_system --no-owner --no-acl | gzip -9 > "$OUT"
gzip -t "$OUT"
chmod 600 "$OUT"
find "$ROOT" -type f -name 'tracker_system_*.sql.gz' -mtime +14 -delete
printf '%s\n' "$OUT"
