# DB Nexus - Production Dockerfile
# Multi-stage build for optimized image size

# ============================================
# Stage 1: Build the application
# ============================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/connectors/package.json ./packages/connectors/
COPY packages/metadata/package.json ./packages/metadata/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# Build all packages
RUN pnpm build

# ============================================
# Stage 2: Production image
# ============================================
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Add non-root user for security
RUN addgroup -g 1001 -S dbnexus && \
    adduser -S dbnexus -u 1001 -G dbnexus

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/connectors/package.json ./packages/connectors/
COPY --from=builder /app/packages/connectors/dist ./packages/connectors/dist
COPY --from=builder /app/packages/metadata/package.json ./packages/metadata/
COPY --from=builder /app/packages/metadata/dist ./packages/metadata/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Create data directory for SQLite metadata
RUN mkdir -p /app/data && chown -R dbnexus:dbnexus /app/data

# Switch to non-root user
USER dbnexus

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DBNEXUS_DATA_DIR=/app/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "apps/api/dist/main.js"]
