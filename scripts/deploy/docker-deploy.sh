#!/bin/bash
# ============================================================
# 企智通 QZT - Docker 部署脚本
# ============================================================
# 功能：
# - 检测服务器配置（CPU/内存）
# - 询问是否使用 RDS
# - 根据配置自动分配资源
# - 生成 .env 文件
# - 一键启动所有服务
#
# 使用方法：
#   bash docker-deploy.sh [选项]
#
# 选项：
#   -h, --help       显示帮助信息
#   -d, --dry-run     预览模式（不实际执行）
#   -y, --yes         自动确认所有提示
#   --use-rds         强制使用 RDS
#   --no-rds          强制使用本地 MySQL
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

# 解析参数
DRY_RUN=false
AUTO_YES=false
FORCE_RDS=""
SKIP_CONFIG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            cat << EOF
${CYAN}企智通 QZT - Docker 部署脚本${NC}

${YELLOW}用法:${NC}
    bash docker-deploy.sh [选项]

${YELLOW}选项:${NC}
    -h, --help       显示此帮助信息
    -d, --dry-run     预览模式（不实际执行部署）
    -y, --yes         自动确认所有提示
    --use-rds         强制使用 RDS 数据库
    --no-rds          强制使用本地 MySQL 容器

${YELLOW}示例:${NC}
    bash docker-deploy.sh              # 交互式部署
    bash docker-deploy.sh --dry-run     # 预览部署配置
    bash docker-deploy.sh -y            # 自动确认部署
    bash docker-deploy.sh --use-rds     # 使用 RDS

${YELLOW}资源分配:${NC}
    2C2G   (低配)  - 后端:512m 前端:128m 网站:256m
    2C4G   (中配)  - 后端:1g   前端:256m 网站:512m
    4C8G+  (高配)  - 后端:2g   前端:512m 网站:1g

EOF
            exit 0
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -y|--yes)
            AUTO_YES=true
            shift
            ;;
        --use-rds)
            FORCE_RDS=true
            shift
            ;;
        --no-rds)
            FORCE_RDS=false
            shift
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 --help 查看帮助"
            exit 1
            ;;
    esac
done

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}预览模式: 不会实际执行部署${NC}"
    echo ""
