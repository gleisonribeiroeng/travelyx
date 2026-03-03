#!/bin/sh
set -e

echo "=== Startup Debug ==="
echo "DATABASE_URL set: ${DATABASE_URL:+yes}"
echo "PGHOST set: ${PGHOST:+yes}"
echo "RAILWAY_ENVIRONMENT set: ${RAILWAY_ENVIRONMENT:+yes}"

# If DATABASE_URL is not set, try to build it from PG* variables
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not found, checking PG* variables..."
  if [ -n "$PGHOST" ] && [ -n "$PGUSER" ] && [ -n "$PGPASSWORD" ] && [ -n "$PGDATABASE" ]; then
    export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE}"
    echo "DATABASE_URL built from PG* variables"
  else
    echo "ERROR: Neither DATABASE_URL nor PG* variables are available!"
    echo "Available env vars:"
    printenv | sort | cut -d= -f1
    exit 1
  fi
fi

echo "DATABASE_URL starts with: $(echo $DATABASE_URL | cut -c1-30)..."
echo "=== Starting app ==="

cd /app/backend
npx prisma migrate deploy
node dist/main
