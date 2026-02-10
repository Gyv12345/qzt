# 企智通 (QZT) 裸机部署指南

## 部署架构

- **ECS**: 2C4G（阿里云 ECS）
- **RDS**: MySQL 8.0, 2C2G, 最大连接数 1000
- **服务**: Backend (NestJS + PM2), Frontend (Nginx), Website (Next.js + PM2)

---

## 资源分配

| 服务 | 内存限制 | 说明 |
|------|----------|------|
| **Backend** | 700MB × 2 = 1.4GB | PM2 集群 2 实例 |
| **Website** | 500MB | Next.js SSR |
| **Frontend** | ~50MB | Nginx 静态托管 |
| **系统预留** | ~1.5GB | OS + Nginx + 缓冲 |
| **总计** | ~3.4GB / 4GB | 留有余量 |

**数据库连接分配**：
- Backend: 40 个连接（2 实例 × 20）
- 剩余: 960 个连接（RDS 总共 1000）

---

## 快速部署

### 1. 服务器初始化（只需运行一次）

```bash
# 一键安装依赖（支持 Ubuntu/Debian/CentOS/RHEL）
curl -fsSL https://raw.githubusercontent.com/Gyv12345/qzt/main/scripts/deploy/init-server.sh | bash
```

**初始化脚本会**：
- 安装 Node.js 20, pnpm, PM2
- 安装 Redis, Nginx
- 配置防火墙
- 创建目录结构 `/opt/qzt/{backend,frontend,website}`
- 生成 SSH 密钥
- **自动生成 Redis 密码**（保存到 `/root/.redis_password`）
- **自动生成 JWT 密钥**
- 创建环境变量文件 `/opt/qzt/backend/.env`

### 2. 配置环境变量

```bash
ssh root@你的服务器IP
vim /opt/qzt/backend/.env
```

**必填配置**（只需修改数据库和域名部分）：
```bash
# === 数据库（2C2G RDS）===
DATABASE_PROVIDER=mysql
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com  # 改成你的 RDS 地址
DB_PORT=3306
DB_USERNAME=你的数据库用户名            # 改成你的用户名
DB_PASSWORD=你的数据库密码              # 改成你的密码
DB_DATABASE=数据库名                    # 改成数据库名（会自动创建）

# === Redis（已自动生成，无需修改）===
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=自动生成的密码

# === JWT（已自动生成，无需修改）===
JWT_SECRET=自动生成的密钥

# === 域名 ===
DOMAIN_NAME=yourdomain.com              # 改成你的域名
ADMIN_DOMAIN=admin.yourdomain.com       # 改成 admin.你的域名
```

**配置说明**：
| 配置项 | 是否自动生成 | 说明 |
|--------|-------------|------|
| `DB_DATABASE` | ❌ | 数据库名，**会自动创建**（确保数据库用户有 CREATE 权限） |
| `REDIS_PASSWORD` | ✅ | 自动生成，保存在 `/root/.redis_password` |
| `JWT_SECRET` | ✅ | 自动生成，用于签名 JWT Token |
| `DOMAIN_NAME` | ❌ | 需手动填写主域名 |
| `ADMIN_DOMAIN` | ❌ | 需手动填写管理后台域名 |

**修改密码的方法**：
```bash
# 修改 Redis 密码
echo "新密码" > /root/.redis_password
# 然后更新 .env 中的 REDIS_PASSWORD

# 重新生成 JWT 密钥
openssl rand -hex 32
# 将结果填入 .env 的 JWT_SECRET
```

### 3. 配置 GitHub Actions（自动化部署）

在仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 说明 |
|--------|------|
| `SERVER_HOST` | 服务器 IP |
| `SERVER_USER` | 用户名（通常是 root） |
| `SSH_PRIVATE_KEY` | 服务器私钥（`cat ~/.ssh/id_rsa`） |
| `SSH_PORT` | SSH 端口（默认 22） |

### 4. 触发部署

```bash
git push origin main
```

GitHub Actions 会自动：
1. 构建 Backend, Frontend, Website
2. 通过 SSH 上传到服务器
3. 重启 PM2 服务
4. 重新加载 Nginx

---

## 手动部署

如果 GitHub Actions 不可用，可手动部署：

### Backend

```bash
# 在服务器上
cd /opt/qzt/backend
pnpm install --prod
pnpm prisma generate
pnpm prisma db push  # 首次部署时执行
pm2 start pm2.config.cjs
pm2 save
```

### Frontend

```bash
# 本地构建
cd frontend
pnpm build
scp -r dist/* root@服务器:/var/www/qzt/

# 服务器上 Nginx 已配置好，无需额外操作
```

### Website

```bash
# 在服务器上
cd /opt/qzt/website
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 验证步骤

### 1. 检查服务状态

```bash
# PM2 状态
pm2 status
pm2 monit

# 预期输出：
# ┌─────┬─────────────┬───────────┬─────────┐
# │ id  │ name        │ status    │ memory  │
# ├─────┼─────────────┼───────────┼─────────┤
# │ 0   │ qzt-backend │ online    │ 650MB   │
# │ 1   │ qzt-backend │ online    │ 640MB   │
# │ 2   │ qzt-website │ online    │ 420MB   │
# └─────┴─────────────┴───────────┴─────────┘
```

### 2. 健康检查

```bash
# Backend 健康检查
curl http://localhost:7890/health

