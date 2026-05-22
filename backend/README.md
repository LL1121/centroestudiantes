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

## Etapas

1. Infra + Auth (este commit) — **listo**
2. Storage RAID + magic numbers
3. RAG: extracción, chunking, embeddings, pgvector
4. UI + guardrails LLM + modos Local/Oráculo