fi

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   企智通 QZT - Docker 部署${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ============================================
# 检查并安装 Docker
# ============================================
echo -e "${YELLOW}检查 Docker 环境...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker 未安装，开始安装...${NC}"

    # 检测系统
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        echo -e "${RED}无法检测系统类型${NC}"
        exit 1
    fi

    if [[ "$OS" =~ ^(ubuntu|debian)$ ]]; then
        # Ubuntu/Debian - 使用阿里云镜像源
        apt-get update
        apt-get install -y ca-certificates curl gnupg lsb-release

        # 添加阿里云 Docker 镜像源
        curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    elif [[ "$OS" =~ ^(centos|rhel|almalinux|rocky|alinux)$ ]] || [ "$OS" = "fedora" ]; then
        # CentOS/RHEL/Fedora - 使用阿里云镜像源
        yum install -y yum-utils
        yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
        yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    else
        echo -e "${RED}不支持的系统: $OS${NC}"
        exit 1
    fi

    systemctl start docker
    systemctl enable docker

    # 配置镜像加速（阿里云镜像源）
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://hub-mirror.c.163.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
EOF
    systemctl daemon-reload
    systemctl restart docker

    echo -e "${GREEN}✓ Docker 安装完成${NC}"
else
    echo -e "${GREEN}✓ Docker $(docker --version | awk '{print $3}')${NC}"
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ Docker Compose 插件未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose $(docker compose version --short)${NC}"
echo ""

# ============================================
# 检测服务器配置
# ============================================
echo -e "${YELLOW}检测服务器配置...${NC}"

# 获取 CPU 核心数
if command -v nproc &> /dev/null; then
    CPU_CORES=$(nproc)
else
    CPU_CORES=$(sysctl -n hw.ncpu 2>/dev/null || echo "2")
fi

# 获取总内存（MB）
if command -v free &> /dev/null; then
    TOTAL_MEM_MB=$(free -m | awk '/Mem:/ {print $2}')
elif command -v sysctl &> /dev/null; then
    TOTAL_MEM_BYTES=$(sysctl hw.memsize 2>/dev/null | awk '{print $2}')
    TOTAL_MEM_MB=$((TOTAL_MEM_BYTES / 1024 / 1024))
else
    TOTAL_MEM_MB=2048
fi

echo -e "${CYAN}CPU 核心: ${CPU_CORES}${NC}"
echo -e "${CYAN}内存大小: ${TOTAL_MEM_MB} MB${NC}"
echo ""

# ============================================
# 根据配置分配资源
# ============================================
echo -e "${YELLOW}计算资源分配...${NC}"

if [ $CPU_CORES -le 2 ] && [ $TOTAL_MEM_MB -le 2048 ]; then
    # 2C2G 配置
    TIER="2C2G"
    BACKEND_MEM="512m"
    FRONTEND_MEM="128m"
    WEBSITE_MEM="256m"
    REDIS_MEM="128m"
    MYSQL_MEM="512m"
    BACKEND_CPU="1"
    FRONTEND_CPU="0.5"
    WEBSITE_CPU="0.5"
    REDIS_CPU="0.5"
    MYSQL_CPU="1"
    REDIS_MAX_MEM="128mb"
    MYSQL_INNODB="128M"
elif [ $CPU_CORES -le 2 ] && [ $TOTAL_MEM_MB -le 4096 ]; then
    # 2C4G 配置
    TIER="2C4G"
    BACKEND_MEM="1g"
    FRONTEND_MEM="256m"
    WEBSITE_MEM="512m"
    REDIS_MEM="256m"
    MYSQL_MEM="1g"
    BACKEND_CPU="1"
    FRONTEND_CPU="0.5"
    WEBSITE_CPU="0.5"
    REDIS_CPU="0.5"
    MYSQL_CPU="1"
    REDIS_MAX_MEM="256mb"
    MYSQL_INNODB="256M"
else
    # 4C8G+ 配置
    TIER="4C8G+"
    BACKEND_MEM="2g"
    FRONTEND_MEM="512m"
    WEBSITE_MEM="1g"
    REDIS_MEM="512m"
    MYSQL_MEM="2g"
    BACKEND_CPU="2"
    FRONTEND_CPU="1"
    WEBSITE_CPU="1"
    REDIS_CPU="1"
    MYSQL_CPU="2"
    REDIS_MAX_MEM="512mb"
    MYSQL_INNODB="512M"
fi

echo -e "${GREEN}检测配置: ${TIER}${NC}"
echo -e "${CYAN}资源分配方案:${NC}"
echo "  后端:    ${BACKEND_CPU} CPU, ${BACKEND_MEM} 内存"
echo "  前端:    ${FRONTEND_CPU} CPU, ${FRONTEND_MEM} 内存"
echo "  网站:    ${WEBSITE_CPU} CPU, ${WEBSITE_MEM} 内存"
echo "  Redis:   ${REDIS_CPU} CPU, ${REDIS_MEM} 内存"
echo "  MySQL:   ${MYSQL_CPU} CPU, ${MYSQL_MEM} 内存"
echo ""

# ============================================
# 检查是否已有 .env 文件
# ============================================
if [ -f ".env" ]; then
    echo -e "${YELLOW}检测到已存在 .env 配置文件${NC}"
    read -p "是否使用现有配置跳过询问? [Y/n]: " USE_EXISTING
    USE_EXISTING=${USE_EXISTING:-Y}

    if [[ "$USE_EXISTING" =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}使用现有配置...${NC}"
        source .env
        # 根据 RDS_HOST 判断使用哪个 compose 文件
        if [ -n "$RDS_HOST" ]; then
            COMPOSE_FILE="docker-compose.rds.yml"
            USE_RDS=true
        else
            COMPOSE_FILE="docker-compose.yml"
            USE_RDS=false
        fi
        SKIP_CONFIG=true
    fi
fi

# ============================================
# 询问数据库配置
# ============================================
if [ "$SKIP_CONFIG" != "true" ]; then
    echo -e "${YELLOW}数据库配置${NC}"
    echo ""
    echo "请选择数据库配置方式："
    echo "  1) 使用阿里云 RDS MySQL（推荐）"
    echo "  2) 使用本地 MySQL 容器"
    echo ""
    read -p "请选择 (1-2): " DB_CHOICE
fi

if [ "$DB_CHOICE" = "1" ]; then
    # 使用 RDS
    USE_RDS=true
    echo ""
    echo -e "${CYAN}请输入 RDS 配置信息:${NC}"

    read -p "RDS 地址 [rm-xxxxx.mysql.rds.aliyuncs.com]: " RDS_HOST
    RDS_HOST=${RDS_HOST:-rm-xxxxx.mysql.rds.aliyuncs.com}

    read -p "RDS 端口 [3306]: " RDS_PORT
    RDS_PORT=${RDS_PORT:-3306}

    read -p "数据库用户名: " RDS_USERNAME
    while [ -z "$RDS_USERNAME" ]; do
        echo -e "${RED}用户名不能为空${NC}"
        read -p "数据库用户名: " RDS_USERNAME
    done

    read -sp "数据库密码: " RDS_PASSWORD
    echo ""
    while [ -z "$RDS_PASSWORD" ]; do
        echo -e "${RED}密码不能为空${NC}"
        read -sp "数据库密码: " RDS_PASSWORD
        echo ""
    done

    read -p "数据库名称 [qzt_db]: " RDS_DATABASE
    RDS_DATABASE=${RDS_DATABASE:-qzt_db}

    COMPOSE_FILE="docker-compose.rds.yml"
else
    # 使用本地 MySQL
    USE_RDS=false
    COMPOSE_FILE="docker-compose.yml"

    # 生成随机密码
    MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "root_$(date +%s)")
    DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "db_$(date +%s)")

    echo ""
    echo -e "${CYAN}将使用本地 MySQL 容器${NC}"
    echo -e "${YELLOW}已生成随机密码，请妥善保管${NC}"
