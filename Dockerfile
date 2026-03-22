# Multi-stage build for Crate backend
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config and lockfile first (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.json ./

# Copy package.json files for all workspace packages
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY packages/backend/package.json packages/backend/tsconfig.json packages/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/

# Build shared types then backend
RUN pnpm --filter @crate/shared build
RUN pnpm --filter @crate/backend build

# --- Production stage ---
FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/backend/dist packages/backend/dist

# Copy migrations (needed at runtime)
COPY packages/backend/src/db/migrations packages/backend/dist/db/migrations

WORKDIR /app/packages/backend

ENV PORT=4242
ENV NODE_ENV=production
EXPOSE 4242

CMD ["node", "dist/index.js"]
