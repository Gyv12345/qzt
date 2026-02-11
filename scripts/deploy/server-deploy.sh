#!/bin/bash
# ============================================================
# 服务器端部署脚本
# 由 GitHub Actions 调用，在服务器上执行
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

QZT_DIR="/opt/qzt"
DEPLOY_DIR="/opt/qzt-deploy"
BACKUP_DIR="/opt/qzt-backup"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   服务器部署${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# 读取版本信息
if [ -f "$DEPLOY_DIR/VERSION" ]; then
    VERSION=$(cat "$DEPLOY_DIR/VERSION")
    echo -e "${CYAN}版本: ${VERSION:0:8}${NC}"
fi

if [ -f "$DEPLOY_DIR/BUILD_TIME" ]; then
    BUILD_TIME=$(cat "$DEPLOY_DIR/BUILD_TIME")
    echo -e "${CYAN}构建时间: ${BUILD_TIME}${NC}"
fi

echo ""

# ============================================
# 1. 检查环境
# ============================================
echo -e "${YELLOW}[1/6] 检查环境...${NC}"

if [ ! -f "$QZT_DIR/backend/.env" ]; then
    echo -e "${RED}✗ 未找到环境变量文件${NC}"
    echo -e "${YELLOW}请先创建: $QZT_DIR/backend/.env${NC}"
    exit 1
fi

source "$QZT_DIR/backend/.env"

# 检查必填项
if [ -z "$DOMAIN_NAME" ] || [ -z "$ADMIN_DOMAIN" ]; then
    echo -e "${RED}✗ 请配置域名: DOMAIN_NAME 和 ADMIN_DOMAIN${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 环境检查通过${NC}"

# ============================================
# 2. 备份当前版本
# ============================================
echo -e "${YELLOW}[2/6] 备份当前版本...${NC}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_BACKUP="$BACKUP_DIR/$TIMESTAMP"
mkdir -p "$CURRENT_BACKUP"

# 备份关键文件
[ -d "$QZT_DIR/backend/dist" ] && cp -r "$QZT_DIR/backend/dist" "$CURRENT_BACKUP/" 2>/dev/null || true
[ -d "$QZT_DIR/frontend/dist" ] && cp -r "$QZT_DIR/frontend/dist" "$CURRENT_BACKUP/" 2>/dev/null || true

echo -e "${GREEN}✓ 已备份到: $CURRENT_BACKUP${NC}"

# ============================================
# 3. 更新后端
# ============================================
echo -e "${YELLOW}[3/6] 更新后端...${NC}"

cd "$QZT_DIR/backend"

# 停止 PM2（零停机：先用 reload，失败才 stop）
pm2 reload ecosystem.config.cjs --update-env 2>/dev/null || true

# 更新文件
rm -rf dist prisma
cp -r "$DEPLOY_DIR/backend/dist" ./
cp -r "$DEPLOY_DIR/backend/prisma" ./
cp "$DEPLOY_DIR/backend/package.json" ./

# 安装共享类型包（workspace 依赖）
mkdir -p "$QZT_DIR/packages"
rm -rf "$QZT_DIR/packages/shared-types"
mkdir -p "$QZT_DIR/packages/shared-types"
cp -r "$DEPLOY_DIR/packages/shared-types/dist" "$QZT_DIR/packages/shared-types/"
cp "$DEPLOY_DIR/packages/shared-types/package.json" "$QZT_DIR/packages/shared-types/"

# 创建 pnpm-workspace.yaml（服务器上需要）
cat > "$QZT_DIR/pnpm-workspace.yaml" << 'EOF'
packages:
  - 'packages/*'
EOF

# 不复制 lockfile，让服务器根据 package.json 重新生成
# 这样可以避免 workspace lockfile 与子项目 package.json 不匹配的问题

# 安装所有依赖（包括 devDependencies，因为 prisma 是开发依赖）
cd "$QZT_DIR"
pnpm install --no-frozen-lockfile

# 切换到后端目录
cd "$QZT_DIR/backend"

# 生成 Prisma Client（使用项目中的 prisma）
npx prisma generate

# 同步数据库结构（生产环境）
# prisma db push 会自动检测变更，仅在有变化时执行
echo -e "${CYAN}同步数据库结构...${NC}"
npx prisma db push --skip-generate || {
    echo -e "${YELLOW}⚠ 数据库同步失败，请检查 RDS 连接${NC}"
    echo -e "${YELLOW}继续部署（可能是无变更或暂时性问题）${NC}"
}

echo -e "${GREEN}✓ 后端更新完成${NC}"

# ============================================
# 4. 更新前端
# ============================================
echo -e "${YELLOW}[4/6] 更新前端...${NC}"

rm -rf /var/www/qzt/frontend
cp -r "$DEPLOY_DIR/frontend/dist" /var/www/qzt/frontend

echo -e "${GREEN}✓ 前端更新完成${NC}"

# ============================================
# 5. 更新网站
# ============================================
echo -e "${YELLOW}[5/6] 更新网站...${NC}"

cd "$QZT_DIR/website"

rm -rf .next public
cp -r "$DEPLOY_DIR/website/.next" ./
cp -r "$DEPLOY_DIR/website/public" ./
[ -f "$DEPLOY_DIR/website/package.json" ] && cp "$DEPLOY_DIR/website/package.json" ./

echo -e "${GREEN}✓ 网站更新完成${NC}"

# ============================================
# 6. 重启服务
# ============================================
echo -e "${YELLOW}[6/6] 重启服务...${NC}"

# 更新 PM2 配置
if [ -f "$DEPLOY_DIR/config/pm2/ecosystem.config.cjs" ]; then
    cp "$DEPLOY_DIR/config/pm2/ecosystem.config.cjs" "$QZT_DIR/backend/"
    echo -e "${GREEN}✓ PM2 配置已更新${NC}"
else
    echo -e "${YELLOW}⚠ PM2 配置文件不存在，跳过${NC}"
fi

cd "$QZT_DIR/backend"

# 启动/重载服务
if [ -f ecosystem.config.cjs ]; then
    if pm2 describe qzt-backend >/dev/null 2>&1; then
        pm2 reload ecosystem.config.cjs --update-env
        echo -e "${GREEN}✓ 服务已重载（零停机）${NC}"
    else
        pm2 start ecosystem.config.cjs
        echo -e "${GREEN}✓ 服务已启动${NC}"
    fi
    pm2 save
else
    echo -e "${RED}✗ PM2 配置文件不存在，无法启动服务${NC}"
    exit 1
fi

# 清理旧备份（保留最近 5 个）
ls -t "$BACKUP_DIR" 2>/dev/null | tail -n +6 | while read dir; do
    rm -rf "$BACKUP_DIR/$dir"
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 部署完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}服务状态：${NC}"
pm2 status
