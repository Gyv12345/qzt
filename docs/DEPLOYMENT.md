# 企智通 QZT - 生产环境部署文档

## 目录

- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [详细步骤](#详细步骤)
- [GitHub 配置](#github-配置)
- [常见问题](#常见问题)
- [无域名开发场景](#无域名开发场景)

---

## 系统要求

### 服务器

- **操作系统**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / AlmaLinux 8+
- **CPU**: 2 核或以上
- **内存**: 4GB 或以上
- **磁盘**: 20GB 或以上
- **网络**: 公网 IP，开放 80/443 端口

### 外部服务

- MySQL RDS（或其他托管 MySQL）
- 域名（生产环境推荐，开发环境可选）

---

## 部署场景

| 场景 | 域名 | SSL 证书 | 适用 |
|------|------|----------|------|
| **生产环境** | 有 | 正式证书 / Let's Encrypt | 正式上线 |
| **开发测试** | 无 | 自签名证书 | 开发调试 |
| **演示环境** | IP 地址 | 自签名证书 | 客户演示 |

---

## 快速开始

### 选择部署模式

| 模式 | 域名要求 | SSL 证书 | 访问方式 |
|------|---------|----------|----------|
| **生产模式** | 有域名 | Let's Encrypt / 正式证书 | `https://domain.com` |
| **开发模式** | 无 | 自签名证书 | `https://IP地址` |

### 第一步：服务器初始化

```bash
# 下载并运行初始化脚本
curl -fsSL https://raw.githubusercontent.com/你的用户名/qzt/main/scripts/deploy/init-server.sh | bash
```

### 第二步：配置环境变量

```bash
vim /opt/qzt/backend/.env
```

**生产模式**（有域名）：
```bash
DOMAIN_NAME=yourdomain.com
ADMIN_DOMAIN=admin.yourdomain.com
APP_URL=https://yourdomain.com
API_URL=https://yourdomain.com/api
FRONTEND_URL=https://admin.yourdomain.com
```

**开发模式**（无域名/IP 访问）：
```bash
DOMAIN_NAME=123.456.789.0        # 服务器 IP
ADMIN_DOMAIN=123.456.789.0        # 同上
APP_URL=https://123.456.789.0
API_URL=https://123.456.789.0/api
FRONTEND_URL=https://123.456.789.0
```

**必填配置**：
```bash
# 数据库
DATABASE_URL="mysql://用户名:密码@RDS地址:3306/数据库名"

# Redis（密码在 /root/.redis_password）
REDIS_PASSWORD=

# JWT（用 openssl rand -hex 32 生成）
JWT_SECRET=
```

### 第三步：配置 SSL 证书

```bash
bash /opt/qzt/scripts/deploy/setup-ssl.sh
```

| 选项 | 适用场景 | 浏览器警告 |
|------|---------|-----------|
| `1` 自签名 | 开发测试、无域名 | 有（可忽略） |
| `2` 上传证书 | 已有证书文件 | 无 |
| `3` Let's Encrypt | 有域名、已解析 | 无 |

### 第四步：配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

| Secret | 说明 | 示例 |
|--------|------|------|
| `SERVER_HOST` | 服务器 IP | `123.456.789.0` |
| `SERVER_USER` | SSH 用户名 | `root` |
| `SSH_PRIVATE_KEY` | SSH 私钥 | 见下方说明 |
| `SSH_PORT` | SSH 端口 | `22` |

**获取 SSH 私钥**（服务器上执行）：

```bash
cat ~/.ssh/id_ed25519
```

### 第五步：触发部署

```bash
# 推送代码到 main 分支
git push origin main
```

或在 GitHub: **Actions** → **Deploy to Production** → **Run workflow**

---

## 详细步骤

### 1. 服务器初始化

脚本会自动检测系统类型并安装相应依赖：

**支持系统**：
- Ubuntu / Debian
- CentOS / AlmaLinux / Rocky Linux
- Fedora

**安装内容**：
- Node.js 20
- pnpm
- PM2
- Redis
- Nginx
- 防火墙配置

### 2. 环境变量配置

完整的环境变量示例：

```bash
# ============================================
# 必填配置
# ============================================
DATABASE_URL="mysql://qzt_user:password@rm-xxx.mysql.rds.aliyuncs.com:3306/qzt_prod"
REDIS_PASSWORD="从 /root/.redis_password 获取"
JWT_SECRET="用 openssl rand -hex 32 生成"

DOMAIN_NAME="example.com"
ADMIN_DOMAIN="admin.example.com"

APP_URL="https://example.com"
API_URL="https://example.com/api"
FRONTEND_URL="https://admin.example.com"

# ============================================
# 可选配置
# ============================================
# 阿里云 OSS
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-key-id"
OSS_ACCESS_KEY_SECRET="your-key-secret"
OSS_BUCKET="your-bucket"

# e签宝
ESIGN_APP_ID="your-app-id"
ESIGN_APP_SECRET="your-app-secret"
```

### 3. SSL 证书配置

**方案一：自签名证书**（快速测试）
```bash
# 自动生成，浏览器会警告
bash /opt/qzt/scripts/deploy/setup-ssl.sh
# 选择 1
```

**方案二：上传证书**（已有证书）
```bash
bash /opt/qzt/scripts/deploy/setup-ssl.sh
# 选择 2，然后粘贴证书和私钥
```

**方案三：Let's Encrypt**（免费 CA）
```bash
# 前提：域名已解析到服务器
bash /opt/qzt/scripts/deploy/setup-ssl.sh
# 选择 3
```

### 4. GitHub Secrets 配置

1. 打开 GitHub 仓库
2. **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**

添加以下 Secrets：

| Name | Value |
|------|-------|
| `SERVER_HOST` | 服务器 IP 地址 |
| `SERVER_USER` | `root`（或其他用户） |
| `SSH_PRIVATE_KEY` | 服务器私钥内容 |
| `SSH_PORT` | `22`（或其他端口） |

**获取私钥**（在服务器上）：
```bash
cat ~/.ssh/id_ed25519
```

复制完整输出，包括 `-----BEGIN OPENSSH PRIVATE KEY-----` 和 `-----END OPENSSH PRIVATE KEY-----`

**添加公钥到服务器**（如果还没配置）：
```bash
# 在服务器上
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
```

---

## 部署流程

### 自动部署

推送代码到 `main` 分支自动触发：

```bash
git add .
git commit -m "feat: 新功能"
git push origin main
```

### 手动部署

1. 打开 GitHub 仓库
2. **Actions** 标签页
3. 选择 **Deploy to Production**
4. 点击 **Run workflow** → **Run workflow**

### 查看部署状态

在 GitHub Actions 页面查看实时日志。

---

## 常见问题

### Q1: 脚本提示 "command not found"

**原因**: 系统缺少基础工具

**解决**:
```bash
# Ubuntu/Debian
apt-get update && apt-get install -y curl wget git

# CentOS/RHEL
yum install -y curl wget git
```

### Q2: Node.js 安装失败

**原因**: 网络问题

**解决**: 脚本已使用国内镜像，如果仍失败可手动安装：

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
```

### Q3: PM2 无法开机自启

**解决**:
```bash
pm2 unstartup
pm2 startup
# 按提示执行输出的命令
pm2 save
```

### Q4: SSL 证书申请失败

**原因**: 域名未解析或 80 端口未开放

**解决**:
```bash
# 检查域名解析
ping yourdomain.com

# 检查防火墙
ufw status

# 确保 80 端口开放
ufw allow 80/tcp
```

### Q5: 部署后无法访问

**排查步骤**:
```bash
# 1. 检查服务状态
pm2 status

# 2. 检查 Nginx 状态
systemctl status nginx

# 3. 检查端口监听
netstat -tlnp | grep -E '80|443|7890|5180'

# 4. 查看日志
pm2 logs
tail -f /var/log/nginx/*.log
```

### Q6: 数据库连接失败

**检查**:
```bash
# 测试 RDS 连接
mysql -h 你的RDS地址 -u 用户名 -p

# 检查防火墙是否放行数据库端口
# （如果是阿里云 RDS，需要在控制台添加白名单）
```

---

## 维护命令

### 服务管理

```bash
# PM2
pm2 list                  # 查看所有服务
pm2 logs qzt-backend      # 查看后端日志
pm2 logs qzt-website      # 查看网站日志
pm2 restart all           # 重启所有服务
pm2 reload qzt-backend    # 零停机重载
pm2 monit                 # 监控面板

# Nginx
nginx -t                  # 测试配置
systemctl reload nginx    # 重载配置
systemctl status nginx    # 查看状态

# Redis
redis-cli                 # 连接 Redis
AUTH "你的密码"            # 认证
INFO                      # 查看信息
```

### 日志查看

```bash
# 应用日志
pm2 logs

# Nginx 日志
tail -f /var/log/nginx/domain.com-access.log
tail -f /var/log/nginx/domain.com-error.log

# 系统日志
journalctl -u nginx -f
journalctl -u redis-server -f
```

### 更新部署

```bash
# 只需推送代码
git push origin main

# 或手动触发
# GitHub Actions → Run workflow
```

### 回滚版本

```bash
# 查看备份
ls -la /opt/qzt-backup/

# 回滚到指定版本
cp -r /opt/qzt-backup/20250108_120000/dist /opt/qzt/backend/
pm2 reload qzt-backend
```

---

## 目录结构

### 服务器文件布局

```
/opt/qzt/                      # 应用目录
├── backend/
│   ├── dist/                  # 后端编译产物
│   ├── node_modules/          # 生产依赖
│   ├── ecosystem.config.cjs   # PM2 配置
│   └── .env                   # 环境变量
├── website/
│   ├── .next/                 # Next.js 产物
│   └── public/                # 静态资源
└── config/                    # 配置文件

/var/www/qzt/                  # 前端静态文件
└── frontend/
    └── dist/

/opt/qzt-backup/               # 版本备份
/opt/qzt-deploy/               # 临时部署目录
```

---

## 安全建议

1. **SSH 密钥**: 使用密钥登录，禁用密码登录
2. **防火墙**: 只开放必要端口（22, 80, 443）
3. **更新**: 定期更新系统补丁
4. **备份**: 定期备份数据库
5. **监控**: 配置日志监控和告警

```bash
# 禁用 SSH 密码登录
vim /etc/ssh/sshd_config
# 设置: PasswordAuthentication no
systemctl restart sshd
```

---

## 无域名开发场景

### 使用场景

- 本地开发测试
- 客户演示环境
- 临时调试环境

### 配置方式

**环境变量配置**（`/opt/qzt/backend/.env`）：

```bash
# 使用 IP 地址代替域名
DOMAIN_NAME=你的服务器IP
ADMIN_DOMAIN=你的服务器IP

# 或者使用任意自定义域名（仅本地测试）
DOMAIN_NAME=local.test
ADMIN_DOMAIN=admin.local.test
```

### 访问方式

```bash
# 使用 IP + 端口直接访问
http://你的服务器IP:80          # 网站
https://你的服务器IP           # 网站（SSL）
http://你的服务器IP:80          # 管理后台
https://你的服务器IP           # 管理后台（SSL）
```

### SSL 证书选择

```bash
bash /opt/qzt/scripts/deploy/setup-ssl.sh
# 选择 1) 自签名证书
```

**浏览器警告处理**：
- Chrome: 点击「高级」→「继续访问」
- Firefox: 点击「高级」→「接受风险并继续」

### 本地 Hosts 映射（可选）

如果想用自定义域名，在本地电脑修改 hosts：

**Windows**:
```
C:\Windows\System32\drivers\etc\hosts
```

**Mac/Linux**:
```
/etc/hosts
```

添加：
```
你的服务器IP  local.test
你的服务器IP  admin.local.test
```

然后可以用 `http://local.test` 访问。

### API 调用说明

使用自签名证书时，API 请求需要忽略证书错误：

```bash
# curl
curl -k https://你的服务器IP/api/xxx

# axios
axios.get('https://你的服务器IP/api/xxx', { httpsAgent: new https.Agent({ rejectUnauthorized: false }) })
```

---

## 软件安装位置

### Node.js / pnpm

| 项目 | 位置 | 说明 |
|------|------|------|
| Node.js | `/usr/local/bin/node` | 二进制文件 |
| npm | `/usr/local/bin/npm` | 包管理器 |
| pnpm | 通过 Corepack 管理 | 自动管理版本 |
| PM2 | `/usr/local/lib/node_modules/pm2` | 全局安装 |

### Redis

| 项目 | 位置 |
|------|------|
| 可执行文件 | `/usr/bin/redis-server` |
| 配置文件 | `/etc/redis/redis.conf` |
| 数据目录 | `/var/lib/redis` |
| 日志文件 | `/var/log/redis/redis-server.log` |
| 密码文件 | `/root/.redis_password` |

### Nginx

| 项目 | 位置 |
|------|------|
| 可执行文件 | `/usr/sbin/nginx` |
| 主配置 | `/etc/nginx/nginx.conf` |
| 站点配置 | `/etc/nginx/conf.d/*.conf` |
| SSL 配置 | `/etc/nginx/conf.d/ssl.conf` |
| 证书目录 | `/etc/nginx/ssl/域名/` |
| 日志目录 | `/var/log/nginx/` |
| 静态文件 | `/var/www/qzt/frontend/` |

### 应用

| 项目 | 位置 |
|------|------|
| 后端代码 | `/opt/qzt/backend/` |
| 后端日志 | `/opt/qzt/backend/logs/` |
| 网站代码 | `/opt/qzt/website/` |
| 环境变量 | `/opt/qzt/backend/.env` |
| PM2 配置 | `/opt/qzt/backend/ecosystem.config.cjs` |
| 备份目录 | `/opt/qzt-backup/` |

---

## 日志查看完整指南

### PM2 日志

```bash
# 查看所有日志
pm2 logs

# 查看特定服务
pm2 logs qzt-backend
pm2 logs qzt-website

# 实时查看
pm2 logs qzt-backend --lines 100

# 日志文件位置
tail -f /opt/qzt/backend/logs/pm2-combined.log
tail -f /opt/qzt/backend/logs/pm2-error.log
tail -f /opt/qzt/backend/logs/pm2-out.log
```

### Nginx 日志

```bash
# 查看所有日志
ls -la /var/log/nginx/

# 实时查看访问日志
tail -f /var/log/nginx/domain.com-access.log
tail -f /var/log/nginx/admin.domain.com-access.log

# 实时查看错误日志
tail -f /var/log/nginx/domain.com-error.log
tail -f /var/log/nginx/admin.domain.com-error.log

# 查看最近 100 行
tail -n 100 /var/log/nginx/*.log

# 搜索特定内容
grep "error" /var/log/nginx/*.log
```

### 系统服务日志

```bash
# Nginx 服务日志
journalctl -u nginx -f
journalctl -u nginx -n 50

# Redis 服务日志
journalctl -u redis-server -f
journalctl -u redis -n 50

# 查看所有服务状态
systemctl status nginx
systemctl status redis-server
```

### 日志轮转

日志自动轮转配置：

```bash
# PM2 日志轮转（保留 30 天）
cat /opt/qzt/config/logrotate/pm2

# Nginx 日志轮转（保留 30 天）
cat /etc/logrotate.d/nginx-custom

# 手动触发轮转
logrotate -f /etc/logrotate.d/nginx-custom
```


