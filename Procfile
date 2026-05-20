release: python manage.py migrate --noinput
web: gunicorn scheduleApp.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120