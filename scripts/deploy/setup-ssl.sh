#!/bin/bash
# ============================================================
# SSL 证书配置 - 支持泛域名证书和自动续期
# ============================================================
# 支持三种方式：
# 1. 自签名证书 - 快速测试用
# 2. 上传自己的证书 - 有证书的情况下最快
# 3. Let's Encrypt - 支持泛域名证书 *.domain.com (DNS验证)
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# 获取主域名
source /opt/qzt/backend/.env 2>/dev/null || true
DOMAIN="${DOMAIN_NAME:-}"

while [ -z "$DOMAIN" ]; do
    read -p "请输入主域名 (如: example.com): " DOMAIN
done

CERT_DIR="/etc/nginx/ssl/$DOMAIN"
mkdir -p "$CERT_DIR"

print_header "SSL 证书配置"

echo -e "${YELLOW}请选择证书获取方式：${NC}"
echo "  1) 自签名证书 - 适合快速测试，浏览器会警告"
echo "  2) 上传证书 - 你已有 .crt 和 .key 文件"
echo "  3) Let's Encrypt - 自动申请免费证书 (支持泛域名 *.domain.com)"
echo ""
read -p "请选择 (1-3): " CHOICE

case $CHOICE in
    1)
        # 自签名证书
        print_info "生成自签名证书..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$CERT_DIR/key.pem" \
            -out "$CERT_DIR/cert.pem" \
            -subj "/C=CN/ST=Shanghai/L=Shanghai/O=QZT/CN=$DOMAIN"
        chmod 600 "$CERT_DIR/key.pem"
        chmod 644 "$CERT_DIR/cert.pem"
        print_success "自签名证书已生成"
        print_warning "浏览器会显示安全警告，这是正常的"
        ;;

    2)
        # 上传证书
        echo ""
        print_info "请粘贴证书内容 (.crt/.pem 文件内容):"
        echo "  (粘贴后按回车，然后输入 Ctrl+D 结束)"
        cat > "$CERT_DIR/cert.pem"

        echo ""
        print_info "请粘贴私钥内容 (.key 文件内容):"
        echo "  (粘贴后按回车，然后输入 Ctrl+D 结束)"
        cat > "$CERT_DIR/key.pem"

        # 验证
        if openssl x509 -in "$CERT_DIR/cert.pem" -noout >/dev/null 2>&1; then
            chmod 600 "$CERT_DIR/key.pem"
            chmod 644 "$CERT_DIR/cert.pem"
            print_success "证书格式正确，已保存"
        else
            print_error "证书格式错误，请检查"
            rm -f "$CERT_DIR/cert.pem" "$CERT_DIR/key.pem"
            exit 1
        fi
        ;;

    3)
        # Let's Encrypt
        print_info "使用 Let's Encrypt 申请证书..."

        # 检测系统
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$ID
        else
            print_error "无法检测系统类型"
            exit 1
        fi

        # 安装 certbot
        if ! command -v certbot &> /dev/null; then
            print_info "安装 Certbot..."
            if [[ "$OS" =~ ^(ubuntu|debian)$ ]]; then
                apt-get update -qq
                apt-get install -y certbot python3-certbot-nginx
            elif [[ "$OS" =~ ^(centos|rhel|almalinux|rocky|alinux)$ ]]; then
                yum install -y certbot
            else
                apt-get install -y certbot
            fi
        fi

        # 询问是否需要泛域名证书
        echo ""
        read -p "是否需要泛域名证书 (*.example.com)? [y/N]: " WILDCARD
        WILDCARD=${WILDCARD:-n}

        if [[ "$WILDCARD" =~ ^[Yy]$ ]]; then
            # 泛域名证书 - DNS 验证
            print_info "泛域名证书需要 DNS 验证"

            # 询问 DNS 服务商
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
                    print_info "阿里云 DNS 验证..."
                    echo ""
                    echo "请按以下步骤操作："
                    echo "  1. 登录阿里云控制台 → DNS → DNS 解析设置"
                    echo "  2. 找到域名 $DOMAIN"
                    echo "  3. 添加 TXT 记录："
                    echo "     主机记录: _acme-challenge"
                    echo "     记录值: <certbot 将显示>"
                    echo ""
                    read -p "按 Enter 添加 TXT 记录后，再次按 Enter 继续..."

                    # 申请证书
                    certbot certonly --manual --preferred-challenges dns \
                        --dns-cloudflare \
                        --dns-cloudflare-credentials /root/.secrets/certbot-cloudflare.ini \
                        -d "*.$DOMAIN" -d "$DOMAIN" \
                        --email "admin@$DOMAIN" \
                        --agree-tos --no-eff-email \
                        --manual-public-ip-logging-ok
                    ;;
                2)
                    # 腾讯云
                    print_info "腾讯云 DNS 验证..."
                    certbot certonly --manual --preferred-challenges dns \
                        --dns-dnspod \
                        -d "*.$DOMAIN" -d "$DOMAIN" \
                        --email "admin@$DOMAIN" \
                        --agree-tos --no-eff-email \
                        --manual-public-ip-logging-ok
                    ;;
                3)
                    # Cloudflare
                    print_info "Cloudflare DNS 验证..."
                    echo "请先安装 Cloudflare 插件:"
                    echo "  pip install certbot-dns-cloudflare"
                    echo ""
                    echo "然后创建 API Token:"
                    echo "  1. 登录 Cloudflare → My Profile → API Tokens"
                    echo "  2. 创建 Token，权限: Zone.Zone + Zone.DNS"
                    echo "  3. 保存 Token 到 /root/.secrets/certbot-cloudflare.ini"
                    echo ""
                    read -p "配置完成后按 Enter 继续..."

                    certbot certonly --manual --preferred-challenges dns \
                        --dns-cloudflare \
                        --dns-cloudflare-credentials /root/.secrets/certbot-cloudflare.ini \
                        -d "*.$DOMAIN" -d "$DOMAIN" \
                        --email "admin@$DOMAIN" \
                        --agree-tos --no-eff-email \
                        --manual-public-ip-logging-ok
                    ;;
                4)
                    # 手动 DNS 验证
                    print_info "手动 DNS 验证模式"
                    certbot certonly --manual --preferred-challenges dns \
                        -d "*.$DOMAIN" -d "$DOMAIN" \
                        --email "admin@$DOMAIN" \
                        --agree-tos --no-eff-email \
                        --manual-public-ip-logging-ok
                    ;;
            esac
        else
            # 单域名证书 - HTTP 验证
            print_info "单域名证书 (HTTP 验证)..."

            mkdir -p /var/www/certbot
            chown -R www-data:www-data /var/www/certbot 2>/dev/null || true
            chown -R nginx:nginx /var/www/certbot 2>/dev/null || true

            certbot certonly --webroot \
                --webroot-path=/var/www/certbot \
                -d "$DOMAIN" \
                -d "www.$DOMAIN" \
                -d "admin.$DOMAIN" \
                --email "admin@$DOMAIN" \
                --agree-tos --no-eff-email
        fi

        if [ $? -eq 0 ]; then
            # 创建软链接
            ln -sf "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/cert.pem"
            ln -sf "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/key.pem"
            print_success "Let's Encrypt 证书已获取"

            # 设置自动续期
            print_info "配置证书自动续期..."
            (crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet --deploy-hook 'nginx -s reload'") | crontab -
            print_success "自动续期已配置 (每天 00:00 和 12:00)"
        else
            print_error "证书获取失败"
            exit 1
        fi
        ;;
esac

print_header "✓ 证书配置完成"

echo -e "${CYAN}证书路径：${NC}"
echo "  证书: $CERT_DIR/cert.pem"
echo "  私钥: $CERT_DIR/key.pem"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo "  1. 重启 Nginx: systemctl reload nginx"
echo "  2. 访问 https://$DOMAIN 测试"
