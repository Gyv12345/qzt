# 企智通 (QZT) 部署指南

> Ubuntu 22.04/24.04 裸机部署 + GitHub Actions 自动化 CI/CD

---

## 目录

- [架构概述](#架构概述)
- [服务器准备](#服务器准备)
- [初始化服务器](#初始化服务器)
- [SSL 证书配置](#ssl-证书配置)
- [配置 Nginx](#配置-nginx)
- [配置 GitHub Secrets](#配置-github-secrets)
- [首次部署](#首次部署)
- [后续自动部署](#后续自动部署)
- [常用命令](#常用命令)
- [故障排查](#故障排查)

---

## 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Backend CI  │  │ Frontend CI  │  │ Website CI   │ │
│  │   + Deploy   │  │  + Deploy    │  │  + Deploy    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Ubuntu 22.04/24.04 2C4G 服务器     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Nginx (443/80)                 │   │
│  │  ┌────────────────────┐  ┌─────────────────────┐  │   │
│  │  │ devlovecode.com   │  │admin.devlovecode.com│  │   │
│  │  │   → Website       │  │   → Frontend        │  │   │
│  │  └────────┬─────────┘  └────────┬────────────┘  │   │
│  │           │                     │                │   │
│  │  ┌────────▼─────────┐  ┌──────▼──────────────┐ │   │
│  │  │  PM2 Website    │  │  静态文件 /api     │ │   │
│  │  │  Next.js :5180  │◄─┤  Proxy :7890       │ │   │
│  │  └─────────────────┘  └──────┬──────────────┘ │   │
│  │                               │                 │   │
│  │                    ┌──────────▼──────────────┐  │   │
│  │                    │  PM2 Backend           │  │   │
│  │                    │  NestJS :7890          │  │   │
│  │                    └───────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                              │                         │
└────────────────────────────────┼─────────────────────┘
                               ▼
                    ┌──────────────────┐
                    │  独立 MySQL      │
                    │  2C2G 服务器    │
                    └──────────────────┘
```

### 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80, 443 | HTTP/HTTPS |
| Backend (PM2) | 7890 | NestJS API |
| Website (PM2) | 5180 | Next.js |
| Redis | 6379 | 本地缓存（仅内网） |
| MySQL | 3306 | 独立数据库服务器 |

### 服务器目录结构

```
/var/www/qzt/
├── backend/          # 后端代码
├── frontend/         # 前端静态文件
├── website/          # 网站代码
├── logs/             # PM2 日志
└── backups/          # 部署备份

/etc/nginx/
├── ssl/              # SSL 证书
│   ├── devlovecode.com.crt
│   └── devlovecode.com.key
└── sites-available/   # nginx 站点配置
    └── qzt
```

---

## 服务器准备

### 硬件要求

- **Web 服务器**: Ubuntu 22.04/24.04, 2C4G
- **数据库服务器**: 独立 MySQL, 2C2G
- **域名**: devlovecode.com (已解析到服务器 IP)

### 检查清单

- [ ] 服务器已安装 Ubuntu 22.04 或 24.04
- [ ] 域名已解析到服务器 IP
- [ ] 已有 root 权限或 sudo 权限
- [ ] MySQL 服务器已配置好远程访问

---

## 初始化服务器

### 前提条件

- 服务器已安装 Ubuntu 22.04/24.04
- 你有服务器的 root 权限
- 服务器可以通过 SSH 访问

### 初始化步骤

**第一步：上传并运行初始化脚本**

```bash
# 方法 1：直接运行远程脚本（推荐）
cat scripts/server-init.sh | ssh root@your-server 'bash -s'

# 方法 2：SCP 上传后执行
scp scripts/server-init.sh root@your-server:/root/
ssh root@your-server "bash /root/server-init.sh"

# 方法 3：手动复制内容
# 打开 scripts/server-init.sh，复制全部内容
# 然后粘贴到服务器的文件中执行
```

脚本会自动安装：
- Node.js 22.x LTS
- pnpm 10.x
- PM2
- Nginx
- Redis
- certbot
- Git（如果未安装）

**第二步：验证安装结果**

```bash
# SSH 登录服务器
ssh root@your-server

# 检查版本
node -v    # v22.x.x
pnpm -v    # 10.x.x
pm2 -v
nginx -v
redis-cli --version
git --version
```

**第三步：克隆项目代码**

```bash
cd /root
git clone <your-repo-url> qzt
cd qzt
```

**代码位置**：`/root/qzt/`（或你指定的其他目录）

---

## SSL 证书配置

### 方法一：使用 Let's Encrypt (推荐)

```bash
# 在服务器上运行
bash scripts/setup-ssl.sh devlovecode.com
```

按照提示选择 **DNS 手动验证**：

1. 脚本会显示需要添加的 DNS TXT 记录
2. 在域名 DNS 管理面板添加 TXT 记录
3. 等待 DNS 生效（通常 1-5 分钟）
4. 按回车继续验证

**DNS 记录示例**：
```
类型: TXT
主机记录: _acme-challenge
记录值: (脚本显示的值)
```

### 方法二：使用已有证书

如果你已有 SSL 证书，直接上传：

```bash
# 上传证书
scp devlovecode.com.crt root@your-server:/etc/nginx/ssl/
scp devlovecode.com.key root@your-server:/etc/nginx/ssl/
```

---

## 配置 Nginx

代码已在服务器上，直接操作：

```bash
# 登录服务器
ssh root@your-server
cd /root/qzt

# 启用站点配置
ln -sf /root/qzt/scripts/nginx-prod.conf /etc/nginx/sites-available/qzt
ln -sf /etc/nginx/sites-available/qzt /etc/nginx/sites-enabled/qzt

# 删除默认站点（避免端口冲突）
rm -f /etc/nginx/sites-enabled/default

# 测试并重载 Nginx
nginx -t && nginx -s reload
```

---

## 配置 GitHub Secrets

### 第一步：生成 SSH 密钥对

```bash
# 在本地机器上生成
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github-actions-qzt
# (直接回车，不设置密码)
```

### 第二步：配置服务器

```bash
# 复制公钥内容
cat ~/.ssh/github-actions-qzt.pub
```

然后在服务器上：

```bash
# 添加公钥到服务器
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "(粘贴公钥内容)" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 第三步：添加 GitHub Secrets

进入 GitHub 仓库：
1. **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret** 添加以下 secrets：

| Secret 名称 | 值 | 获取方式 |
|------------|-----|----------|
| `SSH_PRIVATE_KEY` | 私钥内容 | `cat ~/.ssh/github-actions-qzt` |
| `SERVER_HOST` | 服务器 IP | 如 `192.168.1.100` |
| `DATABASE_URL` | MySQL 连接字符串 | `mysql://user:password@mysql-ip:3306/qzt` |

**注意**：`SSH_PRIVATE_KEY` 需要包含完整的私钥，包括：
```
-----BEGIN RSA PRIVATE KEY-----
... (私钥内容) ...
-----END RSA PRIVATE KEY-----
```

---

## 首次部署

### 方法一：本地手动部署 (推荐首次使用)

```bash
# 在本地项目根目录运行
SERVER_HOST=your-server-ip bash scripts/deploy.sh all

# 或分别部署
SERVER_HOST=your-server-ip bash scripts/deploy.sh backend
SERVER_HOST=your-server-ip bash scripts/deploy.sh frontend
SERVER_HOST=your-server-ip bash scripts/deploy.sh website
```

### 方法二：配置后端环境变量

在服务器上创建 `.env` 文件：

```bash
ssh root@your-server
vi /var/www/qzt/backend/.env
```

添加以下内容：

```bash
# 数据库连接
DATABASE_URL="mysql://username:password@mysql-server-ip:3306/qzt"

# Redis 连接（本地）
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
# 如果设置了密码
# REDIS_PASSWORD="your-redis-password"

# 环境
NODE_ENV="production"

# JWT 密钥 (请修改为随机字符串)
JWT_SECRET="your-random-secret-key-here"

# 前端和网站 URL
FRONTEND_URL="https://admin.devlovecode.com"
WEBSITE_URL="https://devlovecode.com"
```

---

## 后续自动部署

配置完成后，推送代码即可自动触发部署：

```bash
# 部署后端 (修改 backend/ 目录)
git add backend/
git commit -m "feat: 更新后端功能"
git push origin develop

# 部署前端 (修改 frontend/ 目录)
git add frontend/
git commit -m "feat: 更新前端页面"
git push origin develop

# 部署网站 (修改 website/ 目录)
git add website/
git commit -m "feat: 更新网站内容"
git push origin develop
```

**触发条件**：
- 推送到 `main` 或 `develop` 分支
- 修改对应目录的文件
- 修改 workflow 文件本身

---

## 常用命令

### 查看 PM2 状态

```bash
ssh root@your-server "pm2 status"
```

输出示例：
```
┌─────┬─────────────┬─────────────┬─────────┐
│ id  │ name        │ status      │ cpu/mem │
├─────┼─────────────┼─────────────┼─────────┤
│ 0   │ qzt-backend │ online      │ 1% 300MB│
│ 1   │ qzt-backend │ online      │ 1% 280MB│
│ 2   │ qzt-website │ online      │ 0% 200MB│
└─────┴─────────────┴─────────────┴─────────┘
```

### 查看日志

```bash
# 后端日志
ssh root@your-server "pm2 logs qzt-backend"

# 网站日志
ssh root@your-server "pm2 logs qzt-website"

# 实时日志
ssh root@your-server "pm2 logs qzt-backend --lines 100"
```

### 重启服务

```bash
# 重启后端
ssh root@your-server "pm2 restart qzt-backend"

# 重启网站
ssh root@your-server "pm2 restart qzt-website"

# 重启所有
ssh root@your-server "pm2 restart all"
```

### 查看 Nginx 日志

```bash
# 访问日志
ssh root@your-server "tail -f /var/log/nginx/website-access.log"
ssh root@your-server "tail -f /var/log/nginx/frontend-access.log"

# 错误日志
ssh root@your-server "tail -f /var/log/nginx/website-error.log"
ssh root@your-server "tail -f /var/log/nginx/frontend-error.log"
```

### Redis 操作

```bash
# 测试 Redis 连接
ssh root@your-server "redis-cli ping"

# 清空 Redis 缓存（谨慎操作）
ssh root@your-server "redis-cli FLUSHALL"

# 查看 Redis 信息
ssh root@your-server "redis-cli INFO"
```

---

## 故障排查

### 问题 1：网站无法访问

```bash
# 检查 Nginx 是否运行
ssh root@your-server "systemctl status nginx"

# 检查 PM2 状态
ssh root@your-server "pm2 status"

# 检查端口监听
ssh root@your-server "ss -tlnp | grep -E '7890|5180|80|443'"
```

### 问题 2：部署后 502 错误

```bash
# 检查后端日志
ssh root@your-server "pm2 logs qzt-backend --lines 50"

# 检查数据库连接
ssh root@your-server "mysql -h mysql-server-ip -u username -p -e 'SELECT 1'"
```

### 问题 3：SSL 证书错误

```bash
# 检查证书文件
ssh root@your-server "ls -la /etc/nginx/ssl/"

# 检查证书有效期
ssh root@your-server "openssl x509 -in /etc/nginx/ssl/devlovecode.com.crt -noout -dates"

# 续期证书
ssh root@your-server "certbot renew"
```

### 问题 4：GitHub Actions 部署失败

1. 检查 Secrets 是否配置正确
2. 检查服务器 SSH 密钥是否添加
3. 查看 Actions 日志中的具体错误
4. 确认服务器防火墙允许 SSH 连接

```bash
# 本地测试 SSH 连接
ssh -i ~/.ssh/github-actions-qzt root@your-server
```

### 问题 5：数据库连接失败

```bash
# 检查防火墙
ssh root@your-server "ufw status"

# 从服务器测试 MySQL 连接
ssh root@your-server "mysql -h mysql-server-ip -P 3306 -u username -p"

# 检查后端 .env 配置
ssh root@your-server "cat /var/www/qzt/backend/.env"
```

### 问题 6：Redis 连接问题

```bash
# 检查 Redis 状态
ssh root@your-server "systemctl status redis-server"

# 测试 Redis
ssh root@your-server "redis-cli ping"

# 检查 Redis 配置
ssh root@your-server "grep '^bind' /etc/redis/redis.conf"
```

---

## 健康检查

部署完成后，验证服务是否正常：

```bash
# 检查网站
curl https://devlovecode.com/health
curl https://devlovecode.com

# 检查前端
curl https://admin.devlovecode.com/health
curl https://admin.devlovecode.com

# 检查 API (需要认证)
curl https://admin.devlovecode.com/api/health
```

预期响应：
```json
healthy
```

---

## 更新日志

- 2025-02-12: 创建 Ubuntu 版部署指南
- 支持 Ubuntu 22.04/24.04 裸机部署 + GitHub Actions 自动化
