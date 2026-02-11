#!/bin/sh
# Docker 容器启动脚本
# 根据是否存在 SSL 证书选择 nginx 配置

set -e

if [ -f "/etc/nginx/ssl/cert.pem" ] && [ -f "/etc/nginx/ssl/key.pem" ]; then
    echo "HTTPS enabled - using full nginx.conf with SSL support"
    # 使用默认配置（包含 HTTPS）
    exec nginx -g "daemon off;"
else
    echo "HTTPS disabled - using HTTP-only configuration"
    # 切换到仅 HTTP 配置
    cp /etc/nginx/conf.d/nginx.http.conf.template /etc/nginx/conf.d/default.conf
    rm -f /etc/nginx/conf.d/nginx.conf.bak
    exec nginx -g "daemon off;"
fi
