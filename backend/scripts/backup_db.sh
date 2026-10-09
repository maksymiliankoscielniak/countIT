#!/usr/bin/env bash
# Dump the countIT database to a compressed, dated SQL file.
#
# Usage (from the backend directory):
#   DATABASE_URL='postgresql://user:password@host/db?sslmode=require' ./scripts/backup_db.sh
#
# Needs the PostgreSQL client tools (pg_dump), version >= the server's.
# The dump contains user data (password hashes, refresh tokens): keep it private
# and never commit it. The backups/ folder is git-ignored.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the database connection string}"

# pg_dump wants a plain postgresql:// URL, not the SQLAlchemy "+psycopg" flavour.
url="${DATABASE_URL/postgresql+psycopg:/postgresql:}"

mkdir -p backups
out="backups/countit-$(date +%Y-%m-%d-%H%M).sql.gz"

pg_dump --no-owner --no-privileges "$url" | gzip > "$out"
echo "Saved $out ($(du -h "$out" | cut -f1))"
