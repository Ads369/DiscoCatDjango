#!/bin/sh
set -e

echo "Running migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Optionally collect static files in development
echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Django development server with auto-reload..."
exec python manage.py runserver 0.0.0.0:8000
