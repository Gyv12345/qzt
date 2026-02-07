# 后端 Dockerfile - 企账通 Backend
# 多阶段构建，基于 Node.js 20 Alpine

# ============================================
# 阶段 1: 依赖安装
# ============================================
FROM node:20-alpine AS deps

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制 package 文件
COPY backend/package.json backend/pnpm-lock.yaml ./

# 安装依赖（使用 pnpm）
RUN pnpm install --frozen-lockfile --prod=false

# ============================================
# 阶段 2: 构建阶段
# ============================================
FROM node:20-alpine AS builder

# 安装构建工具和 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json backend/pnpm-lock.yaml ./

# 复制源代码
COPY backend/tsconfig.json backend/nest-cli.json ./
COPY backend/prisma ./prisma/
COPY backend/src ./src/

# 安装所有依赖（包括 devDependencies，用于构建）
RUN pnpm install --frozen-lockfile

# 构建项目
RUN pnpm run build

# ============================================
# 阶段 3: 生产运行
# ============================================
FROM node:20-alpine AS runner

# 安装 pnpm 和必要工具
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache openssl

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

# 复制 package 文件
COPY backend/package.json backend/pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 复制迁移目录（如果存在）
RUN mkdir -p prisma/migrations

# 生成 Prisma Client
RUN pnpm prisma generate

# 设置用户
RUN chown -R nestjs:nodejs /app
USER nestjs

# 暴露端口
EXPOSE 7890

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7890/health || exit 1

# 启动命令（使用 entrypoint 脚本处理数据库迁移）
COPY docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
