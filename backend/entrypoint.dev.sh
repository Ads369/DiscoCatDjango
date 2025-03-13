set -e

echo "Running migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo "Starting Django development server with auto-reload..."
exec python manage.py runserver 0.0.0.0:8000
