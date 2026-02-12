#!/bin/bash
# ============================================================
# 极简部署脚本 - 服务器端直接构建部署
# 使用方法: bash scripts/deploy-simple.sh [backend|frontend|website|all]
#
# 原理：
#   1. 服务器上已有源码，直接在源码目录构建
#   2. 将构建产物复制到 /var/www/qzt 对应目录
#   3. 重启服务
#
# 注意：第一次部署需要先创建 /var/www/qzt 目录
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="/var/www/qzt"
BACKUP_DIR="/var/www/qzt/backups"

# 显示帮助
show_help() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   企智通极简部署脚本${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo "源码目录: $SRC_DIR"
    echo "部署目录: $DEPLOY_DIR"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  backend    部署后端"
    echo "  frontend   部署前端"
    echo "  website    部署网站"
    echo "  all        部署全部"
    echo ""
    exit 0
}

# 检查参数
if [ $# -eq 0 ]; then
    show_help
fi

# 备份函数
backup_item() {
    local item=$1
    if [ -e "$item" ]; then
        mkdir -p "$BACKUP_DIR"
        local backup_file="$BACKUP_DIR/$(basename "$item")-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
        tar -czf "$backup_file" -C "$(dirname "$item")" "$(basename "$item")" 2>/dev/null || true
        echo -e "${YELLOW}  备份: $backup_file${NC}"
    fi
}

# 部署后端
deploy_backend() {
    echo -e "${GREEN}--- 部署后端 ---${NC}"

    # 构建
    echo -e "${YELLOW}1. 构建中...${NC}"
    cd "$SRC_DIR"
    pnpm run build:backend

    # 部署
    echo -e "${YELLOW}2. 部署中...${NC}"
    mkdir -p "$DEPLOY_DIR/backend"
    backup_item "$DEPLOY_DIR/backend/dist"

    # 复制构建产物
    rm -rf "$DEPLOY_DIR/backend/dist"
    cp -r "$SRC_DIR/backend/dist" "$DEPLOY_DIR/backend/"
    cp "$SRC_DIR/backend/package.json" "$DEPLOY_DIR/backend/"
    cp -r "$SRC_DIR/backend/prisma" "$DEPLOY_DIR/backend/"

    # 复制 shared-types 构建产物
    rm -rf "$DEPLOY_DIR/backend/node_modules/@qzt/shared-types"
    mkdir -p "$DEPLOY_DIR/backend/node_modules/@qzt"
    cp -r "$SRC_DIR/packages/shared-types/dist" "$DEPLOY_DIR/backend/node_modules/@qzt/shared-types"

    # 安装生产依赖
    echo -e "${YELLOW}3. 安装依赖...${NC}"
    cd "$DEPLOY_DIR/backend"
    pnpm install --prod
    pnpm prisma generate

    # 重启
    echo -e "${YELLOW}4. 重启服务...${NC}"
    pm2 restart qzt-backend 2>/dev/null || \
        pm2 start "$DEPLOY_DIR/backend/dist/main.js" --name qzt-backend
    pm2 save

    echo -e "${GREEN}✓ 后端部署完成${NC}"
}

# 部署前端
deploy_frontend() {
    echo -e "${GREEN}--- 部署前端 ---${NC}"

    # 构建
    echo -e "${YELLOW}1. 构建中...${NC}"
    cd "$SRC_DIR/frontend"
    pnpm run generate:api
    pnpm run build

    # 部署
    echo -e "${YELLOW}2. 部署中...${NC}"
    mkdir -p "$DEPLOY_DIR/frontend"
    backup_item "$DEPLOY_DIR/frontend"

    rm -rf "$DEPLOY_DIR/frontend"/*
    cp -r "$SRC_DIR/frontend/dist/"* "$DEPLOY_DIR/frontend/"

    # 权限
    chown -R www-data:www-data "$DEPLOY_DIR/frontend"
    chmod -R 755 "$DEPLOY_DIR/frontend"

    # 重载 nginx
    nginx -t && nginx -s reload

    echo -e "${GREEN}✓ 前端部署完成${NC}"
}

# 部署网站
deploy_website() {
    echo -e "${GREEN}--- 部署网站 ---${NC}"

    # 构建
    echo -e "${YELLOW}1. 构建中...${NC}"
    cd "$SRC_DIR/website"
    pnpm run build

    # 部署
    echo -e "${YELLOW}2. 部署中...${NC}"
    mkdir -p "$DEPLOY_DIR/website"
    backup_item "$DEPLOY_DIR/website/.next"

    rm -rf "$DEPLOY_DIR/website/.next"
    rm -rf "$DEPLOY_DIR/website/public"
    mkdir -p "$DEPLOY_DIR/website/.next"
    mkdir -p "$DEPLOY_DIR/website/public"

    # Next.js standalone 模式
    if [ -d "$SRC_DIR/website/.next/standalone" ]; then
        cp -r "$SRC_DIR/website/.next/standalone/"* "$DEPLOY_DIR/website/"
        # 静态文件需要单独处理
        cp -r "$SRC_DIR/website/public/"* "$DEPLOY_DIR/website/public/"
        cp -r "$SRC_DIR/website/.next/static" "$DEPLOY_DIR/website/.next/" 2>/dev/null || true
    else
        cp -r "$SRC_DIR/website/.next/"* "$DEPLOY_DIR/website/.next/"
        cp -r "$SRC_DIR/website/public/"* "$DEPLOY_DIR/website/public/"
    fi

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
        show_help
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
