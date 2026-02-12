# 多阶段构建 - 第一阶段：构建
FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0 AS builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 复制依赖文件（context 是项目根目录）
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

# 安装依赖（使用 pnpm 的 --frozen-lockfile 确保依赖一致性）
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY frontend/ .

# 复制 workspace 共享包
COPY packages/shared-types ../packages/shared-types

# 构建项目
RUN pnpm build

# 多阶段构建 - 第二阶段：运行时
FROM nginx:latest

# 安装 tzdata 设置时区为上海
RUN apt-get update && apt-get install -y tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apt-get remove -y tzdata && \
    rm -rf /var/lib/apt/lists/*

# 删除默认 nginx 配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义 nginx 配置（支持 HTTPS 的版本）
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 复制仅 HTTP 的备用配置
COPY frontend/nginx.http.conf /etc/nginx/conf.d/nginx.http.conf.template

# 启动脚本 - 根据证书是否存在选择配置
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 从构建阶段复制构建产物到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露 80 和 443 端口
EXPOSE 80 443

# 启动 nginx（前台运行）
CMD ["/docker-entrypoint.sh"]
