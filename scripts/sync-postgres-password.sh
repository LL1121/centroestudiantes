#!/usr/bin/env bash
# Alinea la contraseña del usuario Postgres en el volumen existente con .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Falta .env en la raíz del proyecto. Copiá .env.example → .env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_PASSWORD:?Definí POSTGRES_PASSWORD en .env}"
: "${POSTGRES_DB:=centro}"

if ! docker compose ps --status running db 2>/dev/null | grep -q db; then
  echo "El contenedor db no está corriendo. Levantalo con: docker compose up -d db" >&2
  exit 1
fi

# Escapar comillas simples para SQL: ' → ''
sql_password="${POSTGRES_PASSWORD//\'/\'\'}"

echo "Sincronizando contraseña de '${POSTGRES_USER}' con POSTGRES_PASSWORD del .env…"
docker compose exec -T db psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 \
  -c "ALTER USER \"${POSTGRES_USER}\" PASSWORD '${sql_password}';"

echo "OK. Recreá el backend para que tome la URL nueva:"
echo "  docker compose up -d --force-recreate backend"
