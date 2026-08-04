#!/bin/bash
#
# ACME 泛域名证书申请脚本(基于 acme.sh)
#
# 用法:
#   ./deploy/ssl/acme.sh install    # 安装 acme.sh + 申请泛域名证书
#   ./deploy/ssl/acme.sh renew      # 手动续期(acme.sh 自动续期通常无需手动)
#   ./deploy/ssl/acme.sh install-cert  # 安装证书到 Nginx 并 reload
#
# 前提:
#   1. 域名已解析到本服务器 IP
#   2. DNS 托管在 Cloudflare / 阿里云DNS / DNSPod(三选一)
#   3. 准备好 DNS API Token(见下文环境变量)
#
# DNS API 配置(在运行前 export):
#   # Cloudflare:
#   export CF_Token="你的CF_API_TOKEN"
#   export CF_Zone_ID="你的ZONE_ID"
#
#   # 阿里云DNS:
#   export Ali_Key="你的AccessKeyID"
#   export Ali_Secret="你的AccessKeySecret"
#
#   # DNSPod:
#   export DP_Id="你的ID"
#   export DP_Key="你的KEY"
#

set -euo pipefail

# ── 配置(按实际修改) ──
DOMAIN="YOUR_DOMAIN"           # 如 example.com(不含 *.)
DNS_PROVIDER="dns_cf"          # dns_cf(Cloudflare)/ dns_ali(阿里云)/ dns_dp(DNSPod)
# 证书路径(acme.sh 默认安装位置)
CERT_HOME="/root/.acme.sh"
INSTALL_DIR="/etc/nginx/ssl"   # Nginx 读取证书的目录

# ── ACME 安装目录 ──
ACME_SCRIPT="$CERT_HOME/acme.sh"

info()  { echo -e "\033[0;32m[INFO]\033[0m  $*"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $*"; exit 1; }

# ── 安装 acme.sh ──
install_acme() {
    if [ -f "$ACME_SCRIPT" ]; then
        info "acme.sh 已安装"
        return
    fi
    info "安装 acme.sh..."
    curl https://get.acme.sh | sh -s email=admin@$DOMAIN
    "$ACME_SCRIPT" --set-default-ca --server letsencrypt
    info "acme.sh 安装完成"
}

# ── 申请泛域名证书 ──
issue_cert() {
    install_acme
    info "申请泛域名证书: *.$DOMAIN ..."
    "$ACME_SCRIPT" --issue --dns "$DNS_PROVIDER" -d "$DOMAIN" -d "*.$DOMAIN" --keylength ec-256
    info "证书申请成功"
}

# ── 安装证书到 Nginx 目录 ──
install_cert() {
    mkdir -p "$INSTALL_DIR"
    local cert_dir="${CERT_HOME}/${DOMAIN}_ecc"
    if [ ! -d "$cert_dir" ]; then
        error "证书目录不存在: $cert_dir,请先运行 install"
    fi
    info "安装证书到 $INSTALL_DIR ..."
    "$ACME_SCRIPT" --install-cert -d "$DOMAIN" --ecc \
        --key-file       "$INSTALL_DIR/$DOMAIN.key" \
        --fullchain-file "$INSTALL_DIR/$DOMAIN.crt" \
        --reloadcmd      "systemctl reload nginx || true"
    info "证书安装完成,Nginx 已 reload"
    info "Nginx 配置中引用:"
    info "  ssl_certificate     $INSTALL_DIR/$DOMAIN.crt;"
    info "  ssl_certificate_key $INSTALL_DIR/$DOMAIN.key;"
}

# ── 续期 ──
renew_cert() {
    info "续期证书: $DOMAIN ..."
    "$ACME_SCRIPT" --renew -d "$DOMAIN" --ecc --force
    install_cert
}

# ── 主入口 ──
case "${1:-}" in
    install)        issue_cert && install_cert ;;
    renew)          renew_cert ;;
    install-cert)   install_cert ;;
    *)
        echo "用法: $0 {install|renew|install-cert}"
        echo ""
        echo "  install       安装 acme.sh + 申请泛域名证书 + 安装到 Nginx"
        echo "  renew         手动续期(acme.sh 通常自动续期)"
        echo "  install-cert  仅安装证书到 Nginx(已有证书时)"
        echo ""
        echo "运行前请设置 DNS API 环境变量(CF_Token / Ali_Key / DP_Key)"
        exit 1
        ;;
esac
