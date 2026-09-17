-- =============================================================================
-- Init DB dedicada en postgres_core (una sola vez)
-- =============================================================================
-- Requisito: el contenedor `postgres_core` debe estar en la red `proxy_net` y
-- preferiblemente ser una imagen con pgvector (ej. pgvector/pgvector:pg16),
-- porque la biblioteca usa extensión `vector` + `pg_trgm`.
--
-- Ejecutar como superuser (ajustá el user admin de tu postgres_core):
--
--   docker exec -i postgres_core psql -U postgres < docker/db/init-postgres-core.sql
--
-- O desde otro host en proxy_net:
--   psql "postgresql://postgres:ADMIN_PASS@postgres_core:5432/postgres" \
--     -f docker/db/init-postgres-core.sql
--
-- Después alineá .env:
--   DB_USER=centro_app
--   DB_PASSWORD=<la misma de abajo>
--   DB_NAME=centro_estudiantes
--   DATABASE_URL=postgresql://centro_app:...@postgres_core:5432/centro_estudiantes
--
-- Las tablas las crea Alembic al arrancar centro_api (entrypoint: alembic upgrade head).
-- =============================================================================

-- Rol de aplicación (solo esta DB)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'centro_app') THEN
    CREATE ROLE centro_app LOGIN PASSWORD 'cambia-esta-pass-segura';
  ELSE
    ALTER ROLE centro_app WITH LOGIN PASSWORD 'cambia-esta-pass-segura';
  END IF;
END
$$;

-- Base dedicada
SELECT 'CREATE DATABASE centro_estudiantes OWNER centro_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'centro_estudiantes')\gexec

-- Privilegios
GRANT ALL PRIVILEGES ON DATABASE centro_estudiantes TO centro_app;

\connect centro_estudiantes

-- Extensiones requeridas por el monorepo (biblioteca)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Schema defaults para el rol de app
GRANT ALL ON SCHEMA public TO centro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO centro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO centro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO centro_app;
