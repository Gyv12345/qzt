#!/bin/bash
#
# 前端项目部署脚本(admin + mobile + cms)
#
# 用法:
#   ./deploy/deploy-frontend.sh build   # 构建三个前端项目
#   ./deploy/deploy-frontend.sh deploy  # 部署到 /opt/qzt-{admin,mobile,cms}
#   ./deploy/deploy-frontend.sh restart # 重启 cms(Node SSR 进程)
#   ./deploy/deploy-frontend.sh all     # build + deploy + restart
#
# 前提:三个前端项目源码在服务器上(或本地构建后上传 dist)
#

set -euo pipefail

# ── 配置 ──
ADMIN_SRC="${ADMIN_SRC:-/opt/src/qzt-go-admin}"
MOBILE_SRC="${MOBILE_SRC:-/opt/src/qzt-go-mobile}"
CMS_SRC="${CMS_SRC:-/opt/src/qzt-go-cms}"

ADMIN_DEPLOY="/opt/qzt-admin/dist"
MOBILE_DEPLOY="/opt/qzt-mobile/dist"
CMS_DEPLOY="/opt/qzt-cms"

CMS_PORT=3000

info()  { echo -e "\033[0;32m[INFO]\033[0m  $*"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $*"; exit 1; }

# ── 构建 ──
build_admin() {
    info "构建 admin..."
    cd "$ADMIN_SRC"
    pnpm install --frozen-lockfile
    pnpm run build
    info "admin 构建完成: $ADMIN_SRC/dist"
}

build_mobile() {
    info "构建 mobile..."
    cd "$MOBILE_SRC"
    pnpm install --frozen-lockfile
    pnpm run build
    info "mobile 构建完成: $MOBILE_SRC/dist"
}

build_cms() {
    info "构建 cms (Next.js)..."
    cd "$CMS_SRC"
    npm ci
    npm run build
    info "cms 构建完成: $CMS_SRC/.next"
}

build_all() {
    build_admin
    build_mobile
    build_cms
}

# ── 部署 ──
deploy_admin() {
    info "部署 admin → $ADMIN_DEPLOY"
    mkdir -p "$(dirname "$ADMIN_DEPLOY")"
    rm -rf "$ADMIN_DEPLOY"
    cp -r "$ADMIN_SRC/dist" "$ADMIN_DEPLOY"
}

deploy_mobile() {
    info "部署 mobile → $MOBILE_DEPLOY"
    mkdir -p "$(dirname "$MOBILE_DEPLOY")"
    rm -rf "$MOBILE_DEPLOY"
    cp -r "$MOBILE_SRC/dist" "$MOBILE_DEPLOY"
}

deploy_cms() {
    info "部署 cms → $CMS_DEPLOY"
    mkdir -p "$CMS_DEPLOY"
    rsync -a --delete --exclude='.next/cache' \
        "$CMS_SRC/" "$CMS_DEPLOY/"
    # 确保 .env.local 存在(生产环境变量)
    if [ ! -f "$CMS_DEPLOY/.env.local" ]; then
        error "cms .env.local 不存在,请创建(含 NEXT_PUBLIC_API_BASE)"
    fi
}

deploy_all() {
    deploy_admin
    deploy_mobile
    deploy_cms
}

# ── 重启 CMS(Node SSR) ──
restart_cms() {
    info "重启 CMS (pm2)..."
    cd "$CMS_DEPLOY"
    if command -v pm2 &>/dev/null; then
        pm2 restart qzt-cms || pm2 start "npm run start" --name qzt-cms
    else
        error "pm2 未安装,请先安装: npm install -g pm2"
    fi
    info "CMS 已重启(端口 $CMS_PORT)"
}

# ── 主入口 ──
case "${1:-}" in
    build)   build_all ;;
    deploy)  deploy_all ;;
    restart) restart_cms ;;
    all)     build_all && deploy_all && restart_cms ;;
    *)
        echo "用法: $0 {build|deploy|restart|all}"
        echo ""
        echo "  build    构建三个前端项目(admin/mobile/cms)"
        echo "  deploy   部署 dist 到 /opt/qzt-{admin,mobile,cms}"
        echo "  restart  重启 CMS Node 进程(pm2)"
        echo "  all      build + deploy + restart"
        echo ""
        echo "环境变量:"
        echo "  ADMIN_SRC   admin 源码目录(默认 /opt/src/qzt-go-admin)"
        echo "  MOBILE_SRC  mobile 源码目录(默认 /opt/src/qzt-go-mobile)"
        echo "  CMS_SRC     cms 源码目录(默认 /opt/src/qzt-go-cms)"
        exit 1
        ;;
esac
