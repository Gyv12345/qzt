# Website Docker 镜像 - 本地构建版本
# 使用方法：
#   1. 先在本地构建: cd website && pnpm build
#   2. 再构建镜像:   docker build -t qzt-website .

FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0

WORKDIR /app

# 创建非 root 用户
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash nextjs

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5180
ENV HOSTNAME="0.0.0.0"

# 复制本地构建好的产物（Next.js standalone 模式）
COPY website/public ./public
COPY website/package.json ./package.json
COPY website/.next/standalone ./
COPY website/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 5180

# 启动应用
CMD ["node", "server.js"]
