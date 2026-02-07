#!/bin/bash
# ============================================================
# 企账通 (QZT) 一键部署脚本
# ============================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="qzt"
DOCKER_COMPOSE_FILE="docker/docker-compose.prod.yml"
ENV_FILE=".env.prod"

# ============================================================
# 工具函数
# ============================================================

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================
# 依赖检查
# ============================================================

check_dependencies() {
    print_header "检查系统依赖"

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        print_info "请访问 https://docs.docker.com/get-docker/ 安装 Docker"
        exit 1
    fi
    print_success "Docker 已安装: $(docker --version)"

    # 检查 Docker Compose
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装"
        print_info "请升级 Docker 到包含 Compose 的版本"
        exit 1
    fi
    print_success "Docker Compose 已安装: $(docker compose version)"

    # 检查 Docker 是否运行
    if ! docker info &> /dev/null; then
        print_error "Docker 守护进程未运行"
        print_info "请启动 Docker Desktop 或 Docker 服务"
        exit 1
    fi
    print_success "Docker 守护进程运行中"
}

# ============================================================
# 环境变量生成
# ============================================================

generate_env_file() {
    print_header "生成环境配置"

    if [ -f "$ENV_FILE" ]; then
        print_warning "$ENV_FILE 已存在"
        read -p "是否重新生成? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "使用现有配置文件"
            return
        fi
        rm "$ENV_FILE"
    fi

    # 生成随机密码
    MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-25)
    MYSQL_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '=+/')

    # 创建 .env.prod 文件
    cat > "$ENV_FILE" << EOF
# ============================================================
# 企账通生产环境配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================================

# MySQL 数据库配置
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=qzt_prod
MYSQL_USER=qzt_user
MYSQL_PASSWORD=${MYSQL_PASSWORD}

# Redis 配置
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT 配置
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# 前端 API 地址
VITE_API_BASE_URL=/api

# OSS 配置（可选）
OSS_REGION=
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=

# 时区
TZ=Asia/Shanghai
EOF

    # 设置权限
    chmod 600 "$ENV_FILE"

    print_success "环境配置已生成: $ENV_FILE"
    print_warning "请妥善保管数据库密码！"
}

# ============================================================
# 构建镜像
# ============================================================

build_images() {
    print_header "构建 Docker 镜像"

    # 加载环境变量
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    fi

    # 使用 docker compose 构建
    docker compose -f "$DOCKER_COMPOSE_FILE" build --no-cache

    print_success "镜像构建完成"
}

# ============================================================
# 启动服务
# ============================================================

start_services() {
    print_header "启动服务"

    # 加载环境变量
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    fi

    # 停止现有服务（如果有）
    docker compose -f "$DOCKER_COMPOSE_FILE" down 2>/dev/null || true

    # 启动服务
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d

    print_success "服务启动成功"
}

# ============================================================
# 等待服务就绪
# ============================================================

wait_for_services() {
    print_header "等待服务就绪"

    local max_attempts=60
    local attempt=0

    print_info "等待 MySQL 启动..."
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f "$DOCKER_COMPOSE_FILE" exec -T mysql mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" &> /dev/null; then
            print_success "MySQL 已就绪"
            break
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    echo

    if [ $attempt -eq $max_attempts ]; then
        print_error "MySQL 启动超时"
        return 1
    fi

    print_info "等待后端服务启动..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:7890/health &> /dev/null; then
            print_success "后端服务已就绪"
            break
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    echo

    if [ $attempt -eq $max_attempts ]; then
        print_error "后端服务启动超时"
        return 1
    fi

    print_info "等待前端服务启动..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost/health &> /dev/null; then
            print_success "前端服务已就绪"
            break
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    echo

    if [ $attempt -eq $max_attempts ]; then
        print_error "前端服务启动超时"
        return 1
    fi

    return 0
}

# ============================================================
# 运行数据库迁移
# ============================================================

run_migrations() {
    print_header "运行数据库迁移"

    # 加载环境变量
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    fi

    # 在后端容器中运行迁移
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T backend \
        pnpm prisma migrate deploy

    print_success "数据库迁移完成"
}

# ============================================================
# 显示访问信息
# ============================================================

show_access_info() {
    print_header "部署完成"

    echo -e "${GREEN}企账通已成功部署！${NC}\n"

    echo "服务访问地址:"
    echo "  - 前端页面: ${BLUE}http://localhost${NC}"
    echo "  - 后端 API:  ${BLUE}http://localhost:7890${NC}"
    echo "  - API 文档:  ${BLUE}http://localhost:7890/api-docs${NC}"
    echo ""
    echo "默认管理员账号:"
    echo "  - 用户名: ${YELLOW}admin${NC}"
    echo "  - 密码:   ${YELLOW}admin123${NC} (首次登录后请修改)"
    echo ""
    echo "管理命令:"
    echo "  - 查看日志: docker compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "  - 停止服务: docker compose -f $DOCKER_COMPOSE_FILE down"
    echo "  - 重启服务: docker compose -f $DOCKER_COMPOSE_FILE restart"
    echo ""
    echo -e "${YELLOW}重要提示:${NC}"
    echo "  1. 生产环境请立即修改默认密码"
    echo "  2. 数据库密码保存在 $ENV_FILE 中"
    echo "  3. 定期备份数据库: docker compose -f $DOCKER_COMPOSE_FILE exec mysql mysqldump -u root -p'${MYSQL_ROOT_PASSWORD}' qzt_prod > backup.sql"
    echo ""
}

# ============================================================
# 主流程
# ============================================================

main() {
    print_header "企账通 (QZT) 生产环境部署"

    # 解析命令行参数
    SKIP_BUILD=false
    SKIP_MIGRATE=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-migrate)
                SKIP_MIGRATE=true
                shift
                ;;
            --help)
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --skip-build    跳过镜像构建（使用现有镜像）"
                echo "  --skip-migrate  跳过数据库迁移"
                echo "  --help          显示此帮助信息"
                exit 0
                ;;
            *)
                print_error "未知选项: $1"
                echo "使用 --help 查看帮助信息"
                exit 1
                ;;
        esac
    done

    # 检查依赖
    check_dependencies

    # 生成环境配置
    generate_env_file

    # 构建镜像
    if [ "$SKIP_BUILD" = false ]; then
        build_images
    else
        print_info "跳过镜像构建"
    fi

    # 启动服务
    start_services

    # 等待服务就绪
    wait_for_services

    # 运行迁移
    if [ "$SKIP_MIGRATE" = false ]; then
        run_migrations
    else
        print_info "跳过数据库迁移"
    fi

    # 显示访问信息
    show_access_info
}

# 执行主流程
main "$@"
