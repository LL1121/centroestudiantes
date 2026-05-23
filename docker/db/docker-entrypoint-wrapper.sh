#!/usr/bin/env bash
# Wrapper del entrypoint oficial de Postgres: tras levantar el servidor,
# sincroniza la contraseña del rol con POSTGRES_PASSWORD (socket local / trust).
set -euo pipefail

sync_password_when_ready() {
  for _ in $(seq 1 90); do
    if pg_isready -U "${POSTGRES_USER:-postgres}" -q 2>/dev/null; then
      if /usr/local/bin/sync-password.sh; then
        echo "Postgres: password sync OK"
      else
        echo "Postgres: password sync falló (revisá POSTGRES_PASSWORD en .env)" >&2
      fi
      return 0
    fi
    sleep 1
  done
  echo "Postgres: timeout esperando servidor para sync de contraseña" >&2
}

if [ "${1:-}" = "postgres" ]; then
  sync_password_when_ready &
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
