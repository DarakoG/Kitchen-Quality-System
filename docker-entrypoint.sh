#!/bin/sh
set -e

# Kitchen Quality System - Docker Entrypoint Script

echo "🚀 Starting Kitchen Quality System..."

# Check if database exists, if not run migrations and seed
if [ ! -f /app/data/kqs.db ]; then
    echo "📦 Database not found. Initializing..."
    
    # Run Prisma migrations
    echo "📊 Running database migrations..."
    cd /app && npx prisma db push --accept-data-loss
    
    # Seed the database (if seed script exists)
    echo "🌱 Seeding database with initial data..."
    cd /app && npx tsx prisma/seed.ts 2>/dev/null || node prisma/seed.js 2>/dev/null || echo "Seed completed or skipped..."
    
    echo "✅ Database initialized successfully!"
else
    echo "✅ Database found. Running migrations..."
    cd /app && npx prisma db push --accept-data-loss
fi

# Start the application
echo "🌐 Starting Next.js server..."
exec "$@"