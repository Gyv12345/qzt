#!/bin/bash
# ============================================================
# 企智通 QZT - 裸机部署脚本
# ============================================================
# 功能：
# - 安装 Node.js 20
# - 安装 pnpm, PM2
# - 安装 Nginx
# - 安装 Redis
# - 配置环境变量
# - 启动服务
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# 检查 root
if [ "$EUID" -ne 0 ]; then
    print_error "请使用 root 用户或 sudo 运行"
    exit 1
fi

# 检测系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    print_error "无法检测系统类型"
    exit 1
fi

if [[ "$OS" =~ ^(ubuntu|debian)$ ]]; then
    PKG_MANAGER="apt"
    UPDATE_CMD="apt-get update -y"
    INSTALL_CMD="apt-get install -y"
    NGINX_SERVICE="nginx"
    REDIS_SERVICE="redis-server"
elif [[ "$OS" =~ ^(centos|rhel|almalinux|rocky|alinux)$ ]]; then
    PKG_MANAGER="yum"
    UPDATE_CMD="yum update -y"
    INSTALL_CMD="yum install -y"
    NGINX_SERVICE="nginx"
    REDIS_SERVICE="redis"
elif [ "$OS" = "fedora" ]; then
    PKG_MANAGER="dnf"
    UPDATE_CMD="dnf update -y"
    INSTALL_CMD="dnf install -y"
    NGINX_SERVICE="nginx"
    REDIS_SERVICE="redis"
else
    print_error "不支持的系统: $OS"
    exit 1
fi

print_header "企智通 QZT - 裸机部署"

# ============================================
# 1. 安装 Node.js 20
# ============================================
print_header "1/5 安装 Node.js 20"

if command -v node &> /dev/null; then
    NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" = "20" ]; then
        print_success "Node.js 20 已安装: $(node -v)"
    else
        print_warning "检测到 Node.js $(node -v)，将升级到 20"
        INSTALL_NODE=true
    fi
else
    INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = true ]; then
    print_info "下载 Node.js 20..."
    NODE_VERSION="20.18.2"
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        ARCH_SUFFIX="x64"
    elif [ "$ARCH" = "aarch64" ]; then
        ARCH_SUFFIX="arm64"
    else
        print_error "不支持的架构: $ARCH"
        exit 1
    fi

    curl -fsSL --retry 3 \
        "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH_SUFFIX}.tar.xz" \
        -o /tmp/node.tar.xz || {
        print_warning "淘宝镜像失败，尝试官方源..."
        curl -fsSL --retry 3 \
            "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH_SUFFIX}.tar.xz" \
            -o /tmp/node.tar.xz
    }

    tar -xf /tmp/node.tar.xz -C /usr/local --strip-components=1
    rm -f /tmp/node.tar.xz
    npm config set registry https://registry.npmmirror.com
    print_success "Node.js $(node -v) 安装完成"
fi

# ============================================
# 2. 安装 pnpm 和 PM2
# ============================================
print_header "2/5 安装包管理器和进程管理器"

if ! command -v pnpm &> /dev/null; then
    print_info "安装 pnpm..."
    npm install -g pnpm
    print_success "pnpm $(pnpm -v) 安装完成"
else
    print_success "pnpm $(pnpm -v) 已安装"
fi

if ! command -v pm2 &> /dev/null; then
    print_info "安装 PM2..."
    npm install -g pm2
    print_success "PM2 $(pm2 -v) 安装完成"
else
    print_success "PM2 $(pm2 -v) 已安装"
fi

# ============================================
# 3. 安装 Redis
# ============================================
print_header "3/5 安装 Redis"

if systemctl is-active --quiet $REDIS_SERVICE 2>/dev/null; then
    print_success "Redis 已运行"
else
    print_info "安装 Redis..."
    $INSTALL_CMD $REDIS_SERVICE
    systemctl enable $REDIS_SERVICE
    systemctl start $REDIS_SERVICE
    print_success "Redis 安装完成"

    # 生成 Redis 密码
    REDIS_PASSWORD_FILE="/root/.redis_password"
    if [ ! -f "$REDIS_PASSWORD_FILE" ]; then
        openssl rand -hex 16 > "$REDIS_PASSWORD_FILE" 2>/dev/null || echo "change_redis_password" > "$REDIS_PASSWORD_FILE"
        chmod 600 "$REDIS_PASSWORD_FILE"
    fi
    REDIS_PASSWORD=$(cat "$REDIS_PASSWORD_FILE")
    print_warning "Redis 密码已保存到: $REDIS_PASSWORD_FILE"
fi

# ============================================
# 4. 安装 Nginx
# ============================================
print_header "4/5 安装 Nginx"

if systemctl is-active --quiet $NGINX_SERVICE 2>/dev/null; then
    print_success "Nginx 已运行"
else
    print_info "安装 Nginx..."

    # CentOS/RHEL 需要 EPEL
    if [ "$PKG_MANAGER" = "yum" ] && [ "$OS" != "alinux" ]; then
        if ! rpm -q epel-release &> /dev/null; then
            yum install -y epel-release > /dev/null 2>&1 || true
        fi
    fi

    $INSTALL_CMD $NGINX_SERVICE
    systemctl enable $NGINX_SERVICE
    systemctl start $NGINX_SERVICE
    print_success "Nginx 安装完成"
fi

# ============================================
# 5. 配置环境变量
# ============================================
print_header "5/5 配置环境变量"

ENV_FILE="/opt/qzt/qzt/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    print_info "创建环境变量文件..."

    # 生成密钥
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change_jwt_secret")
    REDIS_PASSWORD=$(cat /root/.redis_password 2>/dev/null || echo "change_redis_password")

    mkdir -p /opt/qzt/qzt/backend
    cat > "$ENV_FILE" << EOF
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
DB_DATABASE=qzt

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# JWT 配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# 其他配置
NODE_ENV=production
PORT=7890
EOF

    print_success "环境变量文件已创建: $ENV_FILE"
    print_warning "请编辑文件修改数据库密码: vim $ENV_FILE"
else
    print_success "环境变量文件已存在: $ENV_FILE"
fi

# ============================================
# 完成
# ============================================
print_header "✓ 裸机部署环境准备完成"

echo "已安装组件:"
echo "  • Node.js: $(node -v)"
echo "  • pnpm: $(pnpm -v)"
echo "  • PM2: $(pm2 -v)"
echo "  • Nginx: $(nginx -v 2>&1 | head -1)"
echo "  • Redis: $(redis-server --version 2>&1 | head -1)"
echo ""
echo "下一步:"
echo "  1. 编辑环境变量: vim /opt/qzt/qzt/backend/.env"
echo "  2. 配置数据库连接信息"
echo "  3. 运行部署: cd /opt/qzt/qzt && bash scripts/deploy/server-deploy.sh"
