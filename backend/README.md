# Biblioteca Digital · API

Servicio FastAPI (async) que provee autenticación, almacenamiento de material,
indexado vectorial (`pgvector`) y RAG para la Biblioteca Digital de
**Unidos por el IES**.

## Stack

- Python 3.11+ · FastAPI · SQLAlchemy 2 async · asyncpg
- PostgreSQL 16 + pgvector
- Alembic (migraciones) · PyJWT · bcrypt

## Quickstart

```bash
cp .env.example .env

docker compose -f ../docker-compose.yml up -d db

python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs interactivos en `http://localhost:8000/docs`.

## Estructura

```
app/
  api/v1/routes/   # endpoints HTTP
  core/            # settings, seguridad (JWT, hashing)
  db/              # sesión async + Base declarativa
  models/          # tablas SQLAlchemy
  schemas/         # DTOs pydantic
  services/        # storage, futuro RAG, futuros guardrails
alembic/           # migraciones
```

## Dependencias del sistema (Etapa 3)

Para OCR sobre JPEG/PNG hace falta `tesseract` instalado:

```bash
sudo apt install -y tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng
```

Si OCR falla porque tesseract no está, el material queda con `status='failed'`
y el resto del sistema sigue operativo.

## Etapas

1. Infra + Auth — **listo**
2. Storage RAID + magic numbers — **listo**
3. RAG: extracción, chunking, embeddings, pgvector — **listo**
4. UI + guardrails LLM + modos Local/Oráculo — **listo**

## Crear / promover un admin

Hay un comando dedicado, registrado como `create-admin` por
`pyproject.toml`. También se puede invocar como módulo:

```bash
# Local (con la venv activada)
create-admin --email admin@ies.edu.ar --full-name "Admin Principal"

# O en el contenedor de producción
docker compose exec backend python -m app.scripts.create_admin \
    --email admin@ies.edu.ar --full-name "Admin Principal"
```

Si no se pasa `--password`, lo solicita por consola (sin eco). También
acepta `ADMIN_EMAIL`, `ADMIN_FULL_NAME` y `ADMIN_PASSWORD` por entorno,
útil para automatizar el primer setup:

```bash
ADMIN_EMAIL=admin@ies.edu.ar \
ADMIN_FULL_NAME="Admin" \
ADMIN_PASSWORD='cambia-esto' \
docker compose exec -T backend python -m app.scripts.create_admin
```

Si el usuario ya existe, lo promueve a `admin` y lo deja activo. Para
resetearle el password, agregá `--force-password`.

## Crear un usuario común (alumno / moderador)

Para usuarios que no son admin existe `create-user`:

```bash
# Por defecto crea con rol `alumno`
docker compose exec backend python -m app.scripts.create_user \
    --email juan@ies.edu.ar --full-name "Juan Pérez"

# Moderador
docker compose exec backend python -m app.scripts.create_user \
    --email mod@ies.edu.ar --full-name "Mod" --role moderador

# Sin prompt (CI / scripts)
USER_EMAIL=juan@ies.edu.ar \
USER_FULL_NAME="Juan Pérez" \
USER_PASSWORD='cambia-esto' \
docker compose exec -T backend python -m app.scripts.create_user
```

A diferencia de `create-admin`, si el usuario ya existe **no** lo modifica
salvo que pases:

- `--force-password` → resetea la contraseña.
- `--allow-role-update` → actualiza rol y reactiva la cuenta si estaba
  desactivada.

Para promover a `admin` usá siempre `create-admin` (jamás se asigna ese
rol desde `create-user`).

### Error `InvalidPasswordError` en Docker

Postgres solo fija la contraseña en el **primer** arranque del volumen. Si
cambiaste `POSTGRES_PASSWORD` en `.env` después, ejecutá desde la raíz del
monorepo:

```bash
./scripts/sync-postgres-password.sh
docker compose up -d --force-recreate backend
```
