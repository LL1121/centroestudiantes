#!/usr/bin/env bash
# ============================================================================
# Backup COMPLETO de la Biblioteca Digital para migrar de servidor.
#
# Respalda:
#   1. Base de datos PostgreSQL (pg_dump formato custom, incluye pgvector).
#   2. Archivos subidos (volumen `biblioteca_storage`: PDFs, EPUBs, imágenes).
#   3. El archivo .env (secrets: contraseña DB, JWT, API keys).
#
# Ejecutar EN EL SERVER VIEJO, parado en la raíz del proyecto:
#   ./scripts/backup-biblioteca.sh
#
# Genera un único archivo:  biblioteca_backup_<fecha>.tar.gz
# Copiá ese archivo al server nuevo (scp) y usá restore-biblioteca.sh.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_CONTAINER="${DB_CONTAINER:-biblioteca-postgres}"

if [[ ! -f .env ]]; then
  echo "Falta .env en la raíz del proyecto." >&2
  exit 1
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
  echo "Levantá al menos la DB: docker compose -f docker-compose.biblioteca.yml up -d db" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
WORK="backups/biblioteca_${STAMP}"
mkdir -p "$WORK"

echo "==> 1/4  Dump de la base de datos ($POSTGRES_DB)…"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "$WORK/db.dump"

echo "==> 2/4  Archivos subidos (volumen storage)…"
STORAGE_VOL="$(docker volume ls --format '{{.Name}}' | grep 'biblioteca_storage$' | head -1)"
if [[ -z "$STORAGE_VOL" ]]; then
  echo "No encontré el volumen '*_biblioteca_storage'." >&2
  echo "Volúmenes disponibles:" >&2
  docker volume ls --format '  {{.Name}}' >&2
  exit 1
fi
docker run --rm \
  -v "$STORAGE_VOL":/data:ro \
  -v "$ROOT/$WORK":/backup \
  alpine tar czf /backup/storage.tar.gz -C /data .

echo "==> 3/4  Copiando .env…"
cp .env "$WORK/.env"

echo "==> 4/4  Empaquetando todo…"
BUNDLE="biblioteca_backup_${STAMP}.tar.gz"
tar czf "$BUNDLE" -C backups "biblioteca_${STAMP}"
rm -rf "$WORK"

SIZE="$(du -h "$BUNDLE" | cut -f1)"
echo
echo "✓ Backup listo: $BUNDLE  ($SIZE)"
echo
echo "Pasalo al server nuevo, por ejemplo:"
echo "  scp $BUNDLE usuario@server-nuevo:~/"
