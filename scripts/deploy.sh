#!/bin/bash
# ============================================================
# 本地手动部署脚本
# 使用方法: bash scripts/deploy.sh [backend|frontend|website|all]
# ============================================================

set -e

# 配置
SERVER_HOST="${SERVER_HOST:-}"
SSH_USER="${SSH_USER:-root}"
PROJECT_DIR="/var/www/qzt"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 显示使用说明
show_usage() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   企智通部署脚本${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  backend    部署后端服务"
    echo "  frontend   部署前端服务"
    echo "  website    部署网站服务"
    echo "  all        部署所有服务"
    echo ""
    echo "环境变量:"
    echo "  SERVER_HOST  服务器地址 (必需)"
    echo "  SSH_USER     SSH 用户 (默认: root)"
    echo ""
    echo "示例:"
    echo "  SERVER_HOST=192.168.1.100 $0 backend"
    echo "  SERVER_HOST=your-server.com $0 all"
    echo ""
}

# 检查参数
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

# 检查 SERVER_HOST
if [ -z "$SERVER_HOST" ]; then
    echo -e "${RED}错误: 请设置 SERVER_HOST 环境变量${NC}"
    echo ""
    echo "示例: SERVER_HOST=192.168.1.100 $0 $1"
    exit 1
fi

# 部署后端
deploy_backend() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}部署后端服务...${NC}"
    echo -e "${GREEN}========================================${NC}"

    # 本地构建
    echo -e "${YELLOW}1. 本地构建...${NC}"
    pnpm install
    cd backend
    pnpm prisma generate
    pnpm run build
    cd ..

    # 创建部署包
    echo -e "${YELLOW}2. 创建部署包...${NC}"
    cd backend
    tar -czf ../backend-dist.tar.gz dist node_modules package.json prisma
    cd ..

    # 上传到服务器
    echo -e "${YELLOW}3. 上传到服务器...${NC}"
    scp backend-dist.tar.gz ${SSH_USER}@${SERVER_HOST}:/tmp/

    # 远程部署
    echo -e "${YELLOW}4. 远程部署...${NC}"
    ssh ${SSH_USER}@${SERVER_HOST} << 'ENDSSH'
set -e
mkdir -p /var/www/qzt/backend
cd /var/www/qzt/backend

# 备份
if [ -d "dist" ]; then
    BACKUP_FILE="/var/www/qzt/backups/backend-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" dist node_modules 2>/dev/null || tar -czf "$BACKUP_FILE" dist
    echo "备份已创建: $BACKUP_FILE"
fi

# 解压新版本
rm -rf dist node_modules
tar -xzf /tmp/backend-dist.tar.gz -C ./
rm /tmp/backend-dist.tar.gz

# 生成 Prisma Client
cd /var/www/qzt/backend
pnpm prisma generate

# 重启
pm2 restart qzt-backend 2>/dev/null || pm2 start /var/www/qzt/backend/dist/main.js --name qzt-backend
pm2 save

echo "后端部署完成！"
ENDSSH

    # 清理本地文件
    rm backend-dist.tar.gz

    echo -e "${GREEN}后端部署完成！${NC}"
}

# 部署前端
deploy_frontend() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}部署前端服务...${NC}"
    echo -e "${GREEN}========================================${NC}"

    # 本地构建
    echo -e "${YELLOW}1. 本地构建...${NC}"
    cd frontend
    pnpm run generate:api
    pnpm run build
    cd ..

    # 创建部署包
    echo -e "${YELLOW}2. 创建部署包...${NC}"
    cd frontend/dist
    tar -czf ../../frontend-dist.tar.gz .
    cd ../..

    # 上传到服务器
    echo -e "${YELLOW}3. 上传到服务器...${NC}"
    scp frontend-dist.tar.gz ${SSH_USER}@${SERVER_HOST}:/tmp/

    # 远程部署
    echo -e "${YELLOW}4. 远程部署...${NC}"
    ssh ${SSH_USER}@${SERVER_HOST} << 'ENDSSH'
set -e
mkdir -p /var/www/qzt/frontend

# 备份
if [ -f "/var/www/qzt/frontend/index.html" ]; then
    BACKUP_FILE="/var/www/qzt/backups/frontend-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" -C /var/www/qzt/frontend . 2>/dev/null || true
    echo "备份已创建: $BACKUP_FILE"
fi

# 解压新版本
rm -rf /var/www/qzt/frontend/*
tar -xzf /tmp/frontend-dist.tar.gz -C /var/www/qzt/frontend/
rm /tmp/frontend-dist.tar.gz

# 设置权限
chown -R nginx:nginx /var/www/qzt/frontend
chmod -R 755 /var/www/qzt/frontend

# 重载 nginx
nginx -t && nginx -s reload

echo "前端部署完成！"
ENDSSH

    # 清理本地文件
    rm frontend-dist.tar.gz

    echo -e "${GREEN}前端部署完成！${NC}"
}

# 部署网站
deploy_website() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}部署网站服务...${NC}"
    echo -e "${GREEN}========================================${NC}"

    # 本地构建
    echo -e "${YELLOW}1. 本地构建...${NC}"
    cd website
    pnpm install
    pnpm run build
    cd ..

    # 创建部署包
    echo -e "${YELLOW}2. 创建部署包...${NC}"
    tar -czf website-dist.tar.gz -C website/.next/standalone .
    tar -czf website-public.tar.gz -C website/public .

    # 上传到服务器
    echo -e "${YELLOW}3. 上传到服务器...${NC}"
    scp website-dist.tar.gz ${SSH_USER}@${SERVER_HOST}:/tmp/
    scp website-public.tar.gz ${SSH_USER}@${SERVER_HOST}:/tmp/

    # 远程部署
    echo -e "${YELLOW}4. 远程部署...${NC}"
    ssh ${SSH_USER}@${SERVER_HOST} << 'ENDSSH'
set -e
mkdir -p /var/www/qzt/website

# 备份
if [ -d "/var/www/qzt/website/.next" ]; then
    BACKUP_FILE="/var/www/qzt/backups/website-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" -C /var/www/qzt/website . 2>/dev/null || true
    echo "备份已创建: $BACKUP_FILE"
fi

# 解压新版本
rm -rf /var/www/qzt/website/.next
rm -rf /var/www/qzt/website/public
mkdir -p /var/www/qzt/website

tar -xzf /tmp/website-dist.tar.gz -C /var/www/qzt/website/
tar -xzf /tmp/website-public.tar.gz -C /var/www/qzt/website/
rm /tmp/website-dist.tar.gz /tmp/website-public.tar.gz

# 创建 server.js（如果不存在）
if [ ! -f "/var/www/qzt/website/server.js" ]; then
    cat > /var/www/qzt/website/server.js << 'EOF'
const { createServer } = require('http')
const { parse } = require('url')
const next = require('./next/dist/bin/next')

const dev = false
const hostname = '0.0.0.0'
const port = 5180

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
EOF
fi

# 重启
pm2 restart qzt-website 2>/dev/null || pm2 start /var/www/qzt/website/server.js --name qzt-website
pm2 save

echo "网站部署完成！"
ENDSSH

    # 清理本地文件
    rm website-dist.tar.gz website-public.tar.gz

    echo -e "${GREEN}网站部署完成！${NC}"
}

# 主逻辑
case "$1" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    website)
        deploy_website
        ;;
    all)
        deploy_backend
        echo ""
        deploy_frontend
        echo ""
        deploy_website
        ;;
    *)
        echo -e "${RED}未知选项: $1${NC}"
        show_usage
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
