#!/usr/bin/env bash
# Sincroniza la contraseña del rol Postgres con POSTGRES_PASSWORD del .env.
# Se ejecuta vía socket local (trust) dentro del namespace de red del servicio `db`.
set -euo pipefail

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD no está definida}"
PGUSER="${POSTGRES_USER:-postgres}"

# Escapar comillas simples para SQL: ' → ''
sql_password="${POSTGRES_PASSWORD//\'/\'\'}"

psql -v ON_ERROR_STOP=1 -U "${PGUSER}" -d postgres \
  -c "ALTER USER \"${PGUSER}\" PASSWORD '${sql_password}';"

echo "Postgres: contraseña de '${PGUSER}' alineada con POSTGRES_PASSWORD del .env"
