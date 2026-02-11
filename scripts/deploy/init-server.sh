#!/bin/bash
# ============================================================
# 企智通 QZT - 服务器初始化脚本（一键安装）
# 支持: Ubuntu/Debian, CentOS/RHEL/AlmaLinux/Rocky, Fedora, Alibaba Cloud Linux
#
# 功能：
# - 安装所有必要环境（git, node.js, pnpm, docker）
# - 支持裸机部署和 Docker 部署两种模式
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印带颜色的消息
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

# ============================================
# 欢迎信息
# ============================================
clear
print_header "企智通 QZT - 服务器初始化"

echo -e "${YELLOW}此脚本将安装以下环境：${NC}"
echo "  • Git (版本控制)"
echo "  • Node.js 20 (运行时)"
echo "  • pnpm (包管理器)"
echo "  • Docker & Docker Compose (容器化)"
echo ""
echo -e "${YELLOW}请选择部署模式：${NC}"
echo "  1) 裸机部署 - 使用 PM2 + Nginx 直接运行"
echo "  2) Docker 部署 - 使用 Docker 容器运行 (推荐)"
echo ""
read -p "请选择 (1/2) [默认: 2]: " DEPLOY_MODE
DEPLOY_MODE=${DEPLOY_MODE:-2}

if [ "$DEPLOY_MODE" = "1" ]; then
    print_info "选择裸机部署模式"
    NEED_NGINX="true"
    NEED_PM2="true"
    NEED_REDIS="true"
else
    print_info "选择 Docker 部署模式"
    NEED_DOCKER="true"
    NEED_NGINX="false"
    NEED_PM2="false"
    NEED_REDIS="false"
fi

# 检查 root
if [ "$EUID" -ne 0 ]; then
    print_error "请使用 root 用户或 sudo 运行"
    echo "运行命令: sudo bash $0"
    exit 1
fi

# ============================================
# 检测 Linux 发行版
# ============================================
print_header "1/7 检测系统类型"

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
elif [ -f /etc/redhat-release ]; then
    OS="centos"
elif [ -f /etc/debian_version ]; then
    OS="debian"
else
    print_error "无法检测系统类型"
    exit 1
fi

print_success "检测到系统: $OS $OS_VERSION"

# 包管理器选择
if [[ "$OS" =~ ^(ubuntu|debian)$ ]]; then
    PKG_MANAGER="apt"
    UPDATE_CMD="apt-get update -y"
    INSTALL_CMD="apt-get install -y"
    NGINX_SERVICE="nginx"
elif [[ "$OS" =~ ^(centos|rhel|almalinux|rocky|alinux)$ ]]; then
    PKG_MANAGER="yum"
    UPDATE_CMD="yum update -y"
    INSTALL_CMD="yum install -y"
    NGINX_SERVICE="nginx"
elif [ "$OS" = "fedora" ]; then
    PKG_MANAGER="dnf"
    UPDATE_CMD="dnf update -y"
    INSTALL_CMD="dnf install -y"
    NGINX_SERVICE="nginx"
else
    print_error "不支持的系统: $OS"
    exit 1
fi

# ============================================
# 更新系统并安装基础工具
# ============================================
print_header "2/7 安装基础工具"

print_info "更新软件包列表..."
$UPDATE_CMD > /dev/null 2>&1

print_info "安装基础工具 (curl, wget, git, vim, ca-certificates)..."

# 安装基础工具
$INSTALL_CMD curl wget git vim ca-certificates gnupg lsb-release > /dev/null 2>&1

# 根据系统类型安装编译工具（可能需要）
if [ "$PKG_MANAGER" = "apt" ]; then
    $INSTALL_CMD build-essential software-properties-common > /dev/null 2>&1 || true
else
    $INSTALL_CMD make gcc gcc-c++ > /dev/null 2>&1 || true
fi

print_success "基础工具安装完成"
echo "  • Git: $(git --version 2>/dev/null | head -1)"
echo "  • Vim: $(vim --version | head -1)"
echo "  • Curl: $(curl --version | head -1)"

# ============================================
# 安装 Node.js 20
# ============================================
print_header "3/7 安装 Node.js 20"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" = "20" ]; then
        print_success "Node.js 20 已安装: $NODE_VERSION"
    else
        print_warning "检测到 Node.js $NODE_VERSION，将安装 Node.js 20"
        INSTALL_NODE=true
    fi
else
    INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = true ]; then
    print_info "从淘宝镜像下载 Node.js 20..."
    NODE_VERSION="20.18.2"

    # 检测系统架构
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        ARCH_SUFFIX="x64"
    elif [ "$ARCH" = "aarch64" ]; then
        ARCH_SUFFIX="arm64"
    else
        print_error "不支持的架构: $ARCH"
        exit 1
    fi

    # 下载并解压
    curl -fsSL "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH_SUFFIX}.tar.xz" -o /tmp/node.tar.xz
    tar -xf /tmp/node.tar.xz -C /usr/local --strip-components=1
    rm -f /tmp/node.tar.xz

    # 配置 npm 国内镜像
    npm config set registry https://registry.npmmirror.com

    print_success "Node.js $(node -v) 安装完成"
