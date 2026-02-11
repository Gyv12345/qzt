#!/bin/bash
# ============================================================
# 企智通 QZT - 环境预检查脚本
# ============================================================
# 功能：
# - 检查系统兼容性
# - 检查端口占用
# - 检查磁盘空间
# - 检查网络连接
# - 检查依赖软件
#
# 使用方法：
#   bash check-env.sh [--dry-run] [--verbose]
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
readonly NC='\033[0m'

# ============================================
# 配置
# ============================================
DRY_RUN=false
VERBOSE=false
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# 需要检查的端口
REQUIRED_PORTS=(
    "80:HTTP"
    "443:HTTPS"
    "7890:Backend API"
    "5180:Website"
)

# 最低磁盘空间要求（MB）
MIN_DISK_MB=500

# ============================================
# 工具函数
# ============================================
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}[✓]${NC} $1"; ((CHECKS_PASSED++)); }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; ((CHECKS_WARNING++)); }
print_error() { echo -e "${RED}[✗]${NC} $1"; ((CHECKS_FAILED++)); }
print_info() { echo -e "${CYAN}[i]${NC} $1"; }
print_verbose() { [[ "$VERBOSE" == true ]] && echo -e "${GRAY}[DEBUG]${NC} $1"; }

# 显示帮助信息
show_help() {
    cat << EOF
${CYAN}企智通 QZT - 环境预检查脚本${NC}

${YELLOW}用法:${NC}
    bash check-env.sh [选项]

${YELLOW}选项:${NC}
    -h, --help       显示此帮助信息
    -d, --dry-run    预览模式（不执行任何修改操作）
    -v, --verbose    详细输出模式

${YELLOW}检查项目:${NC}
    ${BLUE}系统${NC}        操作系统类型和版本
    ${BLUE}架构${NC}        CPU 架构 (x86_64/arm64)
    ${BLUE}内存${NC}        可用内存大小
    ${BLUE}磁盘${NC}        可用磁盘空间
    ${BLUE}端口${NC}        80/443/7890/5180 端口占用
    ${BLUE}网络${NC}        外网连接和 DNS 解析
    ${BLUE}依赖${NC}        Git/Docker/Node.js/PM2

${YELLOW}示例:${NC}
    bash check-env.sh              # 执行所有检查
    bash check-env.sh --dry-run     # 预览模式
    bash check-env.sh --verbose      # 详细输出

${YELLOW}退出代码:${NC}
    0    所有检查通过
    1    有检查失败
    2    有警告但无致命错误

EOF
}

# ============================================
# 检查函数
# ============================================

# 1. 系统检查
check_system() {
    print_header "系统检查 (1/7)"

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        print_success "操作系统: $PRETTY_NAME"

        # 检查是否为支持的系统
        if [[ "$OS" =~ ^(ubuntu|debian|centos|rhel|almalinux|rocky|fedora|alinux)$ ]]; then
            print_success "系统支持: 是"
        else
            print_warning "系统支持: 未知 ($OS)，可能不完全兼容"
        fi
    else
        print_error "无法识别操作系统"
        return 1
    fi
}

# 2. 架构检查
check_architecture() {
    print_header "架构检查 (2/7)"

    ARCH=$(uname -m)
    print_info "CPU 架构: $ARCH"

    case "$ARCH" in
        x86_64|amd64)
            print_success "架构支持: x86_64"
            ARCH_SUFFIX="x64"
            ;;
        aarch64|arm64)
            print_success "架构支持: ARM64"
            ARCH_SUFFIX="arm64"
            ;;
        armv7l)
            print_warning "架构支持: ARM v7 (32位)，性能可能受限"
            ARCH_SUFFIX="armv7"
            ;;
        *)
            print_error "架构不支持: $ARCH"
            return 1
            ;;
    esac
}

