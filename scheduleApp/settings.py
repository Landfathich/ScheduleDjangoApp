import os
import sys
import uuid
from pathlib import Path

import dj_database_url
import environ
from django.conf.global_settings import DATABASES

env = environ.Env()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

# SECURITY WARNING: keep the secret key used in production secret!
# Если это collectstatic, используем дефолтный ключ
if 'collectstatic' in sys.argv:
    SECRET_KEY = 'temp-key-for-collectstatic'
elif not DEBUG:
    SECRET_KEY = env('DJANGO_SECRET_KEY')
else:
    SECRET_KEY = 'django-insecure-dev-key-for-local-development'

# Настройки HTTPS
if not DEBUG:
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
else:
    # Настройки для разработки
    PWA_APP_DEBUG_MODE = True

    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False
    SECURE_SSL_REDIRECT = False

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

ALLOWED_HOSTS = [
    'kodamaclass.com',  # Основной домен
    'schedule.kodamaclass.com',  # домен для расписания
    'test.schedule.kodamaclass.com',  # тестовый домен для расписания
    'localhost',  # Для локального тестирования
    '127.0.0.1',  # Для дебага
]

CSRF_TRUSTED_ORIGINS = [
    'https://kodamaclass.com',
    'https://schedule.kodamaclass.com',
    'https://test.schedule.kodamaclass.com',
]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'daphne',
    'channels',
    'django.contrib.contenttypes',
    'django_admin_inline_paginator',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'core.apps.CoreConfig',
    'materials.apps.MaterialsConfig',
    'django_cleanup.apps.CleanupConfig',
    'safedelete',
    'phonenumber_field',
    'pwa',
    'django.contrib.humanize',
    'finance.apps.FinanceConfig',
    'tasks',
    'finance.apps.FinanceConfig',
    'chat.apps.ChatConfig',
    'webpush',
]

if DEBUG:
    INSTALLED_APPS += [
        'django_extensions',
    ]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'scheduleApp.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ASGI_APPLICATION = 'scheduleApp.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

WSGI_APPLICATION = 'scheduleApp.wsgi.application'

import logging


# Цвета для терминала
class ColorFormatter(logging.Formatter):
    COLORS = {
        'DEBUG': '\033[94m',  # Синий
        'INFO': '\033[92m',  # Зелёный
        'WARNING': '\033[93m',  # Жёлтый
        'ERROR': '\033[91m',  # Красный
        'CRITICAL': '\033[95m',  # Фиолетовый
    }
    RESET = '\033[0m'

    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.RESET)
        record.asctime = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        message = super().format(record)
        return f"{log_color}{message}{self.RESET}"


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'colored': {
            '()': ColorFormatter,
            'format': '[{levelname}] {asctime} {name}: {message}',
            'style': '{',
        },
    },

    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'colored',
        },
    },

    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },

    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

# Базовые настройки SQLite (для разработки)
db_config = {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': BASE_DIR / 'db.sqlite3',
}

# Переопределяем если есть DATABASE_URL
if 'DATABASE_URL' in os.environ:
    db_config = dj_database_url.parse(
        os.environ['DATABASE_URL'],
        conn_max_age=600,
        ssl_require=not DEBUG
    )

# Итоговый словарь
DATABASES = {
    'default': db_config
}

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

# Языковые настройки
LANGUAGE_CODE = 'ru-RU'  # Основной язык для России
LANGUAGES = [
    ('ru', 'Русский'),
    ('en', 'English'),
]

# Региональные настройки
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True  # Включение интернационализации
USE_L10N = True  # Локализация форматов
USE_TZ = True  # Работа с часовыми поясами

# Форматы даты и времени
DATE_FORMAT = 'd.m.Y'
TIME_FORMAT = 'H:i'
DATETIME_FORMAT = 'd.m.Y H:i'
FIRST_DAY_OF_WEEK = 1  # Понедельник как первый день недели

FORMAT_MODULE_PATH = [
    'formats.ru',
]

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = '/static/'  # e.g. localhost:80/static/styles.css
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # Для collectstatic

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'core/static'),
    os.path.join(BASE_DIR, 'materials/static'),
    os.path.join(BASE_DIR, 'chat/static'),
]

# Новая система STORAGES для Django 4.2+
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
}

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOGIN_URL = 'login'  # Перенаправление на страницу входа

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'PAGE_SIZE': 10,
}

MEDIA_URL = '/media/'  # e.g. localhost:80/media/image.jpg
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

PWA_SERVICE_WORKER_PATH = os.path.join(BASE_DIR, 'templates', 'serviceworker.js')

PWA_APP_NAME = 'Уроки'
PWA_APP_DESCRIPTION = "Система управления расписанием в школе Kodama"
PWA_APP_THEME_COLOR = '#1a56db'  # Синий цвет Kodama
PWA_APP_BACKGROUND_COLOR = '#ffffff'  # Белый фон
PWA_APP_DISPLAY = 'standalone'
PWA_APP_SCOPE = '/'
PWA_APP_ID = '/'
PWA_APP_ORIENTATION = 'any'
PWA_APP_START_URL = '/'
PWA_APP_STATUS_BAR_COLOR = 'default'
PWA_APP_ICONS = [
    {
        'src': '/static/core/images/icons/ic_launcher_160x160.png',
        'sizes': '160x160',
        'type': 'image/png',
    }
]
PWA_APP_ICONS_APPLE = [
    {
        'src': '/static/core/images/icons/ic_launcher_160x160.png',
        'sizes': '160x160',
        'type': 'image/png',
    }
]
PWA_APP_SPLASH_SCREEN = [
    {
        'src': '/static/core/images/icons/ic_launcher_160x160.png',
        'media': '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)'
    }
]
PWA_APP_DIR = 'ltr'
PWA_APP_LANG = 'ru-RU'

# Web Push настройки
WEBPUSH_SETTINGS = {
    "VAPID_PUBLIC_KEY": os.environ.get("VAPID_PUBLIC_KEY", ""),
    "VAPID_PRIVATE_KEY": os.environ.get("VAPID_PRIVATE_KEY", ""),
    "VAPID_ADMIN_EMAIL": "trable228@icloud.com"
}