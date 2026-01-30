#!/bin/bash
set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/agentic_db_$TIMESTAMP.sql"

# Create backup dir if not exists
mkdir -p $BACKUP_DIR

echo "📦 Creating database backup..."
docker-compose exec -T db pg_dump -U user agentic_db > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_FILE"
    
    # Optional: Keep only last 5 backups
    ls -t $BACKUP_DIR/*.sql | tail -n +6 | xargs -I {} rm -- {} 2>/dev/null || true
else
    echo "❌ Backup failed!"
    exit 1
fi
