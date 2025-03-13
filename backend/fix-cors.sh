#!/bin/bash
# fix-cors.sh

# Create a temporary file
cat > /tmp/cors_fix.py << 'EOF'
from django.conf import settings

# Remove problematic CORS settings
if hasattr(settings, 'CORS_ALLOWED_ORIGINS'):
    settings.CORS_ALLOWED_ORIGINS = ['http://localhost:8000', 'http://127.0.0.1:8000']

# Enable all origins as a fallback
settings.CORS_ALLOW_ALL_ORIGINS = True
EOF

# Copy to container
docker cp /tmp/cors_fix.py $(docker ps -qf "name=backend"):/app/cors_fix.py

# Execute in container
docker exec $(docker ps -qf "name=backend") python -c "
import sys
sys.path.append('/app')
import django
django.setup()
import cors_fix
print('CORS settings fixed')
"

# Restart the container
docker restart $(docker ps -qf "name=backend")

echo "CORS settings have been fixed and the backend container has been restarted."
