#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
while ! nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
  sleep 1
done
echo "PostgreSQL is up."

python manage.py makemigrations users --noinput
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Create default superadmin if not exists
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@exam.local', 'admin123', role='admin')
    print('Default admin created: admin / admin123')
"

exec gunicorn auth_service.wsgi:application \
     --bind 0.0.0.0:8000 \
     --workers 2 \
     --timeout 120 \
     --access-logfile - \
     --error-logfile -
