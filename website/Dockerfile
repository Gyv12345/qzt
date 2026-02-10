# Website Dockerfile - Next.js 15 Standalone Output
# 基于 Node.js 18 镜像，使用 Alpine Linux 减小镜像体积
FROM node:18-alpine AS base

# 安装依赖项
RUN apk add --no-cache libc6-compat

# 设置工作目录
WORKDIR /app

# 从依赖安装阶段到依赖依赖阶段
FROM base AS deps

# 安装所有依赖项（包括生产依赖）
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# 构建阶段
FROM base AS builder

WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 启用 pnpm
RUN corepack enable pnpm

# 设置构建时环境变量（禁用遥测）
ENV NEXT_TELEMETRY_DISABLED 1

# 构建 Next.js 应用
RUN pnpm run build

# 生产运行阶段
FROM base AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制必要的 public 文件
COPY --from=builder /app/public ./public

# 设置正确的权限
RUN mkdir .next && chown -R nextjs:nodejs .next

# 复制 standalone 输出（仅包含必要的文件）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 5180

# 设置端口环境变量
ENV PORT 5180
ENV HOSTNAME "0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
