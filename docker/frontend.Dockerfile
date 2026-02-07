# 前端 Dockerfile - 企账通 Frontend
# 多阶段构建：构建 React + Nginx 服务

# ============================================
# 阶段 1: 依赖安装
# ============================================
FROM node:20-alpine AS deps

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制 package 文件
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# ============================================
# 阶段 2: 构建阶段
# ============================================
FROM node:20-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY frontend/package.json frontend/pnpm-lock.yaml ./
COPY frontend/tsconfig.json frontend/tsconfig.node.json ./
COPY frontend/vite.config.ts ./
COPY frontend/index.html ./
COPY frontend/src ./src/
COPY frontend/public ./public/
COPY frontend/tailwind.config.js ./

# 构建生产版本
# API_BASE_URL 在构建时通过 ARG 注入
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm run build

# ============================================
# 阶段 3: Nginx 服务
# ============================================
FROM nginx:1.25-alpine AS runner

# 安装 curl 用于健康检查
RUN apk add --no-cache curl

# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义 Nginx 配置
COPY docker/nginx.conf /etc/nginx/conf.d/

# 从构建阶段复制静态文件
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建非 root 用户
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-user -u 1001 -G nginx-app && \
    chown -R nginx-user:nginx-app /usr/share/nginx/html && \
    chown -R nginx-user:nginx-app /var/cache/nginx && \
    chown -R nginx-user:nginx-app /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-app /var/run/nginx.pid

# 切换用户
USER nginx-user

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
