from pathlib import Path
import os
import environ
from datetime import timedelta
from backend.webhook_handler import WebhookHandler
import json

BASE_DIR = Path(__file__).resolve().parent.parent
domain_name = os.environ.get('DOMAIN_NAME', 'backend')

LOGS_DIR = BASE_DIR / 'logs'

def read_secret(secret_name):
    try:
        with open(f'/run/secrets/{secret_name}') as f:
            return f.read().strip()
    except IOError:
        return None

SECRET_KEY = read_secret('django_pass')
DEBUG = False

ALLOWED_HOSTS = ["scraper", "backend", "frontend", "proxy", "solty.bet"]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'channels',
    'corsheaders',
    'daphne',
    'django.contrib.staticfiles',
    'phase',
    'csp',
    'datalog',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'datalog.jwt_middleware.JWTMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'backend.middleware.ServiceExceptionMiddleware',
    'csp.middleware.CSPMiddleware',
]

CSP_DEFAULT_SRC = ("'self'", "https://player.twitch.tv")
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "https://player.twitch.tv")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:", "https://player.twitch.tv")
CSP_CONNECT_SRC = ("'self'", "https://player.twitch.tv", "wss://player.twitch.tv")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_OBJECT_SRC = ("'none'",)
CSP_BASE_URI = ("'self'",)
CSP_FORM_ACTION = ("'self'",)
CSP_FRAME_SRC = ("'self'", "https://player.twitch.tv")
CSP_FRAME_ANCESTORS = ("'self'", "https://solty.bet", "https://www.twitch.tv", "https://www.*.twitch.tv")
CSP_REPORT_URI = "/csp-violation-report-endpoint/"

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000 # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'
REFERRER_POLICY = 'strict-origin-when-cross-origin'
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
}

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'backend.wsgi.application'


# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'soltybet_production',
        'USER': 'solty',
        'PASSWORD': read_secret('db_pass'),
        'HOST': 'db',
        'PORT': '5432',
    }
}

# Password validation
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
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = ['http://scraper', 'http://proxy', 'http://backend:8000', 'http://frontend:3000', 'https://solty.bet', 'wss://solty.bet']

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'ALLOWED_METHODS': ['GET', 'POST', 'PUT', 'DELETE'],
}

# Load Discord webhook URLs from the secret
discord_secret = read_secret('discord')
if discord_secret:
    discord_hooks = json.loads(discord_secret)
else:
    discord_hooks = {}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
            'level': 'DEBUG',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOGS_DIR, 'error.log'),
            'formatter': 'simple',
            'level': 'ERROR',
        },
        'webhook_info': {
            'level': 'INFO',
            'class': 'backend.webhook_handler.WebhookHandler',
            'webhook_url': discord_hooks.get('info', {}).get('hook', ''),
            'formatter': 'simple',
        },
        'webhook_warning': {
            'level': 'WARNING',
            'class': 'backend.webhook_handler.WebhookHandler',
            'webhook_url': discord_hooks.get('warning', {}).get('hook', ''),
            'formatter': 'simple',
        },
        'webhook_error': {
            'level': 'ERROR',
            'class': 'backend.webhook_handler.WebhookHandler',
            'webhook_url': discord_hooks.get('error', {}).get('hook', ''),
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file', 'webhook_info', 'webhook_warning', 'webhook_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file', 'webhook_info', 'webhook_warning', 'webhook_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'backend': {
            'handlers': ['console', 'file', 'webhook_info', 'webhook_warning', 'webhook_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'datalog': {
            'handlers': ['console', 'webhook_info', 'webhook_warning', 'webhook_error'],
            'level': 'INFO',
            'propagate': False,
        },
        '': {
            'handlers': ['file', 'console', 'webhook_warning', 'webhook_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'jwt_auth': {
            'handlers': ['console', 'file', 'webhook_warning', 'webhook_error'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['file', 'console', 'webhook_warning', 'webhook_error'],
        'level': 'WARNING',
        'propagate': False,
    },
}

ASGI_APPLICATION = 'backend.asgi.application'

CHANNELS_ALLOWED_ORIGINS = ['http://scraper', 'https://solty.bet', 'wss://solty.bet']
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                {
                    "address": "rediss://redis:6380",
                    "ssl_cert_reqs": "required",
                    "ssl_certfile": "/run/secrets/certificate",
                    "ssl_keyfile": "/run/secrets/key",
                    "ssl_ca_certs": "/run/secrets/ca_certificate",
                }
            ],
        },
    },
}

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')