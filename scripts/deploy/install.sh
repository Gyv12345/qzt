#!/bin/bash
# ============================================================
# 企智通 QZT - 一键部署脚本
# ============================================================
# 功能：
# - init: 初始化服务器（安装 Git，下载项目）
# - check: 环境检查
# - docker: Docker 部署
# - bare-metal: 裸机部署
# - ssl: SSL 证书配置
# - deploy: 服务更新部署
#
# 使用方法：
#   bash install.sh <子命令> [选项]
#
# 从空服务器一键安装：
#   bash <(curl -fsSL https://raw.githubusercontent.com/Gyv12345/qzt/main/scripts/deploy/install.sh) init
# ============================================================

set -euo pipefail

# ============================================
# 颜色定义
# ============================================
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly BLUE='\033[0;34m'
readonly GRAY='\033[0;90m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# ============================================
# 全局变量
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
QZT_DIR="/opt/qzt/qzt"
DEPLOY_DIR="/opt/qzt-deploy"
BACKUP_DIR="/opt/qzt-backup"
LOG_FILE="${LOG_FILE:-/var/log/qzt-deploy.log}"

# ============================================
# 输出函数
# ============================================
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_info() { echo -e "${CYAN}[i]${NC} $1"; }
print_verbose() { [[ "${VERBOSE:-false}" == true ]] && echo -e "${GRAY}[DEBUG]${NC} $1"; }

# 带解决方案的错误消息
print_error_with_solution() {
    local error="$1"
    local solution="$2"
    echo -e "${RED}[✗] ${NC}${error}"
    echo -e "${GRAY}    解决方案: ${solution}${NC}"
}

# 显示列表项
print_list_item() {
    local indent="${3:-  }"
    echo -e "${indent}${1}${2}"
}

# 显示分隔线
print_separator() {
    local char="${1:-=}"
    local width="${2:-40}"
    printf "${CYAN}%*s${NC}\n" "$width" | tr ' ' "$char"
}

# ============================================
# 交互函数
# ============================================
# 确认提示
confirm() {
    local prompt="$1"
    local default="${2:-n}"

    if [ "$default" = "y" ]; then
        prompt="$prompt [Y/n]: "
    else
        prompt="$prompt [y/N]: "
    fi

    read -p "$prompt" response
    response=${response:-$default}

    [[ "$response" =~ ^[Yy]$ ]]
}

# 密码输入（隐藏显示）
read_password() {
    local prompt="$1"
    local password_var="$2"

    echo -n "$prompt"
    read -s "$password_var"
    echo
}

# 选择菜单
show_menu() {
    local title="$1"
    shift
    local options=("$@")

    echo -e "${CYAN}$title${NC}"
    echo ""

    local i=1
    for opt in "${options[@]}"; do
        echo "  $i) $opt"
        ((i++))
    done
    echo ""

    local min=1
    local max=$((i - 1))

    while true; do
        read -p "请选择 ($min-$max): " choice
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge "$min" ] && [ "$choice" -le "$max" ]; then
            return "$choice"
        fi
        print_error "无效选择，请输入 $min 到 $max 之间的数字"
    done
}

# ============================================
# 验证函数
# ============================================
# 验证域名格式
validate_domain() {
    local domain="$1"
    [[ "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]
}

# 验证端口号
validate_port() {
    local port="$1"
    [[ "$port" =~ ^[0-9]+$ ]] && [ "$port" -ge 1 ] && [ "$port" -le 65535 ]
}

# 验证 IP 地址
validate_ip() {
    local ip="$1"
    [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

# ============================================
# 系统检测
# ============================================
# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -f /etc/redhat-release ]; then
        echo "centos"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    else
        echo "unknown"
    fi
}

# 检测包管理器
detect_package_manager() {
    local os=$(detect_os)

    case "$os" in
        ubuntu|debian)
            echo "apt"
            ;;
        centos|rhel|almalinux|rocky|alinux)
            echo "yum"
            ;;
        fedora)
            echo "dnf"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# 检测系统架构
detect_arch() {
    local arch=$(uname -m)
    case "$arch" in
        x86_64|amd64) echo "x64" ;;
        aarch64|arm64) echo "arm64" ;;
        armv7l) echo "armv7" ;;
        *) echo "unknown" ;;
    esac
}

# ============================================
# 端口检查
# ============================================
# 检查端口是否被占用
is_port_in_use() {
    local port="$1"

    if command -v ss &> /dev/null; then
        ss -tlnp 2>/dev/null | grep -q ":$port "
    elif command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep -q ":$port "
    else
        return 1
    fi
}

# 获取占用端口的进程
get_port_process() {
    local port="$1"

    if command -v ss &> /dev/null; then
        ss -tlnp 2>/dev/null | grep ":$port " | head -1 | awk '{print $6}'
    elif command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep ":$port " | head -1 | awk '{print $7}'
    fi
}

# ============================================
# 日志函数
# ============================================
# 写入日志
log_message() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

log_info() { log_message "INFO" "$@"; }
log_error() { log_message "ERROR" "$@"; }
log_warning() { log_message "WARN" "$@"; }