fi

# 安装 pnpm
if ! command -v pnpm &> /dev/null; then
    print_info "安装 pnpm..."
    corepack enable
    corepack prepare pnpm@latest --activate
    print_success "pnpm $(pnpm -v) 安装完成"
else
    print_success "pnpm $(pnpm -v) 已安装"
fi

# 裸机部署需要 PM2
if [ "$NEED_PM2" = "true" ]; then
    if ! command -v pm2 &> /dev/null; then
        print_info "安装 PM2..."
        npm install -g pm2 > /dev/null 2>&1
        print_success "PM2 $(pm2 -v) 安装完成"
    else
        print_success "PM2 $(pm2 -v) 已安装"
    fi
fi

# ============================================
# 安装 Docker (Docker 部署模式)
# ============================================
if [ "$NEED_DOCKER" = "true" ]; then
    print_header "4/7 安装 Docker"

    if command -v docker &> /dev/null; then
        print_success "Docker $(docker --version | head -1) 已安装"
    else
        print_info "安装 Docker..."

        if [ "$PKG_MANAGER" = "apt" ]; then
            # Ubuntu/Debian
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

            # 更新并安装
            apt-get update > /dev/null 2>&1
            $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null 2>&1

        elif [ "$PKG_MANAGER" = "yum" ] || [ "$PKG_MANAGER" = "dnf" ]; then
            # CentOS/RHEL/Fedora
            yum install -y yum-utils > /dev/null 2>&1
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo > /dev/null 2>&1
            $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null 2>&1
        fi

        # 启动 Docker
        systemctl start docker
        systemctl enable docker > /dev/null 2>&1

        print_success "Docker $(docker --version | head -1) 安装完成"
        print_success "Docker Compose $(docker compose version) 安装完成"
    fi

    # 配置 Docker 镜像加速（国内用户）
    print_info "配置 Docker 镜像加速..."
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.ccs.tencentyun.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    systemctl daemon-reload > /dev/null 2>&1
    systemctl restart docker > /dev/null 2>&1
    print_success "Docker 镜像加速配置完成"
fi

# ============================================
# 安装 Redis (裸机部署模式)
# ============================================
if [ "$NEED_REDIS" = "true" ]; then
    print_header "5/7 安装 Redis"

    if systemctl is-active --quiet redis-server 2>/dev/null || \
       systemctl is-active --quiet redis 2>/dev/null; then
        print_success "Redis 已运行"
    else
        print_info "安装 Redis..."
        if [ "$PKG_MANAGER" = "apt" ]; then
            $INSTALL_CMD redis-server > /dev/null 2>&1
            systemctl enable redis-server > /dev/null 2>&1
            systemctl start redis-server > /dev/null 2>&1
        else
            $INSTALL_CMD redis > /dev/null 2>&1
            systemctl enable redis > /dev/null 2>&1
            systemctl start redis > /dev/null 2>&1
        fi
        print_success "Redis 安装完成"
    fi

    # 生成 Redis 密码
    REDIS_PASSWORD_FILE="/root/.redis_password"
    if [ ! -f "$REDIS_PASSWORD_FILE" ]; then
        openssl rand -hex 16 > "$REDIS_PASSWORD_FILE" 2>/dev/null || echo "change_redis_password" > "$REDIS_PASSWORD_FILE"
        chmod 600 "$REDIS_PASSWORD_FILE"
    fi
    REDIS_PASSWORD=$(cat "$REDIS_PASSWORD_FILE")
    print_success "Redis 密码已生成并保存"
fi