fi

# ============================================
# 生成其他配置
# ============================================

# 生成 Redis 密码（无论 RDS 还是本地 MySQL 都需要）
REDIS_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "redis_$(date +%s)")

# 生成 JWT 密钥
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "jwt_$(date +%s)_secret")
fi

# 域名配置
if [ "$SKIP_CONFIG" != "true" ]; then
    echo ""
    read -p "前端域名 [localhost]: " DOMAIN_NAME
    DOMAIN_NAME=${DOMAIN_NAME:-localhost}

    read -p "管理后台域名 [admin.localhost]: " ADMIN_DOMAIN
    ADMIN_DOMAIN=${ADMIN_DOMAIN:-admin.localhost}
fi

# ============================================
# HTTPS/SSL 配置
# ============================================
echo ""
echo -e "${YELLOW}HTTPS/SSL 配置${NC}"
echo ""
echo "请选择 SSL 证书方式："
echo "  1) 不启用 HTTPS - 仅 HTTP（开发测试）"
echo "  2) 自签名证书 - 快速测试 HTTPS，浏览器会警告"
echo "  3) 上传证书 - 你已有 .crt 和 .key 文件"
echo "  4) Let's Encrypt - 自动申请免费证书（支持泛域名）"
echo ""
read -p "请选择 (1-4) [默认: 1]: " SSL_CHOICE
SSL_CHOICE=${SSL_CHOICE:-1}

SSL_DIR="./scripts/deploy/ssl"
mkdir -p "$SSL_DIR"

