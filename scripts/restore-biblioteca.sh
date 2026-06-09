#!/usr/bin/env bash
# ============================================================================
# Restaura un backup de la Biblioteca Digital en un SERVER NUEVO.
#
# Pasos previos en el server nuevo:
#   1. git clone <repo> && cd CentroEstudiantes
#   2. Copiá el bundle (biblioteca_backup_<fecha>.tar.gz) a esta carpeta.
#   3. docker compose -f docker-compose.biblioteca.yml up -d db   (solo la DB)
#   4. ./scripts/restore-biblioteca.sh biblioteca_backup_<fecha>.tar.gz
#
# El script restaura el .env, los archivos subidos y la base de datos.
# Al terminar, levantá el resto del stack.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUNDLE="${1:?Uso: restore-biblioteca.sh <biblioteca_backup_FECHA.tar.gz>}"
DB_CONTAINER="${DB_CONTAINER:-biblioteca-postgres}"

if [[ ! -f "$BUNDLE" ]]; then
  echo "No existe el archivo '$BUNDLE'." >&2
  exit 1
fi

echo "==> Descomprimiendo bundle…"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
tar xzf "$BUNDLE" -C "$TMP"
SRC="$(find "$TMP" -maxdepth 1 -type d -name 'biblioteca_*' | head -1)"
if [[ -z "$SRC" ]]; then
  echo "El bundle no tiene la estructura esperada." >&2
  exit 1
fi

# .env: no pisar si ya existe uno configurado.
if [[ -f .env ]]; then
  echo "==> Ya existe .env; dejo el del backup como .env.from-backup"
  cp "$SRC/.env" .env.from-backup
else
  echo "==> Restaurando .env…"
  cp "$SRC/.env" .env
fi

set -a
# shellcheck disable=SC1091
source .env
set +a
: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_PASSWORD:?Definí POSTGRES_PASSWORD en .env}"
: "${POSTGRES_DB:=centro}"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "El contenedor '$DB_CONTAINER' no está corriendo." >&2
  echo "Levantá la DB primero: docker compose -f docker-compose.biblioteca.yml up -d db" >&2
  exit 1
fi

echo "==> Restaurando archivos subidos…"
STORAGE_VOL="$(docker volume ls --format '{{.Name}}' | grep 'biblioteca_storage$' | head -1)"
if [[ -z "$STORAGE_VOL" ]]; then
  echo "No encontré el volumen '*_biblioteca_storage'. Levantá el stack una vez para crearlo." >&2
  exit 1
fi
docker run --rm \
  -v "$STORAGE_VOL":/data \
  -v "$SRC":/backup:ro \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/storage.tar.gz -C /data"

echo "==> Restaurando base de datos ($POSTGRES_DB)…"
docker cp "$SRC/db.dump" "$DB_CONTAINER":/tmp/db.dump
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  pg_restore -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner /tmp/db.dump
docker exec "$DB_CONTAINER" rm -f /tmp/db.dump

echo
echo "✓ Restore completo."
echo "Levantá el resto del stack:"
echo "  docker compose -f docker-compose.biblioteca.yml up -d"
