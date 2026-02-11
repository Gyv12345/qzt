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
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   企智通 QZT - Docker 部署${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ============================================
# 检查 Docker 和 Docker Compose
# ============================================
echo -e "${YELLOW}检查环境...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker 未安装${NC}"
    echo -e "${YELLOW}请先安装 Docker: https://docs.docker.com/engine/install/${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ Docker Compose 未安装${NC}"
    echo -e "${YELLOW}请先安装 Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker $(docker --version | awk '{print $3}')${NC}"
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
# 询问数据库配置
# ============================================
echo -e "${YELLOW}数据库配置${NC}"
echo ""
echo "请选择数据库配置方式："
echo "  1) 使用阿里云 RDS MySQL（推荐）"
echo "  2) 使用本地 MySQL 容器"
echo ""
read -p "请选择 (1-2): " DB_CHOICE

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

# 生成 Redis 密码
REDIS_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "redis_$(date +%s)")

# 生成 JWT 密钥
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "jwt_$(date +%s)_secret")

# 域名配置
echo ""
read -p "前端域名 [localhost]: " DOMAIN_NAME
DOMAIN_NAME=${DOMAIN_NAME:-localhost}

read -p "管理后台域名 [admin.localhost]: " ADMIN_DOMAIN
ADMIN_DOMAIN=${ADMIN_DOMAIN:-admin.localhost}

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

docker compose -f "$COMPOSE_FILE" build

echo -e "${GREEN}✓ 镜像构建完成${NC}"

# ============================================
# 启动服务
# ============================================
echo ""
echo -e "${YELLOW}启动服务...${NC}"

docker compose -f "$COMPOSE_FILE" up -d

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
    if docker compose -f "$COMPOSE_FILE" exec -T backend curl -sf http://localhost:7890/api/health > /dev/null 2>&1; then
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
    if docker compose -f "$COMPOSE_FILE" exec -T frontend wget -q -O /dev/null http://localhost/health 2>/dev/null; then
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
    if docker compose -f "$COMPOSE_FILE" exec -T website curl -sf http://localhost:5180/health > /dev/null 2>&1; then
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

docker compose -f "$COMPOSE_FILE" ps

echo ""
echo -e "${CYAN}访问地址:${NC}"
echo "  前端:     http://${DOMAIN_NAME}"
echo "  管理后台: http://${ADMIN_DOMAIN}"
echo "  网站:     http://${DOMAIN_NAME}:5180"
echo "  API:      http://${DOMAIN_NAME}:7890"
echo ""

echo -e "${CYAN}常用命令:${NC}"
echo "  查看日志: docker compose -f $COMPOSE_FILE logs -f"
echo "  停止服务: docker compose -f $COMPOSE_FILE stop"
echo "  重启服务: docker compose -f $COMPOSE_FILE restart"
echo "  删除服务: docker compose -f $COMPOSE_FILE down"
echo ""

if [ "$USE_RDS" = false ]; then
    echo -e "${YELLOW}重要信息（请妥善保管）:${NC}"
    echo "  MySQL root 密码: $MYSQL_ROOT_PASSWORD"
    echo "  MySQL 用户密码: $DB_PASSWORD"
    echo "  Redis 密码: $REDIS_PASSWORD"
    echo ""
fi

echo -e "${YELLOW}提示: 首次部署需要运行数据库迁移${NC}"
echo "  docker compose -f $COMPOSE_FILE exec backend npx prisma db push"
echo ""
