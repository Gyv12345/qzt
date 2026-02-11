#!/bin/bash
# ============================================================
# 企智通 QZT - 服务器初始化脚本
# 支持: Ubuntu/Debian, CentOS/RHEL/AlmaLinux/Rocky, Fedora, Alibaba Cloud Linux
#
# 功能：
# - 安装 Git
# - 下载项目到 /opt/qzt
# - 指引用户选择部署方式
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

# ============================================
# 检查 root
# ============================================
if [ "$EUID" -ne 0 ]; then
    print_error "请使用 root 用户或 sudo 运行"
    echo "运行命令: sudo bash $0"
    exit 1
fi

# ============================================
# 检测 Linux 发行版
# ============================================
print_header "企智通 QZT - 服务器初始化"

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
elif [ -f /etc/redhat-release ]; then
    OS="centos"
elif [ -f /etc/debian_version ]; then
    OS="debian"
else
    print_error "无法检测系统类型"
    exit 1
fi

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

# ============================================
# 安装 Git
# ============================================
print_header "1/2 安装 Git"

if command -v git &> /dev/null; then
    print_success "Git 已安装: $(git --version)"
else
    print_info "正在安装 Git..."
    $UPDATE_CMD > /dev/null 2>&1
    $INSTALL_CMD git > /dev/null 2>&1
    print_success "Git 安装完成: $(git --version)"
fi

# ============================================
# 下载项目
# ============================================
print_header "2/2 下载项目"

mkdir -p /opt/qzt
cd /opt/qzt

if [ -d "/opt/qzt/qzt" ]; then
    print_warning "项目目录已存在: /opt/qzt/qzt"
    echo ""
    echo "  1) 更新项目 (git pull)"
    echo "  2) 删除并重新下载"
    echo "  3) 使用现有项目（不更新）"
    echo ""
    read -p "请选择 [1/2/3, 默认: 1]: " RE_DOWNLOAD
    RE_DOWNLOAD=${RE_DOWNLOAD:-1}

    case "$RE_DOWNLOAD" in
        1)
            print_info "正在更新项目..."
            cd /opt/qzt/qzt
            git pull origin main
            print_success "项目已更新"
            ;;
        2)
            print_info "删除并重新下载..."
            rm -rf /opt/qzt/qzt
            ;;
        *)
            print_info "使用现有项目（不更新）"
            ;;
    esac
fi

if [ ! -d "/opt/qzt/qzt" ]; then
    print_info "正在下载项目..."
    git clone https://github.com/Gyv12345/qzt.git
    print_success "项目已下载到: /opt/qzt/qzt"
fi

cd /opt/qzt/qzt

# ============================================
# 选择部署方式
# ============================================
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

read -p "请选择 (1/2): " DEPLOY_MODE

case "$DEPLOY_MODE" in
    1)
        echo ""
        print_info "即将执行裸机部署..."
        echo ""
        read -p "按 Enter 键继续，或 Ctrl+C 取消..."
        bash scripts/deploy/bare-metal-deploy.sh
        ;;
    2)
        echo ""
        print_info "即将执行 Docker 部署..."
        echo ""
        read -p "按 Enter 键继续，或 Ctrl+C 取消..."
        bash scripts/deploy/docker-deploy.sh
        ;;
    *)
        print_error "无效选择: $DEPLOY_MODE"
        echo ""
        echo "稍后手动部署，请运行："
        echo "  cd /opt/qzt/qzt"
        echo "  bash scripts/deploy/bare-metal-deploy.sh  # 裸机部署"
        echo "  bash scripts/deploy/docker-deploy.sh      # Docker 部署"
        exit 1
        ;;
esac
