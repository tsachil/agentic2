#!/bin/bash
set -e

# Function to clean up containers on exit
cleanup() {
    echo "Cleaning up..."
    docker-compose down
}

# Trap EXIT signal to call cleanup function
trap cleanup EXIT

echo "Starting services..."
docker-compose up -d --wait

echo "Running Backend Regression Tests..."
docker-compose exec -T backend pytest -v app/tests/

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Tests failed."
    exit 1
fi
