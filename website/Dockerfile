# Website Dockerfile - Next.js 15 Standalone 模式
# 多阶段构建优化镜像大小

# ============================================
# 阶段 1: 依赖安装
# ============================================
FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0 AS deps

# 安装 pnpm
RUN npm install -g pnpm@latest

WORKDIR /app

# 复制 package 文件（context 是项目根目录）
COPY website/package.json website/pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --prod=false

# ============================================
# 阶段 2: 构建
# ============================================
FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0 AS builder

RUN npm install -g pnpm@latest

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY website/ .

# 设置构建时环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建 Next.js 应用
RUN pnpm build

# ============================================
# 阶段 3: 运行时镜像
# ============================================
FROM registry.cn-heyuan.aliyuncs.com/yt4j/node:22.22.0 AS runner

WORKDIR /app

# 创建非 root 用户
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs nextjs

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5180
ENV HOSTNAME="0.0.0.0"

# 复制必要的文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 复制 standalone 输出（Next.js 15 standalone 模式）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 5180

# 启动应用
CMD ["node", "server.js"]
