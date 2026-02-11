#!/bin/bash

echo "🚀 Starting Marketplace API in Production Mode"
echo "==============================================="

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "   Please create .env.production with your production environment variables."
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "   Please start Docker and try again."
    exit 1
fi

echo "📦 Building and starting production container..."
echo "   - Using Neon Cloud Database (no local proxy)"
echo "   - Running in optimized production mode"
echo ""

# Build and start production environment
docker compose -f docker-compose.prod.yml up --build -d

# Wait for the container to be healthy
echo "⏳ Waiting for application to be ready..."
until docker inspect --format='{{.State.Health.Status}}' marketplace-api-prod 2>/dev/null | grep -q "healthy"; do
    sleep 2
done

# Run migrations inside the container where DATABASE_URL is set via .env.production
echo "📜 Applying latest schema with Drizzle..."
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit migrate

echo ""
echo "🎉 Production environment started!"
echo "   Application: http://localhost:5500"
echo ""
echo "Useful commands:"
echo "   View logs:  docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop app:   docker compose -f docker-compose.prod.yml down"
