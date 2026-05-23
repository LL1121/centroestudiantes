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

echo "Sincronizando contraseña (servicio one-shot db-password-sync)…"
docker compose run --rm db-password-sync

echo "OK. Levantá el backend:"
echo "  docker compose up -d backend"
