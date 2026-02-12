# 后端 Docker 镜像 - 本地构建版本
# 使用方法：
#   1. 先在本地构建: cd backend && pnpm build
#   2. 再构建镜像:   docker build -t qzt-backend .

FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0

WORKDIR /app

# 安装运行时依赖
RUN apt-get update && apt-get install -y openssl tini && rm -rf /var/lib/apt/lists/*

# 安装 pnpm
RUN npm install -g pnpm@9

# 创建非 root 用户
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash nestjs

# 复制 workspace 配置
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# 复制 shared-types
COPY packages/shared-types ./packages/shared-types

# 复制 backend
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# 复制本地构建好的产物
COPY backend/dist ./backend/dist

# 安装生产依赖（不包括 devDependencies）
WORKDIR /app/backend
RUN pnpm install --prod --frozen-lockfile

# 生成 Prisma Client
RUN pnpm prisma generate

# 设置权限
RUN chown -R nestjs:nodejs /app

USER nestjs

WORKDIR /app/backend

# 暴露端口
EXPOSE 7890

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7890/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 tini 处理信号
ENTRYPOINT ["/usr/bin/tini", "--"]

# 启动应用
CMD ["node", "dist/main"]
