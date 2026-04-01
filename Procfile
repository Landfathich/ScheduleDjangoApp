release: python manage.py migrate --noinput
web: daphne scheduleApp.asgi:application --bind 0.0.0.0 --port $PORT