# 3. 内存检查
check_memory() {
    print_header "内存检查 (3/7)"

    if command -v free &> /dev/null; then
        TOTAL_MEM_MB=$(free -m | awk '/Mem:/ {print $2}')
        AVAILABLE_MEM_MB=$(free -m | awk '/Mem:/ {print $7}')
    else
        print_warning "无法检测内存"
        return
    fi

    print_info "总内存: ${TOTAL_MEM_MB} MB"
    print_info "可用内存: ${AVAILABLE_MEM_MB} MB"

    if [ "$TOTAL_MEM_MB" -lt 1024 ]; then
        print_error "内存不足 (最少需要 1GB，当前 ${TOTAL_MEM_MB}MB)"
        print_info "建议: 升级服务器配置或使用外部 RDS/Redis"
    elif [ "$TOTAL_MEM_MB" -lt 2048 ]; then
        print_warning "内存较小 (建议 2GB 以上)"
        print_info "将使用 2C2G 资源分配方案"
    else
        print_success "内存充足"
    fi
}

# 4. 磁盘空间检查
check_disk() {
    print_header "磁盘空间检查 (4/7)"

    # 检查多个挂载点
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
        elif [ "$AVAILABLE_MB" -lt $((MIN_DISK_MB * 2)) ]; then
            print_warning "磁盘空间紧张 ($path)"
        else
            print_success "磁盘空间充足 ($path)"
        fi
    done
}

# 5. 端口检查
check_ports() {
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
            continue
        fi

        if [ "$OCCUPIED" -gt 0 ]; then
            print_warning "端口 $PORT ($SERVICE) 已被占用"
            print_info "占用进程: $(ss -tlnp 2>/dev/null | grep ":$PORT " | head -1 | awk '{print $6}' || echo '未知')"

            # 提供解决方案
            case "$PORT" in
                80|443)
                    print_info "解决方案: systemctl stop nginx 或修改 Nginx 配置"
                    ;;
                7890)
                    print_info "解决方案: pm2 stop all 或修改后端 PORT 环境变量"
                    ;;
                5180)
                    print_info "解决方案: 停止其他占用 5180 端口的服务"
                    ;;
            esac
        else
            print_success "端口 $PORT ($SERVICE) 可用"
        fi
    done
}

# 6. 网络检查
check_network() {
    print_header "网络检查 (6/7)"

    # 检查外网连接
    print_info "检查外网连接..."

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
        else
            print_warning "$DESC 不可访问 (可能需要配置代理)"
        fi
    done

    # 检查 DNS 解析
    print_info "检查 DNS 解析..."

    if command -v nslookup &> /dev/null; then
        if nslookup github.com >/dev/null 2>&1; then
            print_success "DNS 解析正常"
        else
            print_error "DNS 解析失败"
            print_info "解决方案: 检查 /etc/resolv.conf 或尝试 8.8.8.8"
        fi
    fi
}

# 7. 依赖检查
check_dependencies() {
    print_header "依赖检查 (7/7)"

    # 定义依赖: 命令:描述:是否必需
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
        else
            if [ "$REQUIRED" = "必需" ]; then
                print_error "$DESC ($CMD): 未安装"
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
        else
            print_verbose "$DESC ($CMD): 未安装"
        fi
    done
}

# ============================================
# 主流程
# ============================================
main() {
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -d|--dry-run)
                DRY_RUN=true
                print_info "预览模式: 不会执行任何修改操作"
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            *)
                echo "未知选项: $1"
                echo "使用 --help 查看帮助"
                exit 1
                ;;
        esac
    done

    print_header "企智通 QZT - 环境预检查"

    # 执行所有检查
    check_system
    check_architecture
    check_memory
    check_disk
    check_ports
    check_network
    check_dependencies

    # 显示总结
    print_header "检查总结"

    echo -e "${CYAN}检查结果:${NC}"
    echo -e "  ${GREEN}通过${NC}: $CHECKS_PASSED"
    echo -e "  ${YELLOW}警告${NC}: $CHECKS_WARNING"
    echo -e "  ${RED}失败${NC}: $CHECKS_FAILED"
    echo ""

    if [ $CHECKS_FAILED -gt 0 ]; then
        echo -e "${RED}✗ 环境检查失败，请解决上述问题后再部署${NC}"
        exit 1
    elif [ $CHECKS_WARNING -gt 0 ]; then
        echo -e "${YELLOW}! 环境检查通过，但有一些警告${NC}"
        exit 2
    else
        echo -e "${GREEN}✓ 环境检查全部通过，可以开始部署${NC}"
        exit 0
    fi
}

main "$@"