# ============================================
# 安装 Nginx (裸机部署模式)
# ============================================
if [ "$NEED_NGINX" = "true" ]; then
    print_header "6/7 安装 Nginx"

    if systemctl is-active --quiet nginx 2>/dev/null || \
       systemctl is-active --quiet $NGINX_SERVICE 2>/dev/null; then
        print_success "Nginx 已运行"
    else
        print_info "安装 Nginx..."

        if [ "$PKG_MANAGER" = "apt" ]; then
            $INSTALL_CMD nginx > /dev/null 2>&1
        else
            # 安装 EPEL
            if [ "$OS" != "alinux" ]; then
                if ! rpm -q epel-release &> /dev/null; then
                    if [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
                        yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-$(rpm -E %rhel).noarch.rpm > /dev/null 2>&1
                    else
                        $INSTALL_CMD epel-release > /dev/null 2>&1
                    fi
                fi
            fi
            $INSTALL_CMD nginx > /dev/null 2>&1
        fi

        systemctl enable nginx > /dev/null 2>&1
        systemctl start nginx > /dev/null 2>&1

        # 创建 SSL 配置
        mkdir -p /etc/nginx/conf.d 2>/dev/null || true
        cat > /etc/nginx/conf.d/ssl.conf << 'EOF'
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
add_header Strict-Transport-Security "max-age=63072000" always;
EOF

        print_success "Nginx 安装完成"
    fi
fi

# ============================================
# 配置防火墙
# ============================================
print_header "7/7 配置防火墙"

if command -v ufw &> /dev/null; then
    print_info "配置 UFW 防火墙..."
    ufw --force reset > /dev/null 2>&1
    ufw default deny incoming > /dev/null 2>&1
    ufw default allow outgoing > /dev/null 2>&1
    ufw allow 22/tcp > /dev/null 2>&1
    ufw allow 80/tcp > /dev/null 2>&1
    ufw allow 443/tcp > /dev/null 2>&1
    if [ "$NEED_DOCKER" = "true" ]; then
        ufw allow 7890/tcp > /dev/null 2>&1  # Backend API
        ufw allow 5180/tcp > /dev/null 2>&1  # Website
    fi
    ufw --force enable > /dev/null 2>&1
    print_success "UFW 防火墙配置完成"
elif command -v firewall-cmd &> /dev/null; then
    print_info "配置 Firewalld 防火墙..."
    if ! systemctl is-active --quiet firewalld; then
        systemctl start firewalld > /dev/null 2>&1
        systemctl enable firewalld > /dev/null 2>&1
    fi
    firewall-cmd --permanent --add-service=ssh > /dev/null 2>&1
    firewall-cmd --permanent --add-service=http > /dev/null 2>&1
    firewall-cmd --permanent --add-service=https > /dev/null 2>&1
    if [ "$NEED_DOCKER" = "true" ]; then
        firewall-cmd --permanent --add-port=7890/tcp > /dev/null 2>&1
        firewall-cmd --permanent --add-port=5180/tcp > /dev/null 2>&1
    fi
    firewall-cmd --reload > /dev/null 2>&1
    print_success "Firewalld 防火墙配置完成"
else
    print_warning "未检测到防火墙，请手动配置"
fi

# ============================================
# 创建目录结构
# ==========================================
mkdir -p /opt/qzt/{backend,frontend,website}
mkdir -p /var/www/qzt
mkdir -p /opt/qzt-backup
print_success "目录结构创建完成"

# ============================================
# 生成密钥和配置
# ==========================================

# 生成 JWT 密钥
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change_jwt_secret")

# 获取服务器 IP
SERVER_IP=$(curl -s4 ifconfig.me 2>/dev/null || curl -s4 ip.sb 2>/dev/null || echo "你的服务器IP")

# ============================================
# 完成信息
# ==========================================
print_header "✓ 初始化完成"

echo -e "${CYAN}已安装组件：${NC}"
echo "  • Git: $(git --version | head -1)"
echo "  • Node.js: $(node -v)"
echo "  • pnpm: $(pnpm -v)"
if [ "$NEED_PM2" = "true" ]; then
    echo "  • PM2: $(pm2 -v)"
fi
if [ "$NEED_DOCKER" = "true" ]; then
    echo "  • Docker: $(docker --version | head -1)"
    echo "  • Docker Compose: $(docker compose version)"
fi
if [ "$NEED_REDIS" = "true" ]; then
    echo "  • Redis: 已安装"
    echo "  • Redis 密码: $(cat /root/.redis_password)"
fi
if [ "$NEED_NGINX" = "true" ]; then
    echo "  • Nginx: $(nginx -v 2>&1 | head -1)"
fi

echo ""
if [ "$NEED_REDIS" = "true" ]; then
    echo -e "${CYAN}重要信息：${NC}"
    echo "  • Redis 密码已保存到: /root/.redis_password"
fi
echo ""

echo -e "${YELLOW}下一步：${NC}"
echo ""

if [ "$DEPLOY_MODE" = "2" ]; then
    # Docker 部署模式
    echo -e "${GREEN}🐳 Docker 部署模式${NC}"
    echo ""
    echo -e "${CYAN}下一步操作：${NC}"
    echo ""
    echo "  1. 克隆项目:"
    echo "     git clone https://github.com/Gyv12345/qzt.git"
    echo "     cd qzt"
    echo ""
    echo "  2. 运行部署脚本:"
    echo "     bash scripts/deploy/docker-deploy.sh"
    echo ""
    echo -e "${YELLOW}提示：${NC}部署脚本会自动检测服务器配置并分配资源"
else
    # 裸机部署模式
    echo -e "${GREEN}⚙️ 裸机部署模式${NC}"
    echo ""
    echo -e "${CYAN}下一步操作：${NC}"
    echo ""
    echo "  1. 编辑环境变量:"
    echo "     vim /opt/qzt/backend/.env"
    echo ""
    echo "  2. 部署代码"
    echo ""
    echo -e "${YELLOW}提示：${NC}裸机部署需要手动配置 PM2 和 Nginx"
fi

echo ""
print_success "初始化脚本执行完成！"
echo ""
