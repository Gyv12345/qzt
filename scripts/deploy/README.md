# 企智通 (QZT) 裸机部署指南

> 在 Linux 服务器上直接运行服务，使用 PM2 管理 Node.js 进程

---

## 部署架构

```
┌───────────────────────────────────────────────────┐
│                   Linux 服务器                      │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │   Nginx      │  │   PM2        │                 │
│  │  :80/:443   │  │  (进程管理)   │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         │                │                        │
│         │    ┌───────────┴────────────┐          │
│         │    │                        │          │
│         │    │  Backend (2实例)          │          │
│         │    │  Website (1实例)          │          │
│         │    └────────────────────────┘          │
│         │                                        │
│  ┌──────┴───────────┐  ┌──────────┐             │
│  │     Redis        │  │   MySQL   │ (RDS)       │
│  │     :6379        │  │   :3306   │             │
│  └──────────────────┘  └──────────┘             │
└───────────────────────────────────────────────┘
```

---

## 前置要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | 22 LTS | 后端运行时 |
| pnpm | >= 8 | 包管理器 |
| Redis | 6+ | 缓存和会话 |
| MySQL | 8.0+ | 数据库 |
| Nginx | 1.18+ | Web 服务器 |

**服务器配置**：建议 2C4G 或更高

---

## 快速开始

### 从空服务器开始部署

```bash
# 1. 一键初始化并部署
bash <(curl -fsSL https://raw.githubusercontent.com/Gyv12345/qzt/main/scripts/deploy/init-server.sh)

# 脚本会自动：
# - 安装 Git
# - 下载项目到 /opt/qzt/qzt
# - 询问部署方式（裸机 / Docker）
```

### 已有项目的情况

```bash
# 1. 进入项目目录
cd /opt/qzt/qzt

# 2. 运行裸机部署脚本
bash scripts/deploy/bare-metal-deploy.sh

# 3. 配置环境变量
vim /opt/qzt/qzt/backend/.env

# 4. 运行服务部署
bash scripts/deploy/server-deploy.sh
```

---

## 脚本功能说明

### init-server.sh - 服务器初始化

从空服务器开始，完成以下步骤：

1. **检查操作系统** - 支持 Ubuntu/Debian/CentOS/RHEL/Alibaba Cloud Linux
2. **安装 Git** - 用于下载项目代码
3. **下载项目** - 克隆到 `/opt/qzt/qzt`
4. **询问部署方式** - 选择裸机部署或 Docker 部署

### bare-metal-deploy.sh - 裸机部署

自动安装和配置：

| 组件 | 安装内容 |
|------|----------|
| Node.js | 22.14.0（使用阿里云镜像） |
| pnpm | 通过 npm 安装 |
| PM2 | 进程管理器 |
| Redis | CentOS/RHEL 使用 valkey，其他使用 redis |
| Nginx | Web 服务器 |

### server-deploy.sh - 服务部署

- 检查环境变量文件
- 运行数据库迁移
- 配置 Nginx
- 启动 PM2 服务

---

## 手动配置步骤

### 1. 安装 Node.js 22

```bash
# 下载并安装 Node.js 22
NODE_VERSION="22.14.0"
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
    ARCH_SUFFIX="x64"
elif [ "$ARCH" = "aarch64" ]; then
    ARCH_SUFFIX="arm64"
fi

curl -fsSL --retry 3 \
    "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH_SUFFIX}.tar.xz" \
    -o /tmp/node.tar.xz

tar -xf /tmp/node.tar.xz -C /usr/local --strip-components=1
npm config set registry https://registry.npmmirror.com

# 验证安装
node -v  # 应显示 v22.14.0
```

### 2. 安装 pnpm 和 PM2

```bash
# 安装 pnpm
npm install -g pnpm

# 安装 PM2
npm install -g pm2

# 验证安装
pnpm -v
pm2 -v
```

### 3. 安装 Redis

```bash
# Ubuntu/Debian
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# CentOS/RHEL (8+)
yum install -y valkey  # 或 redis
systemctl enable redis
systemctl start redis
```

### 4. 安装 Nginx

```bash
# Ubuntu/Debian
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# CentOS/RHEL
yum install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 5. 配置环境变量

创建 `/opt/qzt/qzt/backend/.env`：

```bash
# === 数据库配置 ===
DATABASE_PROVIDER=mysql
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=qzt_db

# === Redis 配置 ===
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# === JWT 配置 ===
JWT_SECRET=$(openssl rand -hex 32)

# === 域名配置 ===
DOMAIN_NAME=yourdomain.com
ADMIN_DOMAIN=admin.yourdomain.com
```

### 6. 安装依赖并启动

```bash
# 进入后端目录
cd /opt/qzt/qzt/backend

# 安装依赖
pnpm install

# 生成 Prisma Client
pnpm prisma generate

# 运行数据库迁移
pnpm prisma db push

# 启动后端
pm2 start pm2.config.cjs

# 保存 PM2 进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### 7. 配置 SSL 证书

```bash
# 运行 SSL 配置脚本
bash scripts/deploy/setup-ssl.sh
```

**SSL 证书选项**：

