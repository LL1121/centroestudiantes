# pnpm 11.x (lockfile v9) requiere Node >= 22.13 (usa node:sqlite)
ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=11.2.2

# ----------- deps -----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable \
    && corepack prepare "pnpm@${PNPM_VERSION}" --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ----------- builder -----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable \
    && corepack prepare "pnpm@${PNPM_VERSION}" --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Activa el modo "solo biblioteca" (la app vive en la raíz) en el deploy aislado.
# Debe ser NEXT_PUBLIC_* para inlinearse también en el bundle del cliente.
ARG NEXT_PUBLIC_BIBLIOTECA_ONLY=false
ENV NEXT_PUBLIC_BIBLIOTECA_ONLY=${NEXT_PUBLIC_BIBLIOTECA_ONLY}
ARG NEXT_PUBLIC_COPYRIGHT_ENABLED=false
ENV NEXT_PUBLIC_COPYRIGHT_ENABLED=${NEXT_PUBLIC_COPYRIGHT_ENABLED}
ENV NEXT_TELEMETRY_DISABLED=1
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

# `output: 'standalone'` deja un servidor mínimo en .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