# ============================================
# 子命令帮助信息
# ============================================
show_help() {
    cat << EOF
${CYAN}企智通 QZT - 一键部署脚本${NC}

${YELLOW}用法:${NC}
    bash install.sh <子命令> [选项]

${YELLOW}子命令:${NC}
    ${BOLD}init${NC}         初始化服务器（安装 Git，下载项目）
    ${BOLD}check${NC}        环境预检查
    ${BOLD}docker${NC}       Docker 部署
    ${BOLD}bare-metal${NC}   裸机部署
    ${BOLD}ssl${NC}         SSL 证书配置
    ${BOLD}deploy${NC}       服务更新部署（由 GitHub Actions 调用）

${YELLOW}从空服务器一键安装:${NC}
    bash <(curl -fsSL https://raw.githubusercontent.com/Gyv12345/qzt/main/scripts/deploy/install.sh) init

${YELLOW}选项 (全局):${NC}
    -h, --help       显示此帮助信息
    -v, --verbose    详细输出模式

${YELLOW}支持的系统:${NC}
    Ubuntu 20.04+, Debian 11+, CentOS 7+, RHEL 8+, Fedora 35+, Alibaba Cloud Linux

${YELLOW}示例:${NC}
    # 初始化服务器
    bash install.sh init

    # 环境检查
    bash install.sh check

    # Docker 部署
    bash install.sh docker

    # 使用 RDS 的 Docker 部署
    bash install.sh docker --use-rds

    # 裸机部署
    bash install.sh bare-metal

    # 配置 SSL
    bash install.sh ssl

${YELLOW}更多信息:${NC}
    https://github.com/Gyv12345/qzt

EOF
}

# ============================================
# 子命令: init - 初始化服务器
# ============================================
cmd_init() {
    local skip_git=false
    local skip_download=false
    local auto_yes=false

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -y|--yes)
                auto_yes=true
                shift
                ;;
            --skip-git)
                skip_git=true
                shift
                ;;
            --skip-download)
                skip_download=true
                shift
                ;;
            *)
                print_error "未知选项: $1"
                print_info "使用 'install.sh init --help' 查看帮助"
                exit 1
                ;;
        esac
    done

    # 检查 root
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 用户或 sudo 运行"
        echo "运行命令: sudo bash $0 init"
        exit 1
    fi

    print_header "企智通 QZT - 服务器初始化"

    # 检测系统
    OS=$(detect_os)
    print_success "检测到系统: $OS"

    # 包管理器选择
    if [[ "$OS" =~ ^(ubuntu|debian)$ ]]; then
        PKG_MANAGER="apt"
        UPDATE_CMD="apt-get update -y"
        INSTALL_CMD="apt-get install -y"
    elif [[ "$OS" =~ ^(centos|rhel|almalinux|rocky|alinux)$ ]]; then
        PKG_MANAGER="yum"
        UPDATE_CMD="yum update -y"
        INSTALL_CMD="yum install -y"
    elif [ "$OS" = "fedora" ]; then
        PKG_MANAGER="dnf"
        UPDATE_CMD="dnf update -y"
        INSTALL_CMD="dnf install -y"
    else
        print_error "不支持的系统: $OS"
        exit 1
    fi

    # 安装 Git
    print_header "1/2 安装 Git"

    if [ "$skip_git" = true ]; then
        print_info "跳过 Git 安装 (--skip-git)"
    elif command -v git &> /dev/null; then
        print_success "Git 已安装: $(git --version)"
    else
        print_info "正在安装 Git..."
        $UPDATE_CMD > /dev/null 2>&1
        $INSTALL_CMD git > /dev/null 2>&1
        print_success "Git 安装完成: $(git --version)"
    fi

    # 下载项目
    print_header "2/2 下载项目"

    mkdir -p /opt/qzt
    cd /opt/qzt

    if [ "$skip_download" = true ]; then
        print_info "跳过项目下载 (--skip-download)"
        if [ -d "$QZT_DIR" ]; then
            cd "$QZT_DIR"
        else
            print_error "项目目录不存在，不能跳过下载"
            exit 1
        fi
    elif [ -d "$QZT_DIR" ]; then
        print_warning "项目目录已存在: $QZT_DIR"
        echo ""
        echo "  1) 更新项目 (git pull)"
        echo "  2) 删除并重新下载"
        echo "  3) 使用现有项目（不更新）"
        echo ""

        if [ "$auto_yes" = true ]; then
            RE_DOWNLOAD=1
            print_info "自动选择: 更新项目"
        else
            read -p "请选择 [1/2/3, 默认: 1]: " RE_DOWNLOAD
            RE_DOWNLOAD=${RE_DOWNLOAD:-1}
        fi

        case "$RE_DOWNLOAD" in
            1)
                print_info "正在更新项目..."
                cd "$QZT_DIR"
                git pull origin main 2>/dev/null || {
                    print_warning "Git pull 失败，尝试使用 fetch + reset"
                    git fetch origin
                    git reset --hard origin/main
                }
                print_success "项目已更新"
                ;;
            2)
                print_info "删除并重新下载..."
                rm -rf "$QZT_DIR"
                ;;
            *)
                print_info "使用现有项目（不更新）"
                ;;
        esac
    fi

    if [ ! -d "$QZT_DIR" ]; then
        print_info "正在下载项目..."
        print_info "源: https://github.com/Gyv12345/qzt.git"
        git clone https://github.com/Gyv12345/qzt.git --progress || {
            print_error "Git clone 失败"
            print_info "解决方案: 检查网络连接或 GitHub 访问"
            exit 1
        }
        print_success "项目已下载到: $QZT_DIR"
    fi

    cd "$QZT_DIR"

    # 选择部署方式
    print_header "部署方式选择"

    echo "请选择部署方式："
    echo ""
    echo "  1) 裸机部署"
    echo "     - 安装: Node.js, pnpm, PM2, Nginx, Redis"
    echo "     - 适合: 有独立服务器，需要直接运行服务"
    echo ""
    echo "  2) Docker 部署 (推荐)"
    echo "     - 安装: Docker, Docker Compose"
    echo "     - 适合: 快速部署，环境隔离，易于维护"
    echo ""

    if [ "$auto_yes" = true ]; then
        DEPLOY_MODE=2
        print_info "自动选择: Docker 部署"
    else
        read -p "请选择 (1/2, 默认: 2): " DEPLOY_MODE
        DEPLOY_MODE=${DEPLOY_MODE:-2}
    fi

    case "$DEPLOY_MODE" in
        1)
            echo ""
            print_info "即将执行裸机部署..."
            echo ""
            if [ "$auto_yes" = false ]; then
                read -p "按 Enter 键继续，或 Ctrl+C 取消..."
            fi
            bash "$0" bare-metal
            ;;
        2)
            echo ""
            print_info "即将执行 Docker 部署..."
            echo ""
            if [ "$auto_yes" = false ]; then
                read -p "按 Enter 键继续，或 Ctrl+C 取消..."
            fi
            bash "$0" docker
            ;;
        *)
            print_error "无效选择: $DEPLOY_MODE"
            echo ""
            echo "稍后手动部署，请运行："
            echo "  cd $QZT_DIR"
            echo "  bash scripts/deploy/install.sh bare-metal  # 裸机部署"
            echo "  bash scripts/deploy/install.sh docker      # Docker 部署"
            exit 1
            ;;
    esac
}

