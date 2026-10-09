#!/usr/bin/env bash
set -e

# Run database migrations. A temporarily unreachable database (e.g. a sleeping or
# expired free-tier instance) must not take the whole API down: product search
# does not need the database, so we retry a few times and then start anyway.
echo "Running database migrations..."
migrated=false
for attempt in 1 2 3 4 5; do
  if alembic upgrade head; then
    migrated=true
    break
  fi
  echo "Migration attempt ${attempt}/5 failed; retrying in 5s..."
  sleep 5
done

if [ "$migrated" != "true" ]; then
  echo "WARNING: database migrations failed - starting API anyway. Login and saved data will not work until DATABASE_URL points to a reachable database." >&2
fi

# Start the application
echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
