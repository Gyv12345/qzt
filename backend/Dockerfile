# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0 AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy shared-types package
COPY packages/shared-types/package.json ./packages/shared-types/

# Copy backend package
COPY backend/package.json ./backend/

# Install dependencies (workspace-aware)
RUN pnpm install --frozen-lockfile


# ==========================================
# Stage 2: Build shared-types
# ==========================================
FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0 AS shared-types-builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types ./packages/shared-types

# Install shared-types dependencies
RUN pnpm install --frozen-lockfile

# Build shared-types
WORKDIR /app/packages/shared-types
RUN pnpm build


# ==========================================
# Stage 3: Build Backend
# ==========================================
FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0 AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat openssl python3 make g++

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy shared-types (source + built artifacts from previous stage)
COPY --from=shared-types-builder /app/packages/shared-types ./packages/shared-types

# Copy backend source
COPY backend ./backend

# Install backend dependencies
RUN pnpm install --frozen-lockfile

WORKDIR /app/backend

# Generate Prisma Client
RUN pnpm prisma generate

# Build backend application
RUN pnpm build


# ==========================================
# Stage 4: Runner
# ==========================================
FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0 AS runner

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache openssl tini

# Install pnpm
RUN npm install -g pnpm@9

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy necessary files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# Copy shared-types
COPY --from=shared-types-builder /app/packages/shared-types ./packages/shared-types/

# Copy built backend
COPY --from=builder --chown=nestjs:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Set permissions
RUN chown -R nestjs:nodejs /app

USER nestjs

WORKDIR /app/backend

# Expose port
EXPOSE 7890

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7890/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini for signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/main"]
