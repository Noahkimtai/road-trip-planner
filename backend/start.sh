#!/bin/bash

# Exit immediately if a command exits with a non-zero status

set -e

# Collect static files (Needed for CI/CD or seperate volume)
#python manage.py collectstatic --noinput

echo "Applying database migrations"
python manag.py migrate --noinput

# Start Gunicorn (WSGI server)
exec gunicorn myproject.wsgi:application \
    --bind 0.0.0.0.8000 \
    --workers 3 \
    --access-logformat '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

