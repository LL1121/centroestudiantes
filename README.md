# Unidos por el IES · Monorepo

Plataforma del Centro de Estudiantes "Unidos por el IES":

- **`frontend/`** — Next.js (App Router) + Tailwind + Lenis. Landing pública
  y módulo `/biblioteca` (Biblioteca Digital).
- **`backend/`** — FastAPI async + PostgreSQL/`pgvector`. Autenticación,
  almacenamiento de material e infraestructura RAG.
- **`docker-compose.yml`** — Stack completo (db + backend + frontend) sobre
  la red externa compartida `lyntrix_network` (deploy del centro).
- **`docker-compose.biblioteca.yml`** — Mismo stack pero **aislado**: red
  default propia del compose, sin dependencias externas. Pensado para correr
  la Biblioteca en su propio servidor.

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

| Servicio   | Hostname interno         | Puerto interno | Expuesto al host |
| ---------- | ------------------------ | -------------- | ---------------- |
| `db`       | `centro-postgres`        | 5432           | no               |
| `backend`  | `centro-backend`         | 8000           | no               |
| `frontend` | `centro-frontend`        | 3000           | `3005:3000`      |

> Como `lyntrix_network` es **external** y compartida con otros stacks,
> el backend **no** apunta a `db` (ese alias puede colisionar con la
> Postgres de otro proyecto que también lo declare). Se conecta por el
> `container_name` `centro-postgres`, que es único globalmente en la red.

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

En cada arranque del contenedor `db`, un wrapper del entrypoint alinea la
contraseña del volumen con `POSTGRES_PASSWORD` del `.env` (socket local).

Las migraciones de Alembic corren automáticamente en el `entrypoint.sh`
del backend, así que la primera ejecución ya deja la DB lista.

### 3b) Crear admin y errores de contraseña Postgres

```bash
docker compose exec backend python -m app.scripts.create_admin \
    --email admin@ies.edu.ar --full-name "Admin"
```

Si ves `password authentication failed for user "postgres"`:

1. Verificá que el `.env` de la **raíz** (junto al `docker-compose.yml`)
   tenga el `POSTGRES_PASSWORD` que querés usar.
2. Confirmá que **no estás conectándote a otra Postgres** del servidor
   (otros stacks en `lyntrix_network`). Desde el contenedor backend:

   ```bash
   docker compose exec backend sh -c \
       'getent hosts centro-postgres && getent hosts db || true'
   ```

   La primera línea (alias por `container_name`) debe resolver al IP del
   `centro-postgres`. Si `db` resuelve a otra IP, es porque otro stack
   también registró ese alias — el backend igual usa `centro-postgres`.

3. Volvé a levantar (el sync corre solo):

   ```bash
   docker compose up -d
   ```

Manual (si hace falta):

```bash
docker compose exec db /usr/local/bin/sync-password.sh
docker compose up -d --force-recreate backend
```

### 4) Cloudflare Tunnel

Apuntá los hostnames públicos a los servicios docker. En el config de
`cloudflared`:

```yaml
ingress:
  - hostname: biblioteca.ies9018malargue.edu.ar
    service: http://centro-frontend:3000
  - hostname: api.biblioteca.ies9018malargue.edu.ar
    service: http://centro-backend:8000
  - service: http_status:404
```

> El sitio principal del IES (`https://ies9018malargue.edu.ar/`) sigue
> sirviéndose desde su WordPress habitual. Este stack solo expone el
> subdominio `biblioteca.*` y su API.

Asegurate de que el contenedor `cloudflared` esté en la misma
`lyntrix_network`. Usá los **container_name** (`centro-frontend`,
`centro-backend`), no `frontend` ni `backend`: en una red compartida
esos alias suelen colisionar con otros stacks y Cloudflare termina en
otra app → **404 Not Found**.

### 5) Comprobaciones

En el servidor (debe responder HTML, no 404):

```bash
curl -sI http://127.0.0.1:3005/ | head -3
curl -sI http://127.0.0.1:3005/biblioteca/login | head -3
```

Si eso funciona pero el dominio no, el tunnel apunta al contenedor equivocado.

- `https://biblioteca.ies9018malargue.edu.ar` — landing y `/biblioteca`.
- `https://api.biblioteca.ies9018malargue.edu.ar/health` — debe
  responder `{"status":"ok"}`.
- `https://api.biblioteca.ies9018malargue.edu.ar/docs` — Swagger UI
  (podés protegerla luego con CF Access si querés).

## Deploy AISLADO de la Biblioteca (servidor propio)

Si la Biblioteca corre en su propio servidor, sin compartir red con otros
stacks, usá `docker-compose.biblioteca.yml`. Este compose crea su red
default y los servicios se resuelven por `container_name`
(`biblioteca-postgres`, `biblioteca-backend`, `biblioteca-frontend`), con
volúmenes propios (`biblioteca_pgdata`, `biblioteca_storage`).

```bash
cp .env.example .env   # editá JWT_SECRET, POSTGRES_PASSWORD, etc.
docker compose -f docker-compose.biblioteca.yml up -d --build
```

| Servicio   | Hostname interno      | Puerto interno | Expuesto al host |
| ---------- | --------------------- | -------------- | ---------------- |
| `db`       | `biblioteca-postgres` | 5432           | no               |
| `backend`  | `biblioteca-backend`  | 8000           | no               |
| `frontend` | `biblioteca-frontend` | 3000           | `3005:3000`      |

El frontend queda publicado en `http://<servidor>:3005`. Apuntá ahí tu
Cloudflare Tunnel / reverse proxy (hostname
`biblioteca.ies9018malargue.edu.ar`). Como el frontend pega al backend por
proxies internos de Next.js, no hace falta exponer el puerto 8000.

Para parar/actualizar solo este stack sin tocar el del centro:

```bash
docker compose -f docker-compose.biblioteca.yml down
docker compose -f docker-compose.biblioteca.yml up -d --build
```

### Notas operativas

- **Storage**: el material subido se persiste en el volumen
  `centro_storage` montado en `/app/var/storage` dentro del backend.
- **Cookies**: el flag `Secure` se infiere de `X-Forwarded-Proto` (Cloudflare
  envía `https` aunque el contenedor escuche HTTP). Si entrás por
  `http://IP:3005` sin tunnel, definí `COOKIE_SECURE=false` en `.env` o usá
  el dominio HTTPS del tunnel.
- **CORS**: `CORS_ORIGINS` arranca en `https://biblioteca.ies9018malargue.edu.ar`.
  El frontend igualmente usa proxies internos (route handlers de
  Next.js) → no necesita CORS para sí mismo.
- **OCR**: la imagen del backend incluye `tesseract-ocr` con paquetes
  `spa+eng`. Modificá `OCR_LANGS` si necesitás otro idioma.

## Roadmap

1. Infra + Auth — **OK**
2. Storage RAID + validación magic numbers — **OK**
3. RAG: extracción, chunking, embeddings, pgvector — **OK**
4. UI chat + guardrails LLM — **OK**