case $SSL_CHOICE in
    2)
        # 自签名证书
        echo -e "${YELLOW}生成自签名证书...${NC}"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/key.pem" \
            -out "$SSL_DIR/cert.pem" \
            -subj "/C=CN/ST=Shanghai/L=Shanghai/O=QZT/CN=$DOMAIN_NAME"
        chmod 600 "$SSL_DIR/key.pem"
        chmod 644 "$SSL_DIR/cert.pem"
        ENABLE_HTTPS="true"
        SSL_CERT_PATH="$SSL_DIR/cert.pem"
        SSL_KEY_PATH="$SSL_DIR/key.pem"
        echo -e "${GREEN}✓ 自签名证书已生成${NC}"
        echo -e "${YELLOW}⚠️ 浏览器会显示安全警告，这是正常的${NC}"
        ;;
    3)
        # 上传证书
        echo ""
        echo -e "${YELLOW}请输入证书内容${NC}"
        echo "证书文件 (.crt 或 .pem):"
        echo "(粘贴内容后按 Ctrl+D 结束)"
        CERT_CONTENT=$(cat)
        echo "$CERT_CONTENT" > "$SSL_DIR/cert.pem"

        echo ""
        echo "私钥文件 (.key):"
        echo "(粘贴内容后按 Ctrl+D 结束)"
        KEY_CONTENT=$(cat)
        echo "$KEY_CONTENT" > "$SSL_DIR/key.pem"

        # 验证证书
        if openssl x509 -in "$SSL_DIR/cert.pem" -noout >/dev/null 2>&1; then
            chmod 600 "$SSL_DIR/key.pem"
            chmod 644 "$SSL_DIR/cert.pem"
            ENABLE_HTTPS="true"
            SSL_CERT_PATH="$SSL_DIR/cert.pem"
            SSL_KEY_PATH="$SSL_DIR/key.pem"
            echo -e "${GREEN}✓ 证书已保存${NC}"
        else
            echo -e "${RED}✗ 证书格式错误，请检查${NC}"
            exit 1
        fi
        ;;
    4)
        # Let's Encrypt
        echo -e "${YELLOW}使用 Let's Encrypt 申请证书...${NC}"
        echo ""

        # 检查是否安装了 certbot
        if ! command -v certbot &> /dev/null; then
            echo -e "${YELLOW}安装 Certbot...${NC}"
            apt-get update -qq && apt-get install -y certbot
        fi

        # 询问是否需要泛域名证书
        echo ""
        read -p "是否需要泛域名证书 (*.$DOMAIN_NAME)? [y/N]: " WILDCARD
        WILDCARD=${WILDCARD:-n}

        if [[ "$WILDCARD" =~ ^[Yy]$ ]]; then
            # 泛域名证书 - DNS 验证
            echo -e "${YELLOW}泛域名证书需要 DNS 验证${NC}"
            echo ""
            echo "请选择你的 DNS 服务商："
            echo "  1) 阿里云"
            echo "  2) 腾讯云"
            echo "  3) Cloudflare"
            echo "  4) 其他 (手动配置)"
            echo ""
            read -p "请选择 (1-4): " DNS_PROVIDER

            case $DNS_PROVIDER in
                1)
                    # 阿里云
                    echo -e "${YELLOW}阿里云 DNS 验证...${NC}"
                    echo ""
                    echo "请按以下步骤操作："
                    echo "  1. 登录阿里云控制台 → DNS → DNS 解析设置"
                    echo "  2. 找到域名 $DOMAIN_NAME"
                    echo "  3. 添加 TXT 记录："
                    echo "     主机记录: _acme-challenge"
                    echo "     记录值: <certbot 将显示>"
                    echo ""
                    read -p "按 Enter 添加 TXT 记录后，再次按 Enter 继续..."

                    certbot certonly --manual --preferred-challenges dns \
                        -d "*.$DOMAIN_NAME" -d "$DOMAIN_NAME" \
                        --email "admin@$DOMAIN_NAME" \
                        --agree-tos --no-eff-email \
                        --manual-public-ip-logging-ok

                    # 复制证书到项目目录
                    if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
                        cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" "$SSL_DIR/cert.pem"
                        cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" "$SSL_DIR/key.pem"
                        chmod 600 "$SSL_DIR/key.pem"
                        chmod 644 "$SSL_DIR/cert.pem"
                        ENABLE_HTTPS="true"
                        SSL_CERT_PATH="$SSL_DIR/cert.pem"
                        SSL_KEY_PATH="$SSL_DIR/key.pem"
                        echo -e "${GREEN}✓ 证书已复制到项目目录${NC}"
                    fi
                    ;;
                2)
                    # 腾讯云
                    echo -e "${YELLOW}腾讯云 DNS 验证...${NC}"
                    certbot certonly --manual --preferred-challenges dns \
                        --dns-dnspod \
                        -d "*.$DOMAIN_NAME" -d "$DOMAIN_NAME" \
                        --email "admin@$DOMAIN_NAME" \
                        --agree-tos --no-eff-email \
                        --manual-public-ip-logging-ok

                    if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
                        cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" "$SSL_DIR/cert.pem"
                        cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" "$SSL_DIR/key.pem"
                        chmod 600 "$SSL_DIR/key.pem"
                        chmod 644 "$SSL_DIR/cert.pem"
                        ENABLE_HTTPS="true"
                        SSL_CERT_PATH="$SSL_DIR/cert.pem"
                        SSL_KEY_PATH="$SSL_DIR/key.pem"
                        echo -e "${GREEN}✓ 证书已复制到项目目录${NC}"
                    fi
                    ;;
                3)
                    # Cloudflare
                    echo -e "${YELLOW}Cloudflare DNS 验证...${NC}"
                    echo "请先安装 Cloudflare 插件:"
                    echo "  pip install certbot-dns-cloudflare"
                    echo ""
                    echo "然后创建 API Token 并保存到 /root/.secrets/certbot-cloudflare.ini"
                    read -p "配置完成后按 Enter 继续..."

                    certbot certonly --manual --preferred-challenges dns \
                        --dns-cloudflare \
                        --dns-cloudflare-credentials /root/.secrets/certbot-cloudflare.ini \
                        -d "*.$DOMAIN_NAME" -d "$DOMAIN_NAME" \
                        --email "admin@$DOMAIN_NAME" \
                        --agree-tos --no-eff-email \
                        --manual-public-ip-logging-ok

                    if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
                        cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" "$SSL_DIR/cert.pem"
                        cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" "$SSL_DIR/key.pem"
                        chmod 600 "$SSL_DIR/key.pem"
                        chmod 644 "$SSL_DIR/cert.pem"
                        ENABLE_HTTPS="true"
                        SSL_CERT_PATH="$SSL_DIR/cert.pem"
                        SSL_KEY_PATH="$SSL_DIR/key.pem"
                        echo -e "${GREEN}✓ 证书已复制到项目目录${NC}"
                    fi
                    ;;
                4)
                    # 手动 DNS 验证
                    echo -e "${YELLOW}手动 DNS 验证模式${NC}"
                    certbot certonly --manual --preferred-challenges dns \
                        -d "*.$DOMAIN_NAME" -d "$DOMAIN_NAME" \
                        --email "admin@$DOMAIN_NAME" \
                        --agree-tos --no-eff-email \
                        --manual-public-ip-logging-ok

                    if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
                        cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" "$SSL_DIR/cert.pem"
                        cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" "$SSL_DIR/key.pem"
                        chmod 600 "$SSL_DIR/key.pem"
                        chmod 644 "$SSL_DIR/cert.pem"
                        ENABLE_HTTPS="true"
                        SSL_CERT_PATH="$SSL_DIR/cert.pem"
                        SSL_KEY_PATH="$SSL_DIR/key.pem"
                        echo -e "${GREEN}✓ 证书已复制到项目目录${NC}"
                    fi
                    ;;
            esac

            # 配置自动续期
            echo ""
            echo -e "${YELLOW}配置证书自动续期...${NC}"
            (crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem $SSL_DIR/cert.pem && cp /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem $SSL_DIR/key.pem && docker compose -f scripts/deploy/$COMPOSE_FILE restart frontend") | crontab -
            echo -e "${GREEN}✓ 自动续期已配置 (每天 00:00 和 12:00)${NC}"
        else
            # 单域名证书 - HTTP 验证
            echo -e "${YELLOW}单域名证书 (HTTP 验证)...${NC}"

            # 临时启动 nginx 用于验证
            mkdir -p /var/www/certbot
            docker compose -f scripts/deploy/$COMPOSE_FILE up -d frontend
            sleep 3

            certbot certonly --webroot \
                --webroot-path=/var/www/certbot \
                -d "$DOMAIN_NAME" \
                -d "www.$DOMAIN_NAME" \
                -d "admin.$DOMAIN_NAME" \
                --email "admin@$DOMAIN_NAME" \
                --agree-tos --no-eff-email

            if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
                cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" "$SSL_DIR/cert.pem"
                cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" "$SSL_DIR/key.pem"
                chmod 600 "$SSL_DIR/key.pem"
                chmod 644 "$SSL_DIR/cert.pem"
                ENABLE_HTTPS="true"
                SSL_CERT_PATH="$SSL_DIR/cert.pem"
                SSL_KEY_PATH="$SSL_DIR/key.pem"
                echo -e "${GREEN}✓ 证书已复制到项目目录${NC}"
            fi

            # 配置自动续期
            echo ""
            echo -e "${YELLOW}配置证书自动续期...${NC}"
            (crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem $SSL_DIR/cert.pem && cp /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem $SSL_DIR/key.pem && docker compose -f scripts/deploy/$COMPOSE_FILE restart frontend") | crontab -
            echo -e "${GREEN}✓ 自动续期已配置 (每天 00:00 和 12:00)${NC}"
        fi
        ;;
    *)
        # 不启用 HTTPS
        ENABLE_HTTPS="false"
        echo -e "${YELLOW}不启用 HTTPS，仅使用 HTTP${NC}"
        ;;
esac

# ============================================
# 生成 .env 文件
# ============================================
echo ""
echo -e "${YELLOW}生成配置文件...${NC}"

if [ "$USE_RDS" = true ]; then
    cat > .env << EOF
# RDS 数据库配置
RDS_HOST=$RDS_HOST
RDS_PORT=$RDS_PORT
RDS_USERNAME=$RDS_USERNAME
RDS_PASSWORD=$RDS_PASSWORD
RDS_DATABASE=$RDS_DATABASE

# Redis 配置
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_MAX_MEMORY=$REDIS_MAX_MEM

# JWT 配置
JWT_SECRET=$JWT_SECRET

# 域名配置
DOMAIN_NAME=$DOMAIN_NAME
ADMIN_DOMAIN=$ADMIN_DOMAIN

# HTTPS/SSL 配置
ENABLE_HTTPS=${ENABLE_HTTPS:-false}
SSL_CERT_PATH=${SSL_CERT_PATH:-}
SSL_KEY_PATH=${SSL_KEY_PATH:-}

# 资源限制
BACKEND_MEM_LIMIT=$BACKEND_MEM
FRONTEND_MEM_LIMIT=$FRONTEND_MEM
WEBSITE_MEM_LIMIT=$WEBSITE_MEM
REDIS_MEM_LIMIT=$REDIS_MEM
BACKEND_CPU_LIMIT=$BACKEND_CPU
FRONTEND_CPU_LIMIT=$FRONTEND_CPU
WEBSITE_CPU_LIMIT=$WEBSITE_CPU
REDIS_CPU_LIMIT=$REDIS_CPU
EOF
else
    cat > .env << EOF
# MySQL 配置
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
DB_PASSWORD=$DB_PASSWORD

# Redis 配置
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_MAX_MEMORY=$REDIS_MAX_MEM

# JWT 配置
JWT_SECRET=$JWT_SECRET

# 域名配置
DOMAIN_NAME=$DOMAIN_NAME
ADMIN_DOMAIN=$ADMIN_DOMAIN

# HTTPS/SSL 配置
ENABLE_HTTPS=${ENABLE_HTTPS:-false}
SSL_CERT_PATH=${SSL_CERT_PATH:-}
SSL_KEY_PATH=${SSL_KEY_PATH:-}

# 资源限制
BACKEND_MEM_LIMIT=$BACKEND_MEM
FRONTEND_MEM_LIMIT=$FRONTEND_MEM
WEBSITE_MEM_LIMIT=$WEBSITE_MEM
REDIS_MEM_LIMIT=$REDIS_MEM
MYSQL_MEM_LIMIT=$MYSQL_MEM
BACKEND_CPU_LIMIT=$BACKEND_CPU
FRONTEND_CPU_LIMIT=$FRONTEND_CPU
WEBSITE_CPU_LIMIT=$WEBSITE_CPU
REDIS_CPU_LIMIT=$REDIS_CPU
MYSQL_CPU_LIMIT=$MYSQL_CPU
MYSQL_INNODB_BUFFER_POOL_SIZE=$MYSQL_INNODB
EOF
fi

echo -e "${GREEN}✓ 配置文件已生成: .env${NC}"

# ============================================
# 构建镜像
# ============================================
echo ""
echo -e "${YELLOW}构建 Docker 镜像...${NC}"
echo -e "${CYAN}这可能需要几分钟...${NC}"

docker compose -f scripts/deploy/$COMPOSE_FILE build

echo -e "${GREEN}✓ 镜像构建完成${NC}"

# ============================================
# 启动服务
# ============================================
echo ""
echo -e "${YELLOW}启动服务...${NC}"

docker compose -f scripts/deploy/$COMPOSE_FILE up -d

echo -e "${GREEN}✓ 服务已启动${NC}"

# ============================================
# 等待服务就绪
# ============================================
echo ""
echo -e "${YELLOW}等待服务启动...${NC}"

sleep 10

# 等待后端服务
echo -n "  后端服务: "
for i in {1..30}; do
    if docker compose -f scripts/deploy/$COMPOSE_FILE exec -T backend curl -sf http://localhost:7890/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 就绪${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠ 启动中（请稍后检查）${NC}"
    fi
    sleep 2
done

# 等待前端服务
echo -n "  前端服务: "
for i in {1..15}; do
    if docker compose -f scripts/deploy/$COMPOSE_FILE exec -T frontend wget -q -O /dev/null http://localhost/health 2>/dev/null; then
        echo -e "${GREEN}✓ 就绪${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${YELLOW}⚠ 启动中（请稍后检查）${NC}"
    fi
    sleep 2
done

# 等待网站服务
echo -n "  网站服务: "
for i in {1..15}; do
    if docker compose -f scripts/deploy/$COMPOSE_FILE exec -T website curl -sf http://localhost:5180/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 就绪${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${YELLOW}⚠ 启动中（请稍后检查）${NC}"
    fi
    sleep 2
done

# ============================================
# 显示服务状态
# ============================================
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✓ 部署完成${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

docker compose -f scripts/deploy/$COMPOSE_FILE ps

echo ""
echo -e "${CYAN}访问地址:${NC}"

# 根据是否启用 HTTPS 显示不同协议
if [ "$ENABLE_HTTPS" = "true" ]; then
    PROTOCOL="https"
    echo -e "${GREEN}✓ HTTPS 已启用${NC}"
else
    PROTOCOL="http"
    echo -e "${YELLOW}⚠️ 仅 HTTP 模式${NC}"
fi

echo "  前端:     ${PROTOCOL}://${DOMAIN_NAME}"
echo "  管理后台: ${PROTOCOL}://${ADMIN_DOMAIN}"
echo "  网站:     ${PROTOCOL}://${DOMAIN_NAME}:5180"
echo "  API:      ${PROTOCOL}://${DOMAIN_NAME}:7890"
echo ""

echo -e "${CYAN}常用命令:${NC}"
echo "  查看日志: docker compose -f scripts/deploy/$COMPOSE_FILE logs -f"
echo "  停止服务: docker compose -f scripts/deploy/$COMPOSE_FILE stop"
echo "  重启服务: docker compose -f scripts/deploy/$COMPOSE_FILE restart"
echo "  删除服务: docker compose -f scripts/deploy/$COMPOSE_FILE down"
echo ""

if [ "$USE_RDS" = false ]; then
    # 保存密码到安全文件
    CREDENTIALS_DIR="./scripts/deploy/credentials"
    mkdir -p "$CREDENTIALS_DIR"
    CREDENTIALS_FILE="$CREDENTIALS_DIR/$(date +%Y%m%d_%H%M%S).txt"

    cat > "$CREDENTIALS_FILE" << EOF
# 企智通 QZT - 部署凭据
# 生成时间: $(date)
# 请妥善保管此文件，建议部署完成后删除或移动到安全位置

MySQL root 密码: $MYSQL_ROOT_PASSWORD
MySQL 用户密码: $DB_PASSWORD
Redis 密码: $REDIS_PASSWORD
EOF

    chmod 600 "$CREDENTIALS_FILE"

    echo -e "${YELLOW}重要信息（请妥善保管）:${NC}"
    echo "  凭据已保存到: $CREDENTIALS_FILE"
    echo "  查看命令: cat $CREDENTIALS_FILE"
    echo ""
fi

echo -e "${YELLOW}提示: 首次部署需要运行数据库迁移${NC}"
echo "  docker compose -f scripts/deploy/$COMPOSE_FILE exec backend npx prisma db push"
echo ""