# ============================================
# 子命令: check - 环境检查
# ============================================
cmd_check() {
    local dry_run=false
    local verbose=false
    local checks_passed=0
    local checks_failed=0
    local checks_warning=0

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dry-run)
                dry_run=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            *)
                print_error "未知选项: $1"
                print_info "使用 'install.sh check --help' 查看帮助"
                exit 1
                ;;
        esac
    done

    print_header "企智通 QZT - 环境预检查"

    if [ "$dry_run" = true ]; then
        print_info "预览模式: 不会执行任何修改操作"
        echo ""
    fi

    # 需要检查的端口
    REQUIRED_PORTS=(
        "80:HTTP"
        "443:HTTPS"
        "7890:Backend API"
        "5180:Website"
    )

    # 1. 系统检查
    print_header "系统检查 (1/7)"

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        print_success "操作系统: $PRETTY_NAME"

        if [[ "$OS" =~ ^(ubuntu|debian|centos|rhel|almalinux|rocky|fedora|alinux)$ ]]; then
            print_success "系统支持: 是"
            ((checks_passed++))
        else
            print_warning "系统支持: 未知 ($OS)，可能不完全兼容"
            ((checks_warning++))
        fi
    else
        print_error "无法识别操作系统"
        ((checks_failed++))
    fi

    # 2. 架构检查
    print_header "架构检查 (2/7)"

    ARCH=$(uname -m)
    print_info "CPU 架构: $ARCH"

    case "$ARCH" in
        x86_64|amd64)
            print_success "架构支持: x86_64"
            ((checks_passed++))
            ;;
        aarch64|arm64)
            print_success "架构支持: ARM64"
            ((checks_passed++))
            ;;
        armv7l)
            print_warning "架构支持: ARM v7 (32位)，性能可能受限"
            ((checks_warning++))
            ;;
        *)
            print_error "架构不支持: $ARCH"
            ((checks_failed++))
            ;;
    esac

    # 3. 内存检查
    print_header "内存检查 (3/7)"

    if command -v free &> /dev/null; then
        TOTAL_MEM_MB=$(free -m | awk '/Mem:/ {print $2}')
        AVAILABLE_MEM_MB=$(free -m | awk '/Mem:/ {print $7}')
    else
        print_warning "无法检测内存"
        ((checks_warning++))
    fi

    print_info "总内存: ${TOTAL_MEM_MB} MB"
    print_info "可用内存: ${AVAILABLE_MEM_MB} MB"

    if [ "$TOTAL_MEM_MB" -lt 1024 ]; then
        print_error "内存不足 (最少需要 1GB，当前 ${TOTAL_MEM_MB}MB)"
        print_info "建议: 升级服务器配置或使用外部 RDS/Redis"
        ((checks_failed++))
    elif [ "$TOTAL_MEM_MB" -lt 2048 ]; then
        print_warning "内存较小 (建议 2GB 以上)"
        print_info "将使用 2C2G 资源分配方案"
        ((checks_passed++))
    else
        print_success "内存充足"
        ((checks_passed++))
    fi

    # 4. 磁盘空间检查
    print_header "磁盘空间检查 (4/7)"

    MIN_DISK_MB=500
    CHECK_PATHS=("/" "/opt" "/var" "/tmp")

    for path in "${CHECK_PATHS[@]}"; do
        if [ ! -d "$path" ]; then
            continue
        fi

        AVAILABLE_MB=$(df -m "$path" 2>/dev/null | tail -1 | awk '{print $4}')
        USED_PERCENT=$(df "$path" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')

        if [ -z "$AVAILABLE_MB" ]; then
            continue
        fi

        print_info "$path: 可用 ${AVAILABLE_MB} MB (使用 ${USED_PERCENT}%)"

        if [ "$AVAILABLE_MB" -lt "$MIN_DISK_MB" ]; then
            print_error "磁盘空间不足 ($path 需要至少 ${MIN_DISK_MB}MB)"
            print_info "建议: 清理旧文件或扩容磁盘"
            ((checks_failed++))
        elif [ "$AVAILABLE_MB" -lt $((MIN_DISK_MB * 2)) ]; then
            print_warning "磁盘空间紧张 ($path)"
            ((checks_warning++))
        else
            print_success "磁盘空间充足 ($path)"
            ((checks_passed++))
        fi
    done

    # 5. 端口检查
    print_header "端口检查 (5/7)"

    for port_info in "${REQUIRED_PORTS[@]}"; do
        PORT=${port_info%%:*}
        SERVICE=${port_info##*:}

        if command -v ss &> /dev/null; then
            OCCUPIED=$(ss -tlnp 2>/dev/null | grep -c ":$PORT " || true)
        elif command -v netstat &> /dev/null; then
            OCCUPIED=$(netstat -tlnp 2>/dev/null | grep -c ":$PORT " || true)
        else
            print_warning "无法检查端口 $PORT (缺少 ss/netstat)"
            ((checks_warning++))
            continue
        fi

        if [ "$OCCUPIED" -gt 0 ]; then
            print_warning "端口 $PORT ($SERVICE) 已被占用"
            print_info "占用进程: $(get_port_process "$PORT" || echo '未知')"
            ((checks_warning++))
        else
            print_success "端口 $PORT ($SERVICE) 可用"
            ((checks_passed++))
        fi
    done

    # 6. 网络检查
    print_header "网络检查 (6/7)"

    TEST_HOSTS=(
        "aliyun.com:阿里云镜像"
        "github.com:GitHub"
        "npmjs.org:NPM registry"
    )

    for host_info in "${TEST_HOSTS[@]}"; do
        HOST=${host_info%%:*}
        DESC=${host_info##*:}

        if timeout 5 curl -sI "https://$HOST" >/dev/null 2>&1; then
            print_success "$DESC 可访问"
            ((checks_passed++))
        else
            print_warning "$DESC 不可访问 (可能需要配置代理)"
            ((checks_warning++))
        fi
    done

    # 检查 DNS 解析
    print_info "检查 DNS 解析..."

    if command -v nslookup &> /dev/null; then
        if nslookup github.com >/dev/null 2>&1; then
            print_success "DNS 解析正常"
            ((checks_passed++))
        else
            print_error "DNS 解析失败"
            print_info "解决方案: 检查 /etc/resolv.conf 或尝试 8.8.8.8"
            ((checks_failed++))
        fi
    fi

    # 7. 依赖检查
    print_header "依赖检查 (7/7)"

    DEPS=(
        "bash:Bash shell:必需"
        "curl:HTTP 客户端:必需"
        "tar:压缩工具:必需"
        "mkdir:目录创建:必需"
        "grep:文本搜索:必需"
        "sed:文本处理:必需"
        "awk:文本处理:必需"
    )

    OPTIONAL_DEPS=(
        "docker:容器运行时:可选"
        "docker-compose:容器编排:可选"
        "node:Node.js 运行时:可选"
        "npm:Node.js 包管理器:可选"
        "pnpm:快速包管理器:可选"
        "pm2:进程管理器:可选"
        "git:版本控制:可选"
        "nginx:Web 服务器:可选"
        "redis-server:Redis 服务:可选"
    )

    print_info "${CYAN}必需依赖:${NC}"
    for dep_info in "${DEPS[@]}"; do
        CMD=${dep_info%%:*}
        DESC=$(echo "$dep_info" | cut -d':' -f2)
        REQUIRED=$(echo "$dep_info" | cut -d':' -f3)

        if command -v "$CMD" &> /dev/null; then
            VERSION=$($CMD --version 2>&1 | head -1 || echo "已安装")
            print_success "$DESC ($CMD): $VERSION"
            ((checks_passed++))
        else
            if [ "$REQUIRED" = "必需" ]; then
                print_error "$DESC ($CMD): 未安装"
                ((checks_failed++))
            fi
        fi
    done

    echo ""
    print_info "${CYAN}可选依赖:${NC}"
    for dep_info in "${OPTIONAL_DEPS[@]}"; do
        CMD=${dep_info%%:*}
        DESC=$(echo "$dep_info" | cut -d':' -f2)

        if command -v "$CMD" &> /dev/null; then
            VERSION=$($CMD --version 2>&1 | head -1 || echo "已安装")
            print_success "$DESC: $VERSION"
            ((checks_passed++))
        else
            [ "$verbose" = true ] && print_verbose "$DESC ($CMD): 未安装"
        fi
    done

    # 显示总结
    print_header "检查总结"

    echo -e "${CYAN}检查结果:${NC}"
    echo -e "  ${GREEN}通过${NC}: $checks_passed"
    echo -e "  ${YELLOW}警告${NC}: $checks_warning"
    echo -e "  ${RED}失败${NC}: $checks_failed"
    echo ""

    if [ $checks_failed -gt 0 ]; then
        echo -e "${RED}✗ 环境检查失败，请解决上述问题后再部署${NC}"
        exit 1
    elif [ $checks_warning -gt 0 ]; then
        echo -e "${YELLOW}! 环境检查通过，但有一些警告${NC}"
        exit 2
    else
        echo -e "${GREEN}✓ 环境检查全部通过，可以开始部署${NC}"
        exit 0
    fi
}

# ============================================
# 子命令: docker - Docker 部署
# ============================================
cmd_docker() {
    local dry_run=false
    local auto_yes=false
    local force_rds=""
    local skip_config=false

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dry-run)
                dry_run=true
                shift
                ;;
            -y|--yes)
                auto_yes=true
                shift
                ;;
            --use-rds)
                force_rds=true
                shift
                ;;
            --no-rds)
                force_rds=false
                shift
                ;;
            *)
                print_error "未知选项: $1"
                print_info "使用 'install.sh docker --help' 查看帮助"
                exit 1
                ;;
        esac
    done

    if [ "$dry_run" = true ]; then
        echo -e "${YELLOW}预览模式: 不会实际执行部署${NC}"
        echo ""
    fi

    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   企智通 QZT - Docker 部署${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""

    # 检查并安装 Docker
    echo -e "${YELLOW}检查 Docker 环境...${NC}"

    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker 未安装，开始安装...${NC}"

        # 检测系统
        OS=$(detect_os)

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
            print_error "不支持的系统: $OS"
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

        print_success "Docker 安装完成"
    else
        print_success "Docker $(docker --version | awk '{print $3}')"
    fi

    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose 插件未安装"
        exit 1
    fi

    print_success "Docker Compose $(docker compose version --short)"
    echo ""

    # 检测服务器配置
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

    # 根据配置分配资源
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

    print_success "检测配置: ${TIER}"
    echo -e "${CYAN}资源分配方案:${NC}"
    echo "  后端:    ${BACKEND_CPU} CPU, ${BACKEND_MEM} 内存"
    echo "  前端:    ${FRONTEND_CPU} CPU, ${FRONTEND_MEM} 内存"
    echo "  网站:    ${WEBSITE_CPU} CPU, ${WEBSITE_MEM} 内存"
    echo "  Redis:   ${REDIS_CPU} CPU, ${REDIS_MEM} 内存"
    echo "  MySQL:   ${MYSQL_CPU} CPU, ${MYSQL_MEM} 内存"
    echo ""

    # 检查是否已有 .env 文件
    if [ -f "$SCRIPT_DIR/.env" ]; then
        echo -e "${YELLOW}检测到已存在 .env 配置文件${NC}"
        read -p "是否使用现有配置跳过询问? [Y/n]: " USE_EXISTING
        USE_EXISTING=${USE_EXISTING:-Y}

        if [[ "$USE_EXISTING" =~ ^[Yy]$ ]]; then
            print_info "使用现有配置..."
            source "$SCRIPT_DIR/.env"
            if [ -n "${RDS_HOST:-}" ]; then
                USE_RDS=true
            else
                USE_RDS=false
            fi
            skip_config=true
        fi
    fi

    # 询问数据库配置
    if [ "$skip_config" != "true" ]; then
        echo ""
        echo -e "${YELLOW}数据库配置${NC}"
        echo ""
        echo "请选择数据库配置方式："
        echo "  1) 使用阿里云 RDS MySQL（推荐）"
        echo "  2) 使用本地 MySQL 容器"
        echo ""
        read -p "请选择 (1-2): " DB_CHOICE
    fi

    if [ "${DB_CHOICE:-1}" = "1" ] || [ "$force_rds" = "true" ]; then
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
    else
        # 使用本地 MySQL
        USE_RDS=false

        # 生成随机密码
        MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "root_$(date +%s)")
        DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "db_$(date +%s)")

        echo ""
        echo -e "${CYAN}将使用本地 MySQL 容器${NC}"
        echo -e "${YELLOW}已生成随机密码，请妥善保管${NC}"
    fi

    # 生成其他配置
    # 生成 Redis 密码
    REDIS_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "redis_$(date +%s)")

    # 生成 JWT 密钥
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "jwt_$(date +%s)_secret")

    # 域名配置
    if [ "$skip_config" != "true" ]; then
        echo ""
        read -p "前端域名 [localhost]: " DOMAIN_NAME
        DOMAIN_NAME=${DOMAIN_NAME:-localhost}

        read -p "管理后台域名 [admin.localhost]: " ADMIN_DOMAIN
        ADMIN_DOMAIN=${ADMIN_DOMAIN:-admin.localhost}
    fi

    # 调用 SSL 配置
    cmd_ssl "docker" "$DOMAIN_NAME" "$ADMIN_DOMAIN"

    # 生成 .env 文件
    echo ""
    echo -e "${YELLOW}生成配置文件...${NC}"

    if [ "$USE_RDS" = true ]; then
        cat > "$SCRIPT_DIR/.env" << EOF
