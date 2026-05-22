# Unidos por el IES · Monorepo

Plataforma del Centro de Estudiantes "Unidos por el IES":

- **`frontend/`** — Next.js (App Router) + Tailwind + Lenis. Landing pública
  y módulo `/biblioteca` (Biblioteca Digital).
- **`backend/`** — FastAPI async + PostgreSQL/`pgvector`. Autenticación,
  almacenamiento de material e infraestructura RAG.
- **`docker-compose.yml`** — Stack completo (db + backend + frontend) listo
  para Cloudflare Tunnel.

## Quickstart (desarrollo local sin Docker)

```bash
docker compose up -d db   # solo Postgres+pgvector

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

## Deploy en servidor personal con Cloudflare Tunnel

El stack expone tres servicios sobre la red docker externa
`lyntrix_network` que ya usa tu instancia de `cloudflared`:

| Servicio   | Hostname interno | Puerto interno | Expuesto al host |
| ---------- | ---------------- | -------------- | ---------------- |
| `db`       | `db`             | 5432           | no               |
| `backend`  | `backend`        | 8000           | no               |
| `frontend` | `frontend`       | 3000           | `3005:3000`      |

> El backend **no** publica puerto al host: Cloudflare Tunnel lo alcanza
> directamente por la red docker (`http://backend:8000`).

### 1) Crear la red externa (una sola vez)

```bash
docker network create lyntrix_network
```

### 2) Variables de entorno

```bash
cp .env.example .env
# editá JWT_SECRET, POSTGRES_PASSWORD y, si usás OpenAI/Groq,
# EMBEDDING_BACKEND / LLM_BACKEND + sus API keys.
```

### 3) Levantar el stack

```bash
docker compose build
docker compose up -d
```

Las migraciones de Alembic corren automáticamente en el `entrypoint.sh`
del backend, así que la primera ejecución ya deja la DB lista.

### 4) Cloudflare Tunnel

Apuntá los hostnames públicos a los servicios docker. En el config de
`cloudflared`:

```yaml
ingress:
  - hostname: prueba.lyntrix.com.ar
    service: http://frontend:3000
  - hostname: api-prueba.lyntrix.com.ar
    service: http://backend:8000
  - service: http_status:404
```

Asegurate de que el contenedor `cloudflared` esté en la misma
`lyntrix_network` para que pueda resolver `frontend` y `backend` por DNS
interno de docker.

### 5) Comprobaciones

- `https://prueba.lyntrix.com.ar` — landing y `/biblioteca`.
- `https://api-prueba.lyntrix.com.ar/health` — debe responder
  `{"status":"ok"}`.
- `https://api-prueba.lyntrix.com.ar/docs` — Swagger UI (podés
  protegerla luego con CF Access si querés).

### Notas operativas

- **Storage**: el material subido se persiste en el volumen
  `centro_storage` montado en `/app/var/storage` dentro del backend.
- **Cookies**: en `production` se setean con `secure=true`. Cloudflare
  termina TLS, así que el navegador siempre ve HTTPS.
- **CORS**: `CORS_ORIGINS` arranca en `https://prueba.lyntrix.com.ar`.
  El frontend igualmente usa proxies internos (route handlers de
  Next.js) → no necesita CORS para sí mismo.
- **OCR**: la imagen del backend incluye `tesseract-ocr` con paquetes
  `spa+eng`. Modificá `OCR_LANGS` si necesitás otro idioma.

## Roadmap

1. Infra + Auth — **OK**
2. Storage RAID + validación magic numbers — **OK**
3. RAG: extracción, chunking, embeddings, pgvector — **OK**
4. UI chat + guardrails LLM — **OK**
