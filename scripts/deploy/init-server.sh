#!/bin/bash
# ============================================================
# 服务器初始化脚本（只需运行一次）
# 支持: Ubuntu/Debian, CentOS/RHEL/AlmaLinux/Rocky, Fedora, Alibaba Cloud Linux
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   企智通 QZT - 服务器初始化${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# 检查 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户或 sudo 运行${NC}"
    exit 1
fi

# ============================================
# 检测 Linux 发行版
# ============================================
echo -e "${YELLOW}检测系统类型...${NC}"

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
elif [ -f /etc/redhat-release ]; then
    OS="centos"
elif [ -f /etc/debian_version ]; then
    OS="debian"
else
    echo -e "${RED}无法检测系统类型${NC}"
    exit 1
fi

echo -e "${GREEN}检测到系统: $OS $OS_VERSION${NC}"

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
    echo -e "${RED}不支持的系统: $OS${NC}"
    exit 1
fi

# ============================================
# 1. 安装基础工具
# ============================================
echo -e "${YELLOW}[1/5] 安装基础工具...${NC}"

$UPDATE_CMD
$INSTALL_CMD curl wget git vim build-essential software-properties-common ca-certificates gnupg lsb-release 2>/dev/null || \
$INSTALL_CMD curl wget git vim make gcc ca-certificates gnupg

echo -e "${GREEN}✓ 基础工具安装完成${NC}"

# ============================================
# 2. 安装 Node.js 20
# ============================================
echo -e "${YELLOW}[2/5] 安装 Node.js 20...${NC}"

if command -v node &> /dev/null && [ "$(node -v | cut -d'.' -f1)" = "v20" ]; then
    echo -e "${GREEN}Node.js 20 已安装: $(node -v)${NC}"
else
    # 使用国内镜像下载
    NODE_VERSION="20.11.1"
    echo -e "${CYAN}从淘宝镜像下载 Node.js...${NC}"
    curl -fsSL https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz -o /tmp/node.tar.xz

    # 检测系统架构
    ARCH=$(uname -m)
    if [ "$ARCH" != "x86_64" ] && [ "$ARCH" != "aarch64" ]; then
        echo -e "${RED}不支持的架构: $ARCH${NC}"
        exit 1
    fi

    tar -xf /tmp/node.tar.xz -C /usr/local --strip-components=1
    rm -f /tmp/node.tar.xz

    # 配置 npm 国内镜像
    npm config set registry https://registry.npmmirror.com

    echo -e "${GREEN}✓ Node.js $(node -v) 安装完成${NC}"
fi

# 安装 pnpm 和 PM2
if ! command -v pnpm &> /dev/null; then
    corepack enable
    corepack prepare pnpm@latest --activate
fi

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

echo -e "${GREEN}✓ pnpm $(pnpm -v), PM2 $(pm2 -v)${NC}"

# ============================================
# 3. 安装 Redis
# ============================================
echo -e "${YELLOW}[3/5] 安装 Redis...${NC}"

if systemctl is-active --quiet redis-server 2>/dev/null || \
   systemctl is-active --quiet redis 2>/dev/null; then
    echo -e "${GREEN}Redis 已运行${NC}"
else
    if [ "$PKG_MANAGER" = "apt" ]; then
        $INSTALL_CMD redis-server
        systemctl enable redis-server
        systemctl start redis-server
    else
        $INSTALL_CMD redis
        systemctl enable redis
        systemctl start redis
    fi
    echo -e "${GREEN}✓ Redis 安装完成${NC}"
fi

# 生成 Redis 密码并保存
REDIS_PASSWORD_FILE="/root/.redis_password"
if [ ! -f "$REDIS_PASSWORD_FILE" ]; then
    openssl rand -hex 16 > "$REDIS_PASSWORD_FILE"
    chmod 600 "$REDIS_PASSWORD_FILE"
    echo -e "${GREEN}✓ Redis 密码已生成${NC}"
fi
REDIS_PASSWORD=$(cat "$REDIS_PASSWORD_FILE")

# ============================================
# 4. 安装 Nginx
# ============================================
echo -e "${YELLOW}[4/5] 安装 Nginx...${NC}"

if systemctl is-active --quiet nginx 2>/dev/null || \
   systemctl is-active --quiet $NGINX_SERVICE 2>/dev/null; then
    echo -e "${GREEN}Nginx 已运行${NC}"
else
    if [ "$PKG_MANAGER" = "apt" ]; then
        $INSTALL_CMD nginx
    else
        # alinux 系统已有 EPEL (epel-aliyuncs-release)，跳过安装
        # 其他系统需要安装 EPEL
        if [ "$OS" != "alinux" ]; then
            if ! rpm -q epel-release &> /dev/null; then
                if [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
                    yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-$(rpm -E %rhel).noarch.rpm
                else
                    $INSTALL_CMD epel-release
                fi
            fi
        fi
        $INSTALL_CMD nginx
    fi

    systemctl enable nginx 2>/dev/null || systemctl enable $NGINX_SERVICE
    systemctl start nginx 2>/dev/null || systemctl start $NGINX_SERVICE
    echo -e "${GREEN}✓ Nginx 安装完成${NC}"
fi

# 创建 SSL 配置
mkdir -p /etc/nginx/conf.d 2>/dev/null || mkdir -p /etc/nginx/conf.d
cat > /etc/nginx/conf.d/ssl.conf << 'EOF'
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
add_header Strict-Transport-Security "max-age=63072000" always;
EOF

# ============================================
# 5. 配置防火墙
# ============================================
echo -e "${YELLOW}[5/5] 配置防火墙...${NC}"

if command -v ufw &> /dev/null; then
    # Ubuntu/Debian 使用 ufw
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    echo -e "${GREEN}✓ UFW 防火墙配置完成${NC}"
elif command -v firewall-cmd &> /dev/null; then
    # CentOS/RHEL 使用 firewalld
    if ! systemctl is-active --quiet firewalld; then
        systemctl start firewalld
        systemctl enable firewalld
    fi
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo -e "${GREEN}✓ Firewalld 防火墙配置完成${NC}"
else
    echo -e "${YELLOW}未检测到防火墙，请手动配置${NC}"
fi

# ============================================
# 创建目录结构
# ============================================
echo -e "${YELLOW}创建目录结构...${NC}"

mkdir -p /opt/qzt/{backend,frontend,website}
mkdir -p /var/www/qzt
mkdir -p /opt/qzt-backup
mkdir -p /opt/qzt-deploy/scripts

echo -e "${GREEN}✓ 目录创建完成${NC}"

# ============================================
# 生成 SSH 密钥（用于 GitHub）
# ============================================
echo -e "${YELLOW}配置 SSH...${NC}"

if [ ! -f ~/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -C "qzt-server" -N "" -f ~/.ssh/id_ed25519 2>/dev/null || \
    ssh-keygen -t rsa -b 4096 -C "qzt-server" -N "" -f ~/.ssh/id_rsa
    echo -e "${GREEN}✓ SSH 密钥已生成${NC}"
    echo ""
    echo -e "${CYAN}请将以下公钥添加到 GitHub Deploy Keys:${NC}"
    if [ -f ~/.ssh/id_ed25519.pub ]; then
        cat ~/.ssh/id_ed25519.pub
    else
        cat ~/.ssh/id_rsa.pub
    fi
    echo ""
    echo -e "${CYAN}GitHub 路径: Settings → Deploy keys${NC}"
else
    echo -e "${GREEN}✓ SSH 密钥已存在${NC}"
fi

# ============================================
# 创建环境变量模板
# ============================================
echo -e "${YELLOW}创建环境变量模板...${NC}"

ENV_FILE="/opt/qzt/backend/.env"
if [ -f "$ENV_FILE" ]; then
    # 自动备份现有环境变量文件
    BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo -e "${YELLOW}⚠ 环境变量文件已存在，已备份到: $BACKUP_FILE${NC}"
    CREATE_ENV=1
else
    CREATE_ENV=1
fi

if [ "$CREATE_ENV" = "1" ]; then
    mkdir -p /opt/qzt/backend
    JWT_SECRET=$(openssl rand -hex 32)
    cat > "$ENV_FILE" << EOF
# ============================================
# 企智通 QZT - 环境变量配置
# ============================================
# 说明：Redis 密码和 JWT 密钥已自动生成，无需修改
# 只需填写数据库信息和域名即可

# === 数据库配置（必填）===
# 注意：数据库会在首次部署时自动创建（确保用户有 CREATE 权限）
DATABASE_PROVIDER=mysql
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USERNAME=你的数据库用户名
DB_PASSWORD=你的数据库密码
DB_DATABASE=数据库名

# === Redis 配置（已自动生成）===
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# === JWT 配置（已自动生成）===
# 如需重新生成，运行: openssl rand -hex 32
JWT_SECRET=$JWT_SECRET

# === 域名配置（必填）===
DOMAIN_NAME=yourdomain.com
ADMIN_DOMAIN=admin.yourdomain.com

# === PM2 集群（2C4G 推荐启用）===
PM2_CLUSTER_ENABLED=true

# === 可选配置（OSS 文件上传）===
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=

# === e签宝（可选）===
ESIGN_APP_ID=
ESIGN_APP_SECRET=
EOF
    echo -e "${GREEN}✓ 环境变量模板已创建${NC}"
fi

# ============================================
# SSL 证书配置（可选）
# ============================================
echo ""
echo -e "${YELLOW}是否现在配置 SSL 证书？${NC}"
echo "  1) 跳过（稍后手动配置）"
echo "  2) 自签名证书（测试用）"
echo "  3) Let's Encrypt（需要域名已解析）"
echo ""
read -p "请选择 (1-3, 默认:1): " SSL_CHOICE
SSL_CHOICE=${SSL_CHOICE:-1}

if [ "$SSL_CHOICE" != "1" ]; then
    # 读取域名
    source "$ENV_FILE" 2>/dev/null || true
    DOMAIN="${DOMAIN_NAME:-yourdomain.com}"
    CERT_DIR="/etc/nginx/ssl/$DOMAIN"
    mkdir -p "$CERT_DIR"

    if [ "$SSL_CHOICE" = "2" ]; then
        echo -e "${YELLOW}生成自签名证书...${NC}"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$CERT_DIR/key.pem" \
            -out "$CERT_DIR/cert.pem" \
            -subj "/C=CN/ST=Shanghai/L=Shanghai/O=QZT/CN=$DOMAIN" 2>/dev/null
        chmod 600 "$CERT_DIR/key.pem"
        chmod 644 "$CERT_DIR/cert.pem"
        echo -e "${GREEN}✓ 自签名证书已生成: $CERT_DIR${NC}"
        echo -e "${YELLOW}⚠️ 浏览器会显示安全警告，这是正常的${NC}"
    elif [ "$SSL_CHOICE" = "3" ]; then
        echo -e "${YELLOW}配置 Let's Encrypt...${NC}"
        echo -e "${YELLOW}确保域名已正确解析到当前服务器${NC}"

        # 安装 certbot
        if ! command -v certbot &> /dev/null; then
            if [ "$PKG_MANAGER" = "apt" ]; then
                $INSTALL_CMD certbot
            else
                $INSTALL_CMD certbot python3-certbot-nginx
            fi
        fi

        # HTTP 验证
        mkdir -p /var/www/certbot
        certbot certonly --webroot \
            --webroot-path=/var/www/certbot \
            --email "admin@$DOMAIN" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN" \
            -d "www.$DOMAIN" \
            -d "admin.$DOMAIN" && {
            ln -sf "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/cert.pem"
            ln -sf "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/key.pem"
            echo -e "${GREEN}✓ Let's Encrypt 证书已获取${NC}"
        } || echo -e "${RED}✗ 证书获取失败，请稍后手动配置${NC}"
    fi
fi

# ============================================
# 完成
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 服务器初始化完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}系统信息：${NC}"
echo "  OS: $OS $OS_VERSION"
echo "  Node.js: $(node -v)"
echo "  pnpm: $(pnpm -v)"
echo "  PM2: $(pm2 -v)"
echo "  Redis: $(redis-cli --version 2>/dev/null | head -1 || echo '已安装')"
echo "  Nginx: $(nginx -v 2>&1)"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo ""
echo -e "${CYAN}1. 编辑环境变量，填写数据库和域名：${NC}"
echo "   vim /opt/qzt/backend/.env"
echo ""
echo -e "${CYAN}2. 如跳过 SSL 配置，稍后可手动配置：${NC}"
echo "   自签名证书（测试）："
echo "   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
echo "     -keyout /etc/nginx/ssl/域名/key.pem \\"
echo "     -out /etc/nginx/ssl/域名/cert.pem \\"
echo "     -subj '/C=CN/ST=Shanghai/L=Shanghai/O=QZT/CN=域名'"
echo ""
echo -e "${CYAN}3. 配置 GitHub Secrets：${NC}"
echo "   在仓库 Settings → Secrets and variables → Actions 添加："
echo "   SERVER_HOST     = 服务器 IP"
echo "   SERVER_USER     = root"
echo "   SSH_PRIVATE_KEY = $(echo ~/.ssh/id_*.pub | sed 's/\.pub$//')"
echo "   SSH_PORT        = 22"
echo ""
echo -e "${CYAN}4. 推送代码触发部署：${NC}"
echo "   git push origin main"
echo ""
