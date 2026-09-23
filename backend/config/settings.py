"""Configurações do backend da Dashboard de clima.

Tudo que muda entre local e produção (Render + Supabase) vem de variável de
ambiente — ver `.env.example`.
"""
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-troque-em-producao')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if host.strip()
]

# O Render expõe o domínio do serviço nessa variável — entra sozinho no
# ALLOWED_HOSTS, sem precisar copiar "xxx.onrender.com" à mão.
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'clima',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # A previsão marítima manda ~6 modelos x 16 dias hora a hora — gzip
    # reduz bastante o tamanho da resposta.
    'django.middleware.gzip.GZipMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Banco: Supabase (Postgres) via DATABASE_URL. Sem a variável, cai num
# SQLite local só pra desenvolvimento rodar sem precisar de Postgres.
#
# No Supabase use a connection string do "Session pooler" (porta 5432) —
# o Render free não tem IPv6 e a conexão direta do Supabase é só IPv6.
# Com o Session pooler, CONN_MAX_AGE=0 (padrão) é o seguro.
_database_url = os.environ.get('DATABASE_URL')
if _database_url:
    DATABASES = {
        'default': dj_database_url.parse(
            _database_url,
            conn_max_age=int(os.environ.get('DB_CONN_MAX_AGE', '0')),
            ssl_require=not DEBUG,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Endpoints da Dashboard são públicos (só leitura de clima), sem login.
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'UNAUTHENTICATED_USER': None,
}

# Cache em memória pras respostas do Open-Meteo (clima muda devagar, e o
# front atualiza a cada 1 min — sem isso cada aba aberta bateria na API).
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS: em produção, liste a URL do frontend (ex.: https://ondas-front.onrender.com)
# em CORS_ALLOWED_ORIGINS. Sem a variável, libera todas as origens.
_cors_origens = [
    origem.strip()
    for origem in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if origem.strip()
]
if _cors_origens:
    CORS_ALLOWED_ORIGINS = _cors_origens
else:
    CORS_ALLOW_ALL_ORIGINS = True

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
