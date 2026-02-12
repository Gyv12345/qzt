#!/bin/bash
# ============================================================
# 服务器初始化脚本 - Ubuntu 22.04/24.04
# 使用方法: bash scripts/server-init-ubuntu.sh
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   企智通服务器初始化脚本 (Ubuntu)${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    exit 1
fi

# 检测 Ubuntu 版本
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        echo -e "${RED}此脚本仅适用于 Ubuntu 系统${NC}"
        exit 1
    fi
    echo -e "${GREEN}检测到 Ubuntu ${VERSION_ID}${NC}"
else
    echo -e "${RED}无法检测系统版本${NC}"
    exit 1
fi

# 1. 更新系统
echo -e "${GREEN}[1/9] 更新系统...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y

# 2. 安装基础工具
echo -e "${GREEN}[2/9] 安装基础工具...${NC}"
apt install -y curl wget git vim unzip tar build-essential python3 software-properties-common ca-certificates gnupg

# 3. 安装 Node.js 22.x LTS
echo -e "${GREEN}[3/9] 安装 Node.js 22.x LTS...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
else
    NODE_VERSION=$(node -v)
    echo -e "${YELLOW}Node.js 已安装: ${NODE_VERSION}${NC}"
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 22 ]; then
        echo -e "${YELLOW}建议升级到 Node.js 22.x LTS${NC}"
        echo -e "${YELLOW}运行: curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs${NC}"
    fi
fi

# 4. 安装 pnpm
echo -e "${GREEN}[4/9] 安装 pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
else
    echo -e "${YELLOW}pnpm 已安装: $(pnpm -v)${NC}"
fi

# 5. 安装 PM2
echo -e "${GREEN}[5/9] 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    # 设置 PM2 开机自启
    pm2 startup systemd -u root --hp /root
    pm2 save
else
    echo -e "${YELLOW}PM2 已安装: $(pm2 -v)${NC}"
    if ! systemctl is-enabled pm2-root &>/dev/null; then
        pm2 startup systemd -u root --hp /root 2>/dev/null || true
    fi
fi

# 6. 安装最新版 nginx
echo -e "${GREEN}[6/9] 安装 nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
else
    NGINX_VERSION=$(nginx -v 2>&1 | grep -oP '\d+\.\d+\.\d+')
    echo -e "${YELLOW}nginx 已安装: ${NGINX_VERSION}${NC}"
fi

# 7. 安装 Redis
echo -e "${GREEN}[7/9] 安装 Redis...${NC}"
if ! command -v redis-server &> /dev/null && ! command -v redis-cli &> /dev/null; then
    apt install -y redis-server
    systemctl enable redis-server
    systemctl start redis-server
    echo -e "${GREEN}Redis 已启动${NC}"
else
    REDIS_VERSION=$(redis-cli --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' || echo "已安装")
    echo -e "${YELLOW}Redis 已安装: ${REDIS_VERSION}${NC}"
fi

# 8. 安装 certbot（用于申请 SSL 证书）
echo -e "${GREEN}[8/9] 安装 certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install -y certbot
else
    echo -e "${YELLOW}certbot 已安装${NC}"
fi

# 9. 创建部署目录结构
echo -e "${GREEN}[9/9] 创建部署目录结构...${NC}"
mkdir -p /var/www/qzt/{backend,frontend,website,logs,backups}
mkdir -p /etc/nginx/ssl
mkdir -p /var/www/letsencrypt

# 设置目录权限
chown -R www-data:www-data /var/www/qzt/frontend
chown -R www-data:www-data /var/www/qzt/website

# 10. 配置防火墙（如果启用）
echo -e "${GREEN}配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
    echo -e "${YELLOW}检测到 UFW 防火墙${NC}"
    # 开放 OpenSSH
    ufw allow OpenSSH >/dev/null 2>&1 || true
    # 开放 HTTP/HTTPS
    ufw allow 80/tcp >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
    # 如果防火墙未启用，询问是否启用
    if ! ufw status | grep -q "Status: active"; then
        echo -e "${YELLOW}UFW 防火墙未启用${NC}"
        echo -e "${YELLOW}运行 'ufw enable' 启用防火墙${NC}"
    else
        echo -e "${GREEN}防火墙已配置${NC}"
    fi
else
    echo -e "${YELLOW}未检测到 UFW 防火墙，跳过配置${NC}"
fi

# 11. 配置 Redis 安全（仅本地访问）
echo -e "${GREEN}配置 Redis 安全...${NC}"
REDIS_CONF="/etc/redis/redis.conf"
if [ -f "$REDIS_CONF" ]; then
    # 绑定只监听本地
    sed -i 's/^bind .*/bind 127.0.0.1 ::1/' "$REDIS_CONF" 2>/dev/null || true
    systemctl restart redis-server 2>/dev/null || true
    echo -e "${GREEN}Redis 已配置为仅本地访问${NC}"
fi

# SSL 证书说明
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${YELLOW}SSL 证书配置${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "请准备以下 SSL 证书文件："
echo "  - /etc/nginx/ssl/devlovecode.com.crt"
echo "  - /etc/nginx/ssl/devlovecode.com.key"
echo ""
echo "推荐使用 Let's Encrypt 申请泛域名证书："
echo "  bash scripts/setup-ssl.sh devlovecode.com"
echo ""

# 完成
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   初始化完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "已安装组件："
echo "  - Node.js $(node -v) (推荐 22.x LTS)"
echo "  - pnpm $(pnpm -v)"
echo "  - PM2 $(pm2 -v | head -1 2>/dev/null || echo '已安装')"
echo "  - nginx $(nginx -v 2>&1 | grep -oP '\d+\.\d+\.\d+' || echo '已安装')"
echo "  - Redis $(redis-cli --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' || echo '已安装')"
echo "  - certbot $(certbot --version 2>/dev/null || echo '已安装')"
echo ""
echo "服务状态："
echo "  - nginx: $(systemctl is-active nginx)"
echo "  - redis-server: $(systemctl is-active redis-server)"
echo ""
echo "部署目录："
echo "  - /var/www/qzt/backend  (后端)"
echo "  - /var/www/qzt/frontend (前端)"
echo "  - /var/www/qzt/website  (网站)"
echo "  - /var/www/qzt/logs     (日志)"
echo "  - /var/www/qzt/backups (备份)"
echo ""
echo "下一步："
echo "  1. 配置 SSL 证书: bash scripts/setup-ssl.sh devlovecode.com"
echo "  2. 上传 nginx 配置: scp scripts/nginx-prod-ubuntu.conf root@server:/etc/nginx/sites-available/qzt"
echo "  3. 配置 GitHub Secrets (SSH_PRIVATE_KEY, SERVER_HOST, DATABASE_URL)"
echo "  4. 推送代码触发自动部署，或手动运行: bash scripts/deploy.sh all"
echo ""
