#!/bin/bash
# ============================================================
# rebuild_static.sh —— 静态站一键重建脚本(仓库留档模板)
#
# 用途: 由后端 POST /deploy/static 以 `/bin/bash rebuild_static.sh <target>` 调用,
#       在服务器上完成 Next.js 静态导出构建并 rsync 发布到静态托管目录。
# 用法: ./rebuild_static.sh <cms|storefront>
# 部署: 拷贝到服务器 /opt/qzt-server/bin/rebuild_static.sh 并 chmod +x;
#       服务器需预装 node/npm/npx/rsync;next.config 需开启 output: 'export'。
# 输出: stdout/stderr 全量落 /opt/qzt-server/logs/rebuild_<target>_<ts>.log
#       (由调用方重定向);本脚本每步 echo 时间戳,失败非零退出,末尾 echo DONE。
# ============================================================
set -euo pipefail

# target 白名单映射(其余值直接失败,绝不透传到下游命令)
case "${1:-}" in
  cms)
    SRC_DIR="/opt/qzt-cms"; DST_DIR="/opt/qzt-cms-static"
    # 构建期 env(API 内网直连;站点域名供 sitemap/canonical/llms 烘焙,缺失则 localhost 进产物)
    # 双主题:官网(cms) + 跨境(storefront 并入后随 cms 一起构建发布)
    export NEXT_PUBLIC_API_BASE="http://127.0.0.1:9000"
    export NEXT_PUBLIC_SITE_URL="https://devlovecode.com"
    export NEXT_PUBLIC_STOREFRONT_SITE_URL="https://storefront.devlovecode.com"
    ;;
  *) echo "[error] usage: $0 <cms>, got '${1:-}'"; exit 2 ;;
esac

step() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

step "=== rebuild ${1} start (src=${SRC_DIR} dst=${DST_DIR}) ==="

if [ ! -f "${SRC_DIR}/package.json" ]; then
  step "[error] ${SRC_DIR}/package.json not found"
  exit 1
fi

cd "${SRC_DIR}"
step "npm install ..."
npm install --no-audit --no-fund

step "npm run build (output:export -> out/) ..."
# 走 package.json 的 build 脚本:storefront 的 EXPORT_STATIC=1 开关在脚本里内置
npm run build

if [ ! -d out ]; then
  step "[error] build output dir out/ missing (check next.config output: 'export')"
  exit 1
fi

step "rsync publish -> ${DST_DIR} ..."
rsync -a --delete "${SRC_DIR}/out/" "${DST_DIR}/"

step "=== DONE ${1} ==="
