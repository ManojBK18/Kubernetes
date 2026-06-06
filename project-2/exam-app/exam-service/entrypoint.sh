#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
while ! nc -z "$DB_HOST" "${DB_PORT:-5432}"; do sleep 1; done
echo "PostgreSQL is up."

python manage.py makemigrations exams --noinput
python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec gunicorn exam_service.wsgi:application \
     --bind 0.0.0.0:8000 \
     --workers 2 \
     --timeout 120 \
     --access-logfile - \
     --error-logfile -