# RDS 数据库配置
RDS_HOST=$RDS_HOST
RDS_PORT=$RDS_PORT
RDS_USERNAME=$RDS_USERNAME
RDS_PASSWORD=$RDS_PASSWORD
RDS_DATABASE=$RDS_DATABASE
USE_RDS=true

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
        cat > "$SCRIPT_DIR/.env" << EOF
# MySQL 配置
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
DB_PASSWORD=$DB_PASSWORD
USE_RDS=false

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

    print_success "配置文件已生成: .env"

    # 确定使用的 compose 文件
    if [ "$USE_RDS" = true ]; then
        COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
        COMPOSE_PROFILE=""
    else
        COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
        COMPOSE_PROFILE="--profile local-db"
    fi

    # 构建镜像
    echo ""
    echo -e "${YELLOW}构建 Docker 镜像...${NC}"
    echo -e "${CYAN}这可能需要几分钟...${NC}"

    cd "$PROJECT_DIR"

    docker compose -f "$COMPOSE_FILE" build

    print_success "镜像构建完成"

    # 启动服务
    echo ""
    echo -e "${YELLOW}启动服务...${NC}"

    docker compose -f "$COMPOSE_FILE" $COMPOSE_PROFILE up -d

    print_success "服务已启动"

    # 等待服务就绪
    echo ""
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 10

    # 等待后端服务
    echo -n "  后端服务: "
    for i in {1..30}; do
        if docker compose -f "$COMPOSE_FILE" $COMPOSE_PROFILE exec -T backend curl -sf http://localhost:7890/api/health > /dev/null 2>&1; then
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
        if docker compose -f "$COMPOSE_FILE" $COMPOSE_PROFILE exec -T frontend wget -q -O /dev/null http://localhost/health 2>/dev/null; then
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
        if docker compose -f "$COMPOSE_FILE" $COMPOSE_PROFILE exec -T website curl -sf http://localhost:5180/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 就绪${NC}"
            break
        fi
        if [ $i -eq 15 ]; then
            echo -e "${YELLOW}⚠ 启动中（请稍后检查）${NC}"
        fi
        sleep 2
    done

    # 显示服务状态
    echo ""
    print_header "✓ 部署完成"

    docker compose -f "$COMPOSE_FILE" $COMPOSE_PROFILE ps

    echo ""
    echo -e "${CYAN}访问地址:${NC}"

    if [ "${ENABLE_HTTPS:-false}" = "true" ]; then
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
    echo "  查看日志: docker compose -f $COMPOSE_FILE $COMPOSE_PROFILE logs -f"
    echo "  停止服务: docker compose -f $COMPOSE_FILE $COMPOSE_PROFILE stop"
    echo "  重启服务: docker compose -f $COMPOSE_FILE $COMPOSE_PROFILE restart"
    echo "  删除服务: docker compose -f $COMPOSE_FILE $COMPOSE_PROFILE down"
    echo ""

    if [ "$USE_RDS" = false ]; then
        # 保存密码到安全文件
        CREDENTIALS_DIR="$SCRIPT_DIR/credentials"
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
    echo "  docker compose -f $COMPOSE_FILE $COMPOSE_PROFILE exec backend npx prisma db push"
    echo ""
}