# Website
curl http://localhost:5180

# Nginx
curl http://localhost
```

### 3. 数据库连接数

在 RDS 控制台查看当前连接数，应在 **40 以内**。

---

## PM2 配置说明

### Backend (`backend/pm2.config.cjs`)

```javascript
{
  instances: 2,              // 2C4G 用 2 个实例
  max_memory_restart: '700M', // 2实例 × 700MB = 1.4GB
  env: {
    NODE_OPTIONS: '--max-old-space-size=640', // 堆内存限制
  },
  cron_restart: '0 3 * * *', // 每天凌晨 3 点重启
}
```

### Website (`website/ecosystem.config.cjs`)

```javascript
{
  instances: 1,              // SSR 不适合多实例
  max_memory_restart: '500M',
  env: {
    NODE_OPTIONS: '--max-old-space-size=448',
  },
  cron_restart: '0 3 * * *',
}
```

---

## Prisma 连接池配置

适配 **2C2G RDS**（最大连接数 1000）：

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")

  // 2 个 PM2 实例 × 20 = 40 总连接
  connection_limit = 20
  pool_timeout      = 30
}
```

---

## 日志管理

```bash
# 查看实时日志
pm2 logs qzt-backend
pm2 logs qzt-website

# 日志文件位置
backend/logs/pm2-error.log
backend/logs/pm2-out.log
website/logs/pm2-error.log
website/logs/pm2-out.log

# 日志轮转：每个文件最大 10MB
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

# 如果持续 OOM，可降低 max_memory_restart
# backend: 700M → 600M
# website: 500M → 400M
```

### 3. 数据库连接过多

```bash
# 检查当前连接数
# 在 RDS 控制台查看

# 如需减少连接，修改 schema.prisma 的 connection_limit
# 重新生成 Prisma Client
cd backend && pnpm prisma generate
pm2 restart qzt-backend
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

---

## 性能监控

### 推荐工具

- **PM2 Plus**: https://app.keymetrics.io/
- **阿里云云监控**: ECS + RDS 监控面板
- **Grafana + Prometheus**: 自建监控

### 监控指标

| 指标 | 预警阈值 |
|------|----------|
| CPU 使用率 | > 80% |
| 内存使用率 | > 85% |
| RDS 连接数 | > 50 |
| API 响应时间 | > 1s |

---

## 深度优化（可选）

当前配置已满足 2C4G + 2C2G RDS 的基本需求。如需进一步优化：

### 1. 增加 PM2 实例数

如果 CPU 利用率低（< 50%）：
```javascript
// backend/pm2.config.cjs
instances: 4,  // 从 2 增加到 4
```

### 2. 启用 Redis 缓存

```bash
# .env 已配置 Redis，确保启用
REDIS_ENABLED=true
```

### 3. 日志聚合

使用阿里云 SLS 收集日志：
```bash
# 安装 Logtail
# 配置日志路径：/opt/qzt/*/logs/*.log
```

### 4. CDN 加速

静态资源（Frontend build）可通过 CDN 加速。

---

## 备份策略

### 数据库备份

- RDS 自动备份：默认开启，保留 7 天
- 手动备份：在 RDS 控制台创建快照

### 文件备份

```bash
# 备份环境变量
cp /opt/qzt/backend/.env /opt/qzt-backup/.env.$(date +%Y%m%d)

# 备份 PM2 配置
pm2 save
cp ~/.pm2/dump.pm2 /opt/qzt-backup/dump.pm2.$(date +%Y%m%d)
```

---

## 升级部署

```bash
# 方式1: GitHub Actions（推荐）
git push origin main

# 方式2: 手动升级
cd /opt/qzt/backend
git pull
pnpm install --prod
pnpm prisma generate
pm2 restart qzt-backend

cd /opt/qzt/website
git pull
pnpm build
pm2 restart qzt-website
```

---

## 故障恢复

### Backend 崩溃

```bash
# 查看崩溃日志
pm2 logs qzt-backend --lines 100

# 重启
pm2 restart qzt-backend

# 如果持续崩溃，检查内存
pm2 monit
```

### RDS 连接失败

```bash
# 测试连接
mysql -h rm-xxxxx.mysql.rds.aliyuncs.com -u 用户名 -p

# 检查安全组白名单
# 确保服务器 IP 在 RDS 白名单中
```

---

## 安全建议

1. **定期更新系统**: `yum update -y` 或 `apt-get update -y`
2. **配置 fail2ban**: 防止 SSH 暴力破解
3. **使用强密码**: 数据库、Redis、JWT 密钥
4. **启用 HTTPS**: 配置 SSL 证书（Let's Encrypt 或购买）
5. **限制 SSH 访问**: 仅允许特定 IP 或密钥登录

---

## 联系支持

如遇部署问题，请检查：
1. GitHub Actions 运行日志
2. PM2 日志：`pm2 logs`
3. Nginx 日志：`/var/log/nginx/error.log`
