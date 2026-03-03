#!/bin/sh
set -e

echo "=== Startup Debug ==="
echo "DATABASE_URL length: ${#DATABASE_URL}"
echo "DATABASE_URL value: $(echo "$DATABASE_URL" | head -c 40)"
echo "RAILWAY_SERVICE_NAME: $RAILWAY_SERVICE_NAME"

# If DATABASE_URL is empty, try RAILWAY reference variables
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is empty!"

  # Check for DATABASE_PRIVATE_URL or DATABASE_PUBLIC_URL
  if [ -n "$DATABASE_PRIVATE_URL" ]; then
    export DATABASE_URL="$DATABASE_PRIVATE_URL"
    echo "Using DATABASE_PRIVATE_URL"
  elif [ -n "$DATABASE_PUBLIC_URL" ]; then
    export DATABASE_URL="$DATABASE_PUBLIC_URL"
    echo "Using DATABASE_PUBLIC_URL"
  elif [ -n "$PGHOST" ]; then
    export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE}"
    echo "Built from PG* variables"
  else
    echo "No database URL found. Listing all vars with values:"
    printenv | grep -iE "^(DATABASE|PG|POSTGRES)" || echo "(none)"
    exit 1
  fi
fi

echo "Final DATABASE_URL starts with: $(echo "$DATABASE_URL" | head -c 35)..."
echo "=== Starting app ==="

cd /app/backend
npx prisma migrate deploy
exec node dist/main
