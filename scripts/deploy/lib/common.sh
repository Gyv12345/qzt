#!/bin/bash
# ============================================================
# 企智通 QZT - 部署脚本通用库
# ============================================================
# 提供统一的输出格式、颜色定义和工具函数
#
# 使用方法：
#   source ./scripts/deploy/lib/common.sh
# ============================================================

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
# 进度跟踪
# ============================================
DEPLOY_CURRENT_STEP=0
DEPLOY_TOTAL_STEPS=0

# 初始化进度
init_progress() {
    DEPLOY_TOTAL_STEPS=$1
    DEPLOY_CURRENT_STEP=0
}

# 显示进度标题
print_step() {
    ((DEPLOY_CURRENT_STEP++))
    local title="$1"
    echo -e "${YELLOW}[${DEPLOY_CURRENT_STEP}/${DEPLOY_TOTAL_STEPS}]${NC} $title"
}

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
# 帮助信息模板
# ============================================
show_script_help() {
    local script_name="$1"
    local description="$2"
    local usage="$3"
    local options="$4"
    local examples="${5:-无}"

    cat << EOF
${CYAN}$script_name${NC}
${GRAY}$description${NC}

${YELLOW}用法:${NC}
    $usage

${YELLOW}选项:${NC}
$options

${YELLOW}示例:${NC}
$examples

${YELLOW}更多信息:${NC}
    https://github.com/Gyv12345/qzt/docs/deploy

EOF
}

# ============================================
# 错误处理
# ============================================
# 设置错误时的清理函数
set_error_handler() {
    local cleanup_function="$1"

    trap "$cleanup_function; exit 1" ERR INT TERM
}

# ============================================
# 进度条
# ============================================
# 显示简单进度条
show_progress() {
    local current=$1
    local total=$2
    local width=40

    local percent=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))

    printf "\r["
    printf "${GREEN}%*s${NC}" "$filled" | tr ' ' '='
    printf "%*s" "$empty" | tr ' ' '-
    printf "] %d%%" "$percent"

    if [ "$current" -eq "$total" ]; then
        echo ""
    fi
}

# ============================================
# 日志函数
# ============================================
# 日志文件路径
LOG_FILE="${LOG_FILE:-/var/log/qzt-deploy.log}"

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
# 导出变量
# ============================================
export DEPLOY_CURRENT_STEP DEPLOY_TOTAL_STEPS
export GREEN YELLOW RED CYAN BLUE GRAY BOLD NC
