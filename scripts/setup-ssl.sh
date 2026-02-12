#!/bin/bash
# ============================================================
# SSL 证书申请脚本 - Let's Encrypt 泛域名证书
# 使用方法: bash scripts/setup-ssl.sh devlovecode.com
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   SSL 证书申请脚本${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo "用法: $0 <域名>"
    echo ""
    echo "示例:"
    echo "  $0 devlovecode.com"
    echo ""
    echo "说明:"
    echo "  此脚本使用 Let's Encrypt 申请泛域名证书 (*.domain.com)"
    echo "  需要手动添加 DNS TXT 记录验证域名所有权"
    echo ""
    exit 1
fi

DOMAIN="$1"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   SSL 证书申请${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}域名: ${DOMAIN}${NC}"
echo -e "${YELLOW}泛域名: *.${DOMAIN}${NC}"
echo ""

# 检查 certbot 是否安装
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}certbot 未安装，正在安装...${NC}"
    dnf install -y certbot || yum install -y certbot
fi

# 创建验证目录
mkdir -p /var/www/letsencrypt

# 检查是否已存在证书
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo -e "${YELLOW}检测到已有证书，尝试续期...${NC}"
    certbot renew --cert-name "${DOMAIN}" --dry-run
    echo ""
    echo -e "${GREEN}证书续期成功！${NC}"
else
    echo -e "${GREEN}申请新证书...${NC}"
    echo ""
    echo -e "${YELLOW}请选择验证方式：${NC}"
    echo "  1. DNS 手动验证 (推荐用于泛域名证书)"
    echo "  2. HTTP 验证 (仅适用于单域名)"
    echo ""
    read -p "请选择 [1/2]: " choice

    case $choice in
        1)
            echo ""
            echo -e "${CYAN}开始 DNS 手动验证...${NC}"
            echo ""
            certbot certonly --manual --preferred-challenges dns \
                -d "${DOMAIN}" -d "*.${DOMAIN}" \
                --email "admin@${DOMAIN}" --agree-tos \
                --manual-public-ip-logging-ok
            ;;
        2)
            echo ""
            echo -e "${CYAN}开始 HTTP 验证...${NC}"
            echo ""
            echo -e "${YELLOW}注意: HTTP 验证仅适用于单域名，不能申请泛域名证书${NC}"
            certbot certonly --standalone \
                -d "${DOMAIN}" -d "www.${DOMAIN}" \
                --email "admin@${DOMAIN}" --agree-tos
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            exit 1
            ;;
    esac
fi

# 检查证书是否申请成功
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   证书申请成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    # 创建 nginx ssl 目录
    mkdir -p /etc/nginx/ssl

    # 复制证书
    echo -e "${YELLOW}复制证书到 nginx 目录...${NC}"
    cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem /etc/nginx/ssl/${DOMAIN}.crt
    cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem /etc/nginx/ssl/${DOMAIN}.key

    # 设置权限
    chmod 644 /etc/nginx/ssl/${DOMAIN}.crt
    chmod 600 /etc/nginx/ssl/${DOMAIN}.key

    echo ""
    echo -e "${GREEN}证书文件：${NC}"
    echo "  - /etc/nginx/ssl/${DOMAIN}.crt"
    echo "  - /etc/nginx/ssl/${DOMAIN}.key"
    echo ""

    # 显示证书信息
    echo -e "${YELLOW}证书信息：${NC}"
    openssl x509 -in /etc/nginx/ssl/${DOMAIN}.crt -noout -subject -dates
    echo ""

    # 设置自动续期
    echo -e "${YELLOW}配置自动续期...${NC}"
    (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem /etc/nginx/ssl/${DOMAIN}.crt && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem /etc/nginx/ssl/${DOMAIN}.key && nginx -s reload") | crontab -
    echo -e "${GREEN}自动续期任务已添加到 crontab${NC}"
    echo ""

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   配置完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "下一步："
    echo "  1. 上传 nginx 配置: scp scripts/nginx-prod.conf root@server:/etc/nginx/conf.d/qzt.conf"
    echo "  2. 测试配置: ssh root@server 'nginx -t'"
    echo "  3. 重载 nginx: ssh root@server 'nginx -s reload'"
    echo ""
else
    echo ""
    echo -e "${RED}证书申请失败！${NC}"
    echo "请检查域名解析和配置后重试。"
    exit 1
fi
