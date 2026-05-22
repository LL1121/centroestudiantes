# Unidos por el IES · Monorepo

Plataforma del Centro de Estudiantes "Unidos por el IES":

- **`frontend/`** — Next.js (App Router) + Tailwind + Lenis. Landing pública
  y módulo `/biblioteca` (Biblioteca Digital).
- **`backend/`** — FastAPI async + PostgreSQL/`pgvector`. Autenticación,
  almacenamiento de material e infraestructura RAG.
- **`docker-compose.yml`** — Postgres + pgvector para desarrollo local.

## Quickstart

```bash
docker compose up -d db

# Backend
cd backend
cp .env.example .env   # editá JWT_SECRET
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend (en otra terminal)
cd ../frontend
cp .env.local.example .env.local
pnpm install
pnpm dev
```

App en `http://localhost:3000`, API en `http://localhost:8000/docs`.

## Roadmap

1. Infra + Auth — **OK**
2. Storage RAID + validación magic numbers
3. RAG: extracción, chunking, embeddings, pgvector
4. UI chat + guardrails LLM
