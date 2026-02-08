#!/bin/bash
# ============================================================
# SSL 证书配置 - 国内环境优化版
# ============================================================
# 支持三种方式：
# 1. 自签名证书 - 快速测试用
# 2. 上传自己的证书 - 有证书的情况下最快
# 3. Let's Encrypt - 需要外网访问
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# 获取主域名
source /opt/qzt/backend/.env 2>/dev/null || true
DOMAIN="${DOMAIN_NAME:-}"

while [ -z "$DOMAIN" ]; do
    read -p "请输入主域名 (如: example.com): " DOMAIN
done

CERT_DIR="/etc/nginx/ssl/$DOMAIN"
mkdir -p "$CERT_DIR"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   SSL 证书配置${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}请选择证书获取方式：${NC}"
echo "  1) 自签名证书 - 适合快速测试，浏览器会警告"
echo "  2) 上传证书 - 你已有 .crt 和 .key 文件"
echo "  3) Let's Encrypt - 需要域名已解析到服务器"
echo ""
read -p "请选择 (1-3): " CHOICE

case $CHOICE in
    1)
        # 自签名证书
        echo -e "${YELLOW}生成自签名证书...${NC}"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$CERT_DIR/key.pem" \
            -out "$CERT_DIR/cert.pem" \
            -subj "/C=CN/ST=Shanghai/L=Shanghai/O=QZT/CN=$DOMAIN"

        echo -e "${GREEN}✓ 自签名证书已生成${NC}"
        echo -e "${YELLOW}⚠️ 浏览器会显示安全警告，这是正常的${NC}"
        ;;

    2)
        # 上传证书
        echo ""
        echo -e "${YELLOW}请粘贴证书内容 (.crt/.pem 文件内容):${NC}"
        echo "  (粘贴后按回车，然后输入 Ctrl+D 结束)"
        cat > "$CERT_DIR/cert.pem"

        echo ""
        echo -e "${YELLOW}请粘贴私钥内容 (.key 文件内容):${NC}"
        echo "  (粘贴后按回车，然后输入 Ctrl+D 结束)"
        cat > "$CERT_DIR/key.pem"

        # 验证
        if openssl x509 -in "$CERT_DIR/cert.pem" -noout >/dev/null 2>&1; then
            echo -e "${GREEN}✓ 证书格式正确${NC}"
        else
            echo -e "${RED}✗ 证书格式错误，请检查${NC}"
            rm -f "$CERT_DIR/cert.pem" "$CERT_DIR/key.pem"
            exit 1
        fi

        echo -e "${GREEN}✓ 证书已保存${NC}"
        ;;

    3)
        # Let's Encrypt
        echo -e "${YELLOW}使用 Let's Encrypt...${NC}"
        echo -e "${YELLOW}确保域名已正确解析到当前服务器${NC}"
        echo ""

        # 安装 certbot（使用国内镜像）
        if ! command -v certbot &> /dev/null; then
            echo -e "${YELLOW}安装 Certbot...${NC}"
            apt-get install -y certbot
        fi

        # HTTP 验证方式
        mkdir -p /var/www/certbot
        chown -R www-data:www-data /var/www/certbot

        certbot certonly --webroot \
            --webroot-path=/var/www/certbot \
            --email "admin@$DOMAIN" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN" \
            -d "www.$DOMAIN" \
            -d "admin.$DOMAIN"

        if [ $? -eq 0 ]; then
            # 创建软链接
            ln -sf "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/cert.pem"
            ln -sf "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/key.pem"
            echo -e "${GREEN}✓ Let's Encrypt 证书已获取${NC}"
        else
            echo -e "${RED}✗ 证书获取失败${NC}"
            exit 1
        fi
        ;;
esac

# 设置权限
chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 证书配置完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}证书路径：${NC}"
echo "  证书: $CERT_DIR/cert.pem"
echo "  私钥: $CERT_DIR/key.pem"
