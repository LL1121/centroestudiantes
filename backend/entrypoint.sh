#!/usr/bin/env bash
set -euo pipefail

# Aplica migraciones antes de levantar la API.
alembic upgrade head

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${APP_PORT:-8000}" \
    --proxy-headers \
    --forwarded-allow-ips="*"