| 选项 | 说明 | 适用场景 |
|------|------|----------|
| 1 | 自签名证书 | 快速测试 |
| 2 | 上传证书 | 已有证书 |
| 3 | Let's Encrypt | 自动申请（支持泛域名） |

---

## 服务管理

### PM2 命令

```bash
# 查看服务状态
pm2 status

# 实时监控
pm2 monit

# 查看日志
pm2 logs qzt-backend
pm2 logs qzt-website

# 重启服务
pm2 restart qzt-backend
pm2 restart qzt-website

# 停止服务
pm2 stop qzt-backend
pm2 stop qzt-website

# 重载配置（零停机）
pm2 reload qzt-backend
```

### 系统服务

```bash
# Nginx 状态
systemctl status nginx

# 重启 Nginx
systemctl reload nginx

# Redis 状态
systemctl status redis-server
systemctl status redis
```

---

## 日志管理

### 日志位置

| 服务 | 日志路径 |
|------|----------|
| 后端应用 | `/opt/qzt/qzt/backend/logs/` |
| 网站应用 | `/opt/qzt/qzt/website/logs/` |
| Nginx 主站 | `/var/log/nginx/域名-access.log` |
| Nginx 错误 | `/var/log/nginx/error.log` |

### 查看实时日志

```bash
# 后端日志
pm2 logs qzt-backend -f

# 网站日志
pm2 logs qzt-website -f

# Nginx 访问日志
tail -f /var/log/nginx/access.log
```

---

## HTTPS 配置

### 使用 setup-ssl.sh 配置证书

```bash
cd /opt/qzt/qzt
bash scripts/deploy/setup-ssl.sh
```

**支持的证书类型**：

1. **自签名证书** - 快速测试，浏览器会警告
2. **上传证书** - 使用已有的 `.crt` 和 `.key` 文件
3. **Let's Encrypt** - 自动申请免费证书

**泛域名证书申请**：

```bash
# 脚本会询问是否需要泛域名证书 (*.domain.com)
# 选择 DNS 服务商并按提示完成验证

# 自动续期已配置 cron 任务
crontab -l
# 0 0,12 * * * certbot renew --quiet --deploy-hook 'nginx -s reload'
```

---

## 常见问题

### 1. PM2 服务未自动重启

```bash
# 保存 PM2 进程列表
pm2 save

# 设置开机自启
pm2 startup
# 按提示执行输出的命令
```

### 2. 内存溢出 (OOM)

```bash
# 检查内存使用
free -h

# 调整 PM2 内存限制
vim /opt/qzt/qzt/backend/pm2.config.cjs
# 修改 max_memory_restart 值
```

### 3. 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep -E '80|443|7890|5180|3306|6379'
```

### 4. Nginx 502 错误

```bash
# 检查 Backend 是否运行
pm2 status qzt-backend

# 检查端口监听
netstat -tlnp | grep 7890

# 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log
```

### 5. Redis 连接失败

```bash
# 检查 Redis 状态
systemctl status redis

# 检查 Redis 密码（保存在 /root/.redis_password）
cat /root/.redis_password

# 测试连接
redis-cli
AUTH your_password
PING
```

---

## 更新部署

### 通过 GitHub Actions（推荐）

```bash
git push origin main
```

### 手动更新

```bash
cd /opt/qzt/qzt
git pull origin main

# 更新后端
cd backend
pnpm install --prod
pnpm prisma generate
pm2 restart qzt-backend

# 更新网站
cd website
pnpm build
pm2 restart qzt-website
```

---

## 安全建议

1. ✅ **定期更新系统**：`apt-get update && apt-get upgrade`
2. ✅ **配置防火墙**：仅开放必要端口（80, 443, 22）
3. ✅ **使用强密码**：数据库、Redis、JWT 密钥
4. ✅ **启用 HTTPS**：使用 SSL 证书
5. ✅ **配置 fail2ban**：防止 SSH 暴力破解
6. ✅ **定期备份**：数据库和重要文件

---

## 故障恢复

### Backend 崩溃

```bash
# 查看崩溃日志
pm2 logs qzt-backend --lines 100

# 重启服务
pm2 restart qzt-backend

# 持续崩溃时检查内存
pm2 monit
```

### 数据库连接失败

```bash
# 测试连接
mysql -h your_host -u your_user -p

# 检查 .env 配置
cat /opt/qzt/qzt/backend/.env | grep DB_
```

---

## 性能优化

### PM2 集群模式

```javascript
// backend/pm2.config.cjs
module.exports = {
  apps: [{
    name: 'qzt-backend',
    instances: 2,              // 根据 CPU 核心数调整
    max_memory_restart: '1G',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 7890,
    },
  }],
}
```

### Redis 优化

```bash
# 编辑 Redis 配置
vim /etc/redis/redis.conf

# 设置最大内存
maxmemory 256mb
maxmemory-policy allkeys-lru

# 重启 Redis
systemctl restart redis
```

---

## 技术支持

如遇部署问题，请检查：
1. PM2 日志：`pm2 logs`
2. Nginx 日志：`/var/log/nginx/error.log`
3. 系统日志：`journalctl -xe`
