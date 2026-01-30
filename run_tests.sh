#!/bin/bash
set -e

echo "Running Backend Regression Tests..."
docker-compose exec -T backend pytest -v app/tests/

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Tests failed."
    exit 1
fi