# ============================================
# 子命令: ssl - SSL 证书配置
# ============================================
cmd_ssl() {
    local mode="${1:-}"
    local domain="${2:-}"
    local admin_domain="${3:-}"
    local use_lets_encrypt=false

    # 如果是首次调用（非嵌套调用），需要获取域名
    if [ -z "$domain" ]; then
        # 尝试从 .env 读取
        if [ -f "$SCRIPT_DIR/.env" ]; then
            source "$SCRIPT_DIR/.env"
            domain="${DOMAIN_NAME:-}"
            admin_domain="${ADMIN_DOMAIN:-}"
        fi

        while [ -z "$domain" ]; do
            read -p "请输入主域名 (如: example.com): " domain
        done

        [ -z "$admin_domain" ] && admin_domain="admin.$domain"
    fi

    CERT_DIR="$SCRIPT_DIR/ssl"
    mkdir -p "$CERT_DIR"

    print_header "SSL 证书配置"

    echo -e "${YELLOW}请选择证书获取方式：${NC}"
    echo "  1) 不启用 HTTPS - 仅 HTTP（开发测试）"
    echo "  2) 自签名证书 - 快速测试 HTTPS，浏览器会警告"
    echo "  3) 上传证书 - 你已有 .crt 和 .key 文件"
    echo "  4) Let's Encrypt - 自动申请免费证书（支持泛域名）"
    echo ""

    # 如果是 Docker 模式，默认选择可能不同
    local default_choice="1"
    read -p "请选择 (1-4) [默认: 1]: " SSL_CHOICE
    SSL_CHOICE=${SSL_CHOICE:-$default_choice}

    case $SSL_CHOICE in
        2)
            # 自签名证书
            echo -e "${YELLOW}生成自签名证书...${NC}"
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$CERT_DIR/key.pem" \
                -out "$CERT_DIR/cert.pem" \
                -subj "/C=CN/ST=Shanghai/L=Shanghai/O=QZT/CN=$domain"
            chmod 600 "$CERT_DIR/key.pem"
            chmod 644 "$CERT_DIR/cert.pem"
            ENABLE_HTTPS="true"
            SSL_CERT_PATH="$CERT_DIR/cert.pem"
            SSL_KEY_PATH="$CERT_DIR/key.pem"
            print_success "自签名证书已生成"
            print_warning "浏览器会显示安全警告，这是正常的"
            ;;
        3)
            # 上传证书
            echo ""
            echo -e "${YELLOW}请输入证书内容${NC}"
            echo "证书文件 (.crt 或 .pem):"
            echo "(粘贴内容后按 Ctrl+D 结束)"
            CERT_CONTENT=$(cat)
            echo "$CERT_CONTENT" > "$CERT_DIR/cert.pem"

            echo ""
            echo "私钥文件 (.key):"
            echo "(粘贴内容后按 Ctrl+D 结束)"
            KEY_CONTENT=$(cat)
            echo "$KEY_CONTENT" > "$CERT_DIR/key.pem"

            # 验证证书
            if openssl x509 -in "$CERT_DIR/cert.pem" -noout >/dev/null 2>&1; then
                chmod 600 "$CERT_DIR/key.pem"
                chmod 644 "$CERT_DIR/cert.pem"
                ENABLE_HTTPS="true"
                SSL_CERT_PATH="$CERT_DIR/cert.pem"
                SSL_KEY_PATH="$CERT_DIR/key.pem"
                print_success "证书已保存"
            else
                print_error "证书格式错误，请检查"
                exit 1
            fi
            ;;
        4)
            # Let's Encrypt
            echo -e "${YELLOW}使用 Let's Encrypt 申请证书...${NC}"
            echo ""

            # 检查是否安装了 certbot
            if ! command -v certbot &> /dev/null; then
                print_info "安装 Certbot..."
                OS=$(detect_os)
                if [[ "$OS" =~ ^(ubuntu|debian)$ ]]; then
                    apt-get update -qq && apt-get install -y certbot
                elif [[ "$OS" =~ ^(centos|rhel|almalinux|rocky|alinux)$ ]]; then
                    yum install -y certbot
                else
                    apt-get install -y certbot
                fi
            fi

            # 询问是否需要泛域名证书
            echo ""
            read -p "是否需要泛域名证书 (*.$domain)? [y/N]: " WILDCARD
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
                        echo "  2. 找到域名 $domain"
                        echo "  3. 添加 TXT 记录："
                        echo "     主机记录: _acme-challenge"
                        echo "     记录值: <certbot 将显示>"
                        echo ""
                        read -p "按 Enter 添加 TXT 记录后，再次按 Enter 继续..."

                        certbot certonly --manual --preferred-challenges dns \
                            -d "*.$domain" -d "$domain" \
                            --email "admin@$domain" \
                            --agree-tos --no-eff-email \
                            --manual-public-ip-logging-ok

                        # 复制证书到项目目录
                        if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
                            cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$CERT_DIR/cert.pem"
                            cp "/etc/letsencrypt/live/$domain/privkey.pem" "$CERT_DIR/key.pem"
                            chmod 600 "$CERT_DIR/key.pem"
                            chmod 644 "$CERT_DIR/cert.pem"
                            ENABLE_HTTPS="true"
                            SSL_CERT_PATH="$CERT_DIR/cert.pem"
                            SSL_KEY_PATH="$CERT_DIR/key.pem"
                            print_success "证书已复制到项目目录"
                        fi
                        ;;
                    2)
                        # 腾讯云
                        echo -e "${YELLOW}腾讯云 DNS 验证...${NC}"
                        certbot certonly --manual --preferred-challenges dns \
                            --dns-dnspod \
                            -d "*.$domain" -d "$domain" \
                            --email "admin@$domain" \
                            --agree-tos --no-eff-email \
                            --manual-public-ip-logging-ok

                        if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
                            cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$CERT_DIR/cert.pem"
                            cp "/etc/letsencrypt/live/$domain/privkey.pem" "$CERT_DIR/key.pem"
                            chmod 600 "$CERT_DIR/key.pem"
                            chmod 644 "$CERT_DIR/cert.pem"
                            ENABLE_HTTPS="true"
                            SSL_CERT_PATH="$CERT_DIR/cert.pem"
                            SSL_KEY_PATH="$CERT_DIR/key.pem"
                            print_success "证书已复制到项目目录"
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
                            -d "*.$domain" -d "$domain" \
                            --email "admin@$domain" \
                            --agree-tos --no-eff-email \
                            --manual-public-ip-logging-ok

                        if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
                            cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$CERT_DIR/cert.pem"
                            cp "/etc/letsencrypt/live/$domain/privkey.pem" "$CERT_DIR/key.pem"
                            chmod 600 "$CERT_DIR/key.pem"
                            chmod 644 "$CERT_DIR/cert.pem"
                            ENABLE_HTTPS="true"
                            SSL_CERT_PATH="$CERT_DIR/cert.pem"
                            SSL_KEY_PATH="$CERT_DIR/key.pem"
                            print_success "证书已复制到项目目录"
                        fi
                        ;;
                    4)
                        # 手动 DNS 验证
                        echo -e "${YELLOW}手动 DNS 验证模式${NC}"
                        certbot certonly --manual --preferred-challenges dns \
                            -d "*.$domain" -d "$domain" \
                            --email "admin@$domain" \
                            --agree-tos --no-eff-email \
                            --manual-public-ip-logging-ok

                        if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
                            cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$CERT_DIR/cert.pem"
                            cp "/etc/letsencrypt/live/$domain/privkey.pem" "$CERT_DIR/key.pem"
                            chmod 600 "$CERT_DIR/key.pem"
                            chmod 644 "$CERT_DIR/cert.pem"
                            ENABLE_HTTPS="true"
                            SSL_CERT_PATH="$CERT_DIR/cert.pem"
                            SSL_KEY_PATH="$CERT_DIR/key.pem"
                            print_success "证书已复制到项目目录"
                        fi
                        ;;
                esac

                # 配置自动续期
                echo ""
                echo -e "${YELLOW}配置证书自动续期...${NC}"
                (crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$domain/fullchain.pem $CERT_DIR/cert.pem && cp /etc/letsencrypt/live/$domain/privkey.pem $CERT_DIR/key.pem && docker compose -f $SCRIPT_DIR/docker-compose.yml restart frontend") | crontab -
                print_success "自动续期已配置 (每天 00:00 和 12:00)"
            else
                # 单域名证书 - HTTP 验证
                echo -e "${YELLOW}单域名证书 (HTTP 验证)...${NC}"

                mkdir -p /var/www/certbot
                docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d frontend 2>/dev/null || true
                sleep 3

                certbot certonly --webroot \
                    --webroot-path=/var/www/certbot \
                    -d "$domain" \
                    -d "www.$domain" \
                    -d "admin.$domain" \
                    --email "admin@$domain" \
                    --agree-tos --no-eff-email

                if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
                    cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$CERT_DIR/cert.pem"
                    cp "/etc/letsencrypt/live/$domain/privkey.pem" "$CERT_DIR/key.pem"
                    chmod 600 "$CERT_DIR/key.pem"
                    chmod 644 "$CERT_DIR/cert.pem"
                    ENABLE_HTTPS="true"
                    SSL_CERT_PATH="$CERT_DIR/cert.pem"
                    SSL_KEY_PATH="$CERT_DIR/key.pem"
                    print_success "证书已复制到项目目录"
                fi

                # 配置自动续期
                echo ""
                echo -e "${YELLOW}配置证书自动续期...${NC}"
                (crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$domain/fullchain.pem $CERT_DIR/cert.pem && cp /etc/letsencrypt/live/$domain/privkey.pem $CERT_DIR/key.pem && docker compose -f $SCRIPT_DIR/docker-compose.yml restart frontend") | crontab -
                print_success "自动续期已配置 (每天 00:00 和 12:00)"
            fi
            ;;
        *)
            # 不启用 HTTPS
            ENABLE_HTTPS="false"
            SSL_CERT_PATH=""
            SSL_KEY_PATH=""
            echo -e "${YELLOW}不启用 HTTPS，仅使用 HTTP${NC}"
            ;;
    esac

    # 导出变量供父脚本使用
    export ENABLE_HTTPS
    export SSL_CERT_PATH
    export SSL_KEY_PATH
}

