# 前端 Docker 镜像 - 本地构建版本
# 使用方法：
#   1. 先在本地构建: cd frontend && pnpm build
#   2. 再构建镜像:   docker build -t qzt-frontend .

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

# 复制本地构建好的产物
COPY frontend/dist /usr/share/nginx/html

# 暴露 80 和 443 端口
EXPOSE 80 443

# 启动 nginx（前台运行）
CMD ["/docker-entrypoint.sh"]
