#!/bin/bash
# ============================================================
# 极简部署脚本 - 服务器端直接构建部署
# 使用方法: bash scripts/deploy-simple.sh [backend|frontend|website|all]
#
# 原理：直接在部署目录操作，避免复制 node_modules
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SRC_DIR="/root/qzt"
DEPLOY_DIR="/var/www/qzt"

show_help() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   企智通极简部署脚本${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo "用法: $0 [backend|frontend|website|all]"
    echo ""
    exit 0
}

[ $# -eq 0 ] && show_help

# 部署后端
deploy_backend() {
    echo -e "${GREEN}--- 部署后端 ---${NC}"

    # 确保部署目录存在
    mkdir -p "$DEPLOY_DIR/backend"

    # 复制源码到部署目录（第一次或需要更新代码时）
    echo -e "${YELLOW}1. 同步代码...${NC}"
    rsync -av --delete \
        --exclude node_modules \
        --exclude dist \
        "$SRC_DIR/backend/" "$DEPLOY_DIR/backend/"

    # 复制 shared-types 源码
    mkdir -p "$DEPLOY_DIR/packages"
    rsync -av --delete \
        --exclude node_modules \
        --exclude dist \
        "$SRC_DIR/packages/shared-types/" "$DEPLOY_DIR/packages/shared-types/"

    # 在部署目录构建
    echo -e "${YELLOW}2. 构建中...${NC}"
    cd "$DEPLOY_DIR/backend"
    pnpm install
    cd "$DEPLOY_DIR/packages/shared-types" && pnpm run build && cd "$DEPLOY_DIR/backend"
    pnpm prisma generate
    pnpm run build

    # 重启
    echo -e "${YELLOW}3. 重启服务...${NC}"
    pm2 restart qzt-backend 2>/dev/null || \
        pm2 start "$DEPLOY_DIR/backend/dist/main.js" --name qzt-backend
    pm2 save

    echo -e "${GREEN}✓ 后端部署完成${NC}"
}

# 部署前端
deploy_frontend() {
    echo -e "${GREEN}--- 部署前端 ---${NC}"

    # 在源码目录构建
    echo -e "${YELLOW}1. 构建中...${NC}"
    cd "$SRC_DIR/frontend"
    pnpm run generate:api
    pnpm run build

    # 复制静态文件
    echo -e "${YELLOW}2. 部署中...${NC}"
    mkdir -p "$DEPLOY_DIR/frontend"
    rm -rf "$DEPLOY_DIR/frontend"/*
    cp -r "$SRC_DIR/frontend/dist/"* "$DEPLOY_DIR/frontend/"

    chown -R www-data:www-data "$DEPLOY_DIR/frontend"
    chmod -R 755 "$DEPLOY_DIR/frontend"

    nginx -t && nginx -s reload

    echo -e "${GREEN}✓ 前端部署完成${NC}"
}

# 部署网站
deploy_website() {
    echo -e "${GREEN}--- 部署网站 ---${NC}"

    # 确保部署目录存在
    mkdir -p "$DEPLOY_DIR/website"

    # 同步代码
    echo -e "${YELLOW}1. 同步代码...${NC}"
    rsync -av --delete \
        --exclude node_modules \
        --exclude .next \
        "$SRC_DIR/website/" "$DEPLOY_DIR/website/"

    # 在部署目录构建
    echo -e "${YELLOW}2. 构建中...${NC}"
    cd "$DEPLOY_DIR/website"
    pnpm install
    pnpm run build

    # 创建 server.js
    cat > "$DEPLOY_DIR/website/server.js" << 'EOF'
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

    # 重启
    echo -e "${YELLOW}3. 重启服务...${NC}"
    pm2 restart qzt-website 2>/dev/null || \
        pm2 start "$DEPLOY_DIR/website/server.js" --name qzt-website
    pm2 save

    echo -e "${GREEN}✓ 网站部署完成${NC}"
}

case "$1" in
    backend)   deploy_backend ;;
    frontend)  deploy_frontend ;;
    website)   deploy_website ;;
    all)
        deploy_backend
        echo ""
        deploy_frontend
        echo ""
        deploy_website
        ;;
    *)
        echo -e "${RED}未知选项: $1${NC}"
        show_help
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
