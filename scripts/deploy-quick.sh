#!/bin/bash
# ============================================================
# 服务器端快速部署脚本 - 简化版
# 使用方法: cd /root/qzt && bash scripts/deploy-quick.sh [backend|frontend|website|all]
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="/var/www/qzt"
BACKUP_DIR="/var/www/qzt/backups"

show_usage() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   企智通快速部署脚本${NC}"
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
    exit 1
}

if [ $# -eq 0 ]; then
    show_usage
fi

# 部署后端
deploy_backend() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}部署后端服务...${NC}"
    echo -e "${GREEN}========================================${NC}"

    # 构建 shared-types
    echo -e "${YELLOW}1. 构建共享类型...${NC}"
    cd packages/shared-types
    pnpm run build
    cd ../..

    # 构建 backend
    echo -e "${YELLOW}2. 构建后端...${NC}"
    cd backend
    pnpm install
    pnpm prisma generate
    pnpm run build
    cd ..

    # 创建部署目录
    mkdir -p $PROJECT_DIR/backend

    # 备份
    if [ -d "$PROJECT_DIR/backend/dist" ]; then
        BACKUP_FILE="$BACKUP_DIR/backend-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
        mkdir -p $BACKUP_DIR
        tar -czf "$BACKUP_FILE" -C $PROJECT_DIR/backend dist 2>/dev/null || true
        echo -e "${YELLOW}备份已创建: $BACKUP_FILE${NC}"
    fi

    # 清理并复制（不用 pnpm，直接复制文件）
    echo -e "${YELLOW}3. 部署文件...${NC}"
    rm -rf $PROJECT_DIR/backend/dist
    cp -r backend/dist $PROJECT_DIR/backend/
    cp backend/package.json $PROJECT_DIR/backend/
    cp -r backend/prisma $PROJECT_DIR/backend/

    # 复制 node_modules（关键！）
    mkdir -p $PROJECT_DIR/backend/node_modules/@qzt
    cp -r packages/shared-types/dist $PROJECT_DIR/backend/node_modules/@qzt/shared-types
    cp -r backend/node_modules/@prisma $PROJECT_DIR/backend/node_modules/
    cp -r backend/node_modules/@nestjs $PROJECT_DIR/backend/node_modules/
    cp -r backend/node_modules/@swc $PROJECT_DIR/backend/node_modules/

    # 生成 Prisma Client
    cd $PROJECT_DIR/backend
    pnpm prisma generate

    # 重启
    pm2 restart qzt-backend 2>/dev/null || \
        pm2 start $PROJECT_DIR/backend/dist/main.js --name qzt-backend
    pm2 save

    echo -e "${GREEN}后端部署完成！${NC}"
}

# 部署前端
deploy_frontend() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}部署前端服务...${NC}"
    echo -e "${GREEN}========================================${NC}"

    # 构建
    echo -e "${YELLOW}1. 构建前端...${NC}"
    cd frontend
    pnpm run generate:api
    pnpm run build
    cd ..

    # 备份
    if [ -f "$PROJECT_DIR/frontend/index.html" ]; then
        BACKUP_FILE="$BACKUP_DIR/frontend-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
        mkdir -p $BACKUP_DIR
        tar -czf "$BACKUP_FILE" -C $PROJECT_DIR/frontend . 2>/dev/null || true
        echo -e "${YELLOW}备份已创建: $BACKUP_FILE${NC}"
    fi

    # 部署
    echo -e "${YELLOW}2. 部署文件...${NC}"
    rm -rf $PROJECT_DIR/frontend/*
    cp -r frontend/dist/* $PROJECT_DIR/frontend/

    # 设置权限
    chown -R www-data:www-data $PROJECT_DIR/frontend
    chmod -R 755 $PROJECT_DIR/frontend

    # 重载 nginx
    nginx -t && nginx -s reload

    echo -e "${GREEN}前端部署完成！${NC}"
}

# 部署网站
deploy_website() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}部署网站服务...${NC}"
    echo -e "${GREEN}========================================${NC}"

    # 构建
    echo -e "${YELLOW}1. 构建网站...${NC}"
    cd website
    pnpm install
    pnpm run build
    cd ..

    # 备份
    if [ -d "$PROJECT_DIR/website/.next" ]; then
        BACKUP_FILE="$BACKUP_DIR/website-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
        mkdir -p $BACKUP_DIR
        tar -czf "$BACKUP_FILE" -C $PROJECT_DIR/website . 2>/dev/null || true
        echo -e "${YELLOW}备份已创建: $BACKUP_FILE${NC}"
    fi

    # 部署
    echo -e "${YELLOW}2. 部署文件...${NC}"
    rm -rf $PROJECT_DIR/website/.next
    rm -rf $PROJECT_DIR/website/public
    mkdir -p $PROJECT_DIR/website/.next
    mkdir -p $PROJECT_DIR/website/public

    if [ -d "website/.next/standalone" ]; then
        cp -r website/.next/standalone/* $PROJECT_DIR/website/
    else
        cp -r website/.next/* $PROJECT_DIR/website/.next/
    fi
    cp -r website/public/* $PROJECT_DIR/website/public/

    # 创建 server.js
    if [ ! -f "$PROJECT_DIR/website/server.js" ]; then
        cat > $PROJECT_DIR/website/server.js << 'EOF'
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
      console.log(\`> Ready on http://\${hostname}:\${port}\`)
    })
})
EOF
    fi

    # 重启
    pm2 restart qzt-website 2>/dev/null || \
        pm2 start $PROJECT_DIR/website/server.js --name qzt-website
    pm2 save

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
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
