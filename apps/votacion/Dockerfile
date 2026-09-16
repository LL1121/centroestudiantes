# Next.js (apps/votacion) — standalone multistage, usuario no-root
# Contexto de build: raíz del monorepo
ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=11.2.2

# ----------- deps -----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable \
    && corepack prepare "pnpm@${PNPM_VERSION}" --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/branding/package.json ./packages/branding/
COPY apps/votacion/package.json ./apps/votacion/

RUN pnpm install --frozen-lockfile

# ----------- builder -----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable \
    && corepack prepare "pnpm@${PNPM_VERSION}" --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/votacion/node_modules ./apps/votacion/node_modules

COPY pnpm-workspace.yaml package.json ./
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/branding/ ./packages/branding/
COPY apps/votacion/ ./apps/votacion/

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
WORKDIR /app/apps/votacion
RUN pnpm build

# ----------- runner -----------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/votacion/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/votacion/.next/static ./apps/votacion/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/votacion/public ./apps/votacion/public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/votacion/server.js"]