# ============================================
# 子命令: bare-metal - 裸机部署
# ============================================
cmd_bare_metal() {
    # 检查 root
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 用户或 sudo 运行"
        exit 1
    fi

    # 检测系统
    OS=$(detect_os)

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

    # 1. 安装 Node.js 22
    print_header "1/5 安装 Node.js 22"

    if command -v node &> /dev/null; then
        NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" = "22" ]; then
            print_success "Node.js 22 已安装: $(node -v)"
        else
            print_warning "检测到 Node.js $(node -v)，将升级到 22"
            INSTALL_NODE=true
        fi
    else
        INSTALL_NODE=true
    fi

    if [ "${INSTALL_NODE:-false}" = true ]; then
        print_info "下载 Node.js 22..."
        NODE_VERSION="22.14.0"
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

    # 2. 安装 pnpm 和 PM2
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

    # 3. 安装 Redis
    print_header "3/5 安装 Redis"

    if systemctl is-active --quiet $REDIS_SERVICE 2>/dev/null; then
        print_success "Redis 已运行"
    else
        print_info "安装 Redis..."

        # CentOS/RHEL 需要 EPEL
        if [ "$PKG_MANAGER" = "yum" ] && [ "$OS" != "alinux" ]; then
            if ! rpm -q epel-release &> /dev/null; then
                print_info "安装 EPEL 仓库..."
                yum install -y epel-release > /dev/null 2>&1 || true
            fi
        fi

        # CentOS/RHEL 8+ 使用 redis 或 valkey，尝试安装
        if [ "$PKG_MANAGER" = "yum" ]; then
            $INSTALL_CMD redis 2>/dev/null || $INSTALL_CMD valkey 2>/dev/null || {
                print_error "无法安装 Redis，请手动安装"
                exit 1
            }
        else
            $INSTALL_CMD $REDIS_SERVICE
        fi
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

    # 4. 安装 Nginx
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

    # 5. 配置环境变量
    print_header "5/5 配置环境变量"

    ENV_FILE="$QZT_DIR/backend/.env"
    mkdir -p "$QZT_DIR/backend"

    if [ ! -f "$ENV_FILE" ]; then
        print_info "创建环境变量文件..."

        # 生成密钥
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change_jwt_secret")
        REDIS_PASSWORD=$(cat /root/.redis_password 2>/dev/null || echo "change_redis_password")

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

    # 完成
    print_header "✓ 裸机部署环境准备完成"

    echo "已安装组件:"
    echo "  • Node.js: $(node -v)"
    echo "  • pnpm: $(pnpm -v)"
    echo "  • PM2: $(pm2 -v)"
    echo "  • Nginx: $(nginx -v 2>&1 | head -1)"
    echo "  • Redis: $(redis-server --version 2>&1 | head -1)"
    echo ""
    echo "下一步:"
    echo "  1. 编辑环境变量: vim $QZT_DIR/backend/.env"
    echo "  2. 配置数据库连接信息"
    echo "  3. 运行部署: bash $0 deploy"
}

