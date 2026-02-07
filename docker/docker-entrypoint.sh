#!/bin/sh
# ============================================================
# 企账通后端 Docker 容器启动脚本
# ============================================================

set -e

echo "========================================="
echo "企账通后端服务启动中..."
echo "========================================="

# 检查数据库连接是否就绪
MAX_ATTEMPTS=30
ATTEMPT=0

echo "等待数据库连接..."
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if nc -z ${MYSQL_HOST:-mysql} 3306 2>/dev/null; then
        echo "数据库已就绪"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "等待数据库... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "错误: 数据库连接超时"
    exit 1
fi

# 检查是否需要使用 MySQL schema
if [ "$DATABASE_PROVIDER" = "mysql" ] || [ "$NODE_ENV" = "production" ]; then
    echo "使用 MySQL 数据库"

    # 如果存在 MySQL schema，使用它来生成 Prisma Client
    if [ -f "/app/docker/schema.prisma.mysql" ]; then
        echo "使用 MySQL Prisma Schema"
        cp /app/docker/schema.prisma.mysql /app/prisma/schema.prisma
    fi

    # 生成 Prisma Client
    echo "生成 Prisma Client..."
    npx prisma generate

    # 推送 schema 到数据库（首次部署）
    echo "同步数据库 Schema..."
    npx prisma db push --skip-generate || {
        echo "警告: Schema 推送失败，可能已存在"
    }
else
    echo "使用 SQLite 数据库（开发环境）"
    npx prisma generate
fi

# 执行传入的命令
exec "$@"
