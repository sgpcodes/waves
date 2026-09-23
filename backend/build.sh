#!/usr/bin/env bash
# Build do Render: instala dependências, junta os estáticos do admin e
# aplica as migrations no banco do Supabase (DATABASE_URL).
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
