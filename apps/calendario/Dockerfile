# pnpm 11.x (lockfile v9) requiere Node >= 22.13
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
COPY apps/calendario/package.json ./apps/calendario/

RUN pnpm install --frozen-lockfile

# ----------- builder -----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable \
    && corepack prepare "pnpm@${PNPM_VERSION}" --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/calendario/node_modules ./apps/calendario/node_modules

COPY pnpm-workspace.yaml package.json ./
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/branding/ ./packages/branding/
COPY apps/calendario/ ./apps/calendario/

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/calendario
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

COPY --from=builder --chown=nextjs:nodejs /app/apps/calendario/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/calendario/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/calendario/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