# ============================================
# 子命令: deploy - 服务更新部署
# ============================================
cmd_deploy() {
    # 检查 root
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 用户或 sudo 运行"
        exit 1
    fi

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

    # 1. 检查环境
    echo -e "${YELLOW}[1/6] 检查环境...${NC}"

    if [ ! -f "$QZT_DIR/backend/.env" ]; then
        print_error "未找到环境变量文件"
        print_info "请先创建: $QZT_DIR/backend/.env"
        exit 1
    fi

    # 安全读取环境变量
    ALLOWED_VARS=(
        "DOMAIN_NAME"
        "ADMIN_DOMAIN"
        "DB_HOST"
        "DB_PORT"
        "DB_USERNAME"
        "DB_PASSWORD"
        "DB_DATABASE"
        "REDIS_HOST"
        "REDIS_PORT"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "JWT_EXPIRES_IN"
        "NODE_ENV"
        "PORT"
        "RDS_HOST"
        "RDS_PORT"
        "RDS_USERNAME"
        "RDS_PASSWORD"
        "RDS_DATABASE"
    )

    if [ -f "$QZT_DIR/backend/.env" ]; then
        while IFS='=' read -r key value; do
            [[ "$key" =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            key=$(echo "$key" | xargs)
            if [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
                for allowed in "${ALLOWED_VARS[@]}"; do
                    if [ "$key" = "$allowed" ]; then
                        value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^["\x27]//;s/["\x27]$//')
                        export "$key=$value"
                        break
                    fi
                done
            fi
        done < "$QZT_DIR/backend/.env"
    fi

    # 检查必填项
    if [ -z "$DOMAIN_NAME" ] || [ -z "$ADMIN_DOMAIN" ]; then
        print_error "请配置域名: DOMAIN_NAME 和 ADMIN_DOMAIN"
        exit 1
    fi

    print_success "环境检查通过"

    # 2. 备份当前版本
    echo -e "${YELLOW}[2/6] 备份当前版本...${NC}"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    CURRENT_BACKUP="$BACKUP_DIR/$TIMESTAMP"
    mkdir -p "$CURRENT_BACKUP"

    # 备份关键文件
    [ -d "$QZT_DIR/backend/dist" ] && cp -r "$QZT_DIR/backend/dist" "$CURRENT_BACKUP/" 2>/dev/null || true
    [ -d "$QZT_DIR/frontend/dist" ] && cp -r "$QZT_DIR/frontend/dist" "$CURRENT_BACKUP/" 2>/dev/null || true

    print_success "已备份到: $CURRENT_BACKUP"

    # 3. 更新后端
    echo -e "${YELLOW}[3/6] 更新后端...${NC}"

    cd "$QZT_DIR/backend"

    # 停止 PM2
    pm2 reload ecosystem.config.cjs --update-env 2>/dev/null || true

    # 更新文件
    rm -rf dist prisma
    cp -r "$DEPLOY_DIR/backend/dist" ./
    cp -r "$DEPLOY_DIR/backend/prisma" ./
    cp "$DEPLOY_DIR/backend/package.json" ./

    # 安装共享类型包
    mkdir -p "$QZT_DIR/packages"
    rm -rf "$QZT_DIR/packages/shared-types"
    mkdir -p "$QZT_DIR/packages/shared-types"
    cp -r "$DEPLOY_DIR/packages/shared-types/dist" "$QZT_DIR/packages/shared-types/"
    cp "$DEPLOY_DIR/packages/shared-types/package.json" "$QZT_DIR/packages/shared-types/"

    cat > "$QZT_DIR/pnpm-workspace.yaml" << 'EOF'
packages:
  - 'packages/*'
EOF

    cd "$QZT_DIR"
    CI=true pnpm install --no-frozen-lockfile

    cd "$QZT_DIR/backend"
    pnpm exec prisma generate

    echo -e "${CYAN}同步数据库结构...${NC}"
    pnpm exec prisma db push --skip-generate || {
        print_warning "数据库同步失败，请检查 RDS 连接"
        print_info "继续部署（可能是无变更或暂时性问题）"
    }

    print_success "后端更新完成"

    # 4. 更新前端
    echo -e "${YELLOW}[4/6] 更新前端...${NC}"

    rm -rf /var/www/qzt/frontend
    cp -r "$DEPLOY_DIR/frontend/dist" /var/www/qzt/frontend

    print_success "前端更新完成"

    # 5. 更新网站
    echo -e "${YELLOW}[5/6] 更新网站...${NC}"

    cd "$QZT_DIR/website"

    rm -rf .next public
    cp -r "$DEPLOY_DIR/website/.next" ./
    cp -r "$DEPLOY_DIR/website/public" ./
    [ -f "$DEPLOY_DIR/website/package.json" ] && cp "$DEPLOY_DIR/website/package.json" ./

    print_success "网站更新完成"

    # 6. 重启服务
    echo -e "${YELLOW}[6/6] 重启服务...${NC}"

    if [ -f "$DEPLOY_DIR/config/pm2/ecosystem.config.cjs" ]; then
        cp "$DEPLOY_DIR/config/pm2/ecosystem.config.cjs" "$QZT_DIR/backend/"
        print_success "PM2 配置已更新"
    else
        print_warning "PM2 配置文件不存在，跳过"
    fi

    cd "$QZT_DIR/backend"

    if [ -f ecosystem.config.cjs ]; then
        if pm2 describe qzt-backend >/dev/null 2>&1; then
            pm2 reload ecosystem.config.cjs --update-env
            print_success "服务已重载（零停机）"
        else
            pm2 start ecosystem.config.cjs
            print_success "服务已启动"
        fi
        pm2 save
    else
        print_error "PM2 配置文件不存在，无法启动服务"
        exit 1
    fi

    # 清理旧备份
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
}

# ============================================
# 主流程
# ============================================
main() {
    # 检查是否有参数
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi

    # 解析全局选项
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            init|check|docker|bare-metal|ssl|deploy)
                # 执行子命令
                local cmd="$1"
                shift
                "cmd_$cmd" "$@"
                exit $?
                ;;
            *)
                print_error "未知命令: $1"
                echo ""
                echo "使用 'install.sh --help' 查看帮助"
                exit 1
                ;;
        esac
    done
}

main "$@"
