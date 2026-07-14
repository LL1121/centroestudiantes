# pnpm 11.x (lockfile v9) requiere Node >= 22.13 (usa node:sqlite)
ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=11.2.2

# ----------- deps -----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable \
    && corepack prepare "pnpm@${PNPM_VERSION}" --activate

# Copiamos manifiestos del workspace completo para que pnpm resuelva las dependencias internas
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/branding/package.json ./packages/branding/
COPY apps/biblioteca/package.json ./apps/biblioteca/

RUN pnpm install --frozen-lockfile

# ----------- builder -----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable \
    && corepack prepare "pnpm@${PNPM_VERSION}" --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/biblioteca/node_modules ./apps/biblioteca/node_modules

COPY pnpm-workspace.yaml package.json ./
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/branding/ ./packages/branding/
COPY apps/biblioteca/ ./apps/biblioteca/

# Build args para la biblioteca
ARG NEXT_PUBLIC_BIBLIOTECA_ONLY=false
ENV NEXT_PUBLIC_BIBLIOTECA_ONLY=${NEXT_PUBLIC_BIBLIOTECA_ONLY}
ARG NEXT_PUBLIC_COPYRIGHT_ENABLED=false
ENV NEXT_PUBLIC_COPYRIGHT_ENABLED=${NEXT_PUBLIC_COPYRIGHT_ENABLED}
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/biblioteca
RUN node scripts/copy-pdf-worker.mjs && node scripts/copy-webgazer.mjs && pnpm build

# ----------- runner -----------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/biblioteca/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/biblioteca/.next/static ./apps/biblioteca/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/biblioteca/public ./apps/biblioteca/public

USER nextjs

EXPOSE 3000

# No pegarle a "/" — en biblioteca eso hace SSR dinámico y martilla el backend.
HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/biblioteca/server.js"]
