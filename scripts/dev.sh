#!/bin/bash

echo "🚀 Starting Marketplace API in Development Mode"
echo "================================================"

# Check if .env.development exists
if [ ! -f .env.development ]; then
    echo "❌ Error: .env.development file not found!"
    echo "   Please copy .env.development from the template and update with your Neon credentials."
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "   Please start Docker Desktop and try again."
    exit 1
fi

# Create .neon_local directory if it doesn't exist
mkdir -p .neon_local

# Add .neon_local to .gitignore if not already present
if ! grep -q ".neon_local/" .gitignore 2>/dev/null; then
    echo ".neon_local/" >> .gitignore
    echo "✅ Added .neon_local/ to .gitignore"
fi

echo "📦 Building and starting development containers..."
echo "   - Neon Local proxy will create an ephemeral database branch"
echo "   - Application will run with hot reload enabled"
echo ""

# Start development environment (detached first to run migrations)
docker compose -f docker-compose.dev.yml up --build -d

# Wait for neon-local's Envoy proxy on port 5432 (multiplexes HTTP/WS/PG)
echo "⏳ Waiting for Neon Local to be fully ready..."
docker compose -f docker-compose.dev.yml exec app sh -c 'until nc -z neon-local 5432 2>/dev/null; do sleep 2; done'
# Allow Envoy's WebSocket and HTTP routes to fully initialize after the port is open
sleep 5

# Run migrations inside the app container where DATABASE_URL is set
echo "📜 Applying latest schema with Drizzle..."
docker compose -f docker-compose.dev.yml exec app npx tsx scripts/migrate.ts

echo ""
echo "🎉 Development environment started!"
echo "   Application: http://localhost:5500"
echo "   Database: postgres://neon:npg@localhost:5434/neondb"
echo ""
echo "To stop the environment, press Ctrl+C or run: docker compose -f docker-compose.dev.yml down"
echo ""

# Follow logs (blocks until Ctrl+C)
docker compose -f docker-compose.dev.yml logs -f
