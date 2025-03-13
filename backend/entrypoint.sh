#!/bin/sh
set -e

echo "Running migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn server..."
exec gunicorn evaluator.wsgi:application --bind 0.0.0.0:8000 --workers 3
