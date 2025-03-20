#!/bin/sh
set -e

echo "----- Collect static files -----"
python manage.py collectstatic --noinput --clear

echo "----- Setting permissions on static files -----"
chmod -R 755 /app/static

echo "----- Apply database migrations -----"
python manage.py makemigrations --noinput
python manage.py migrate --noinput

if [ "$DEBUG" = "True" ]; then
    echo "----- Starting development server -----"
    python manage.py runserver 0.0.0.0:8000
else
    echo "----- Starting production server -----"
    exec gunicorn --bind 0.0.0.0:8000 --workers 2 evaluator.wsgi
fi
