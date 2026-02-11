# 企智通 (QZT) Docker 部署指南

> 使用 Docker Compose 一键部署企智通全栈应用

---

## 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Host                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │              qzt-network (bridge)                  │ │
│  │                                                    │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │  │ backend  │ │ frontend │ │ website  │          │ │
│  │  │  :7890   │ │ :80/:443 │ │  :5180   │          │ │
│  │  └──────────┘ └──────────┘ └──────────┘          │ │
│  │                                                    │ │
│  │  ┌──────────┐ ┌──────────┐                        │ │
│  │  │  Redis   │ │  MySQL   │ (RDS 可选)            │ │
│  │  │  :6379   │ │  :3306   │                        │ │
│  │  └──────────┘ └──────────┘                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                       │
│  Volumes:                                             │
│  - qzt-backend-logs (日志)                           │
│  - qzt-redis-data (Redis 持久化)                      │
│  - qzt-mysql-data (MySQL 持久化，本地版)             │
│                                                       │
│  Ports:                                               │
│  - 80 (HTTP) / 443 (HTTPS)                           │
│  - 7890 (API)                                         │
│  - 5180 (Website)                                     │
└───────────────────────────────────────────────────────┘
```

---

## 前置要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Docker | >= 20.10 | 容器运行时 |
| Docker Compose | >= 2.0 | 编排工具 |
| 服务器配置 | >= 2C2G | 推荐 2C4G |

**注意**：裸机服务器请先运行 `init-server.sh` 进行环境初始化。

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
cd /path/to/qzt

# 2. 运行部署脚本
bash scripts/deploy/docker-deploy.sh
```

---

## 部署脚本功能

`docker-deploy.sh` 会自动完成以下步骤：

### 1. 环境检查

- ✅ 检查 Docker 是否安装
- ✅ 未安装时自动安装（支持 Ubuntu/Debian/CentOS/RHEL）
- ✅ 配置阿里云镜像加速

### 2. 服务器配置检测

自动检测 CPU 和内存，根据配置分配资源：

| 配置 | Backend | Frontend | Website | Redis | MySQL |
|------|---------|----------|---------|-------|-------|
| 2C2G | 1C/512M | 0.5C/128M | 0.5C/256M | 0.5C/128M | 1C/512M |
| 2C4G | 1C/1G | 0.5C/256M | 0.5C/512M | 0.5C/256M | 1C/1G |
| 4C8G+ | 2C/2G | 1C/512M | 1C/1G | 1C/512M | 2C/2G |

### 3. 配置选项

如果 `.env` 文件不存在，会询问以下配置：

#### 数据库选择

```
请选择数据库配置方式：
  1) 使用阿里云 RDS MySQL（推荐）
  2) 使用本地 MySQL 容器
```

#### HTTPS/SSL 配置

```
请选择 SSL 证书方式：
  1) 不启用 HTTPS - 仅 HTTP（开发测试）
  2) 自签名证书 - 快速测试 HTTPS，浏览器会警告
  3) 上传证书 - 你已有 .crt 和 .key 文件
  4) Let's Encrypt - 自动申请免费证书（支持泛域名）
```

**Let's Encrypt 泛域名证书申请**：

| DNS 服务商 | 验证方式 | 说明 |
|-----------|----------|------|
| 阿里云 | DNS TXT 记录 | 手动添加验证记录 |
| 腾讯云 | DNSPod API | 需安装插件 |
| Cloudflare | API Token | 需配置 Token 文件 |
| 其他 | 手动验证 | 通用方式 |

**证书自动续期**：每天 00:00 和 12:00 自动续期并重启 frontend 容器

### 4. 环境变量生成

自动生成 `.env` 文件，包含：

```bash
# 数据库配置（RDS 或本地）
DB_HOST/DB_PASSWORD/DB_DATABASE

# Redis 配置
REDIS_PASSWORD

# JWT 密钥（自动生成）
JWT_SECRET

# 域名配置
DOMAIN_NAME
ADMIN_DOMAIN

# HTTPS 配置
ENABLE_HTTPS
SSL_CERT_PATH
SSL_KEY_PATH

# 资源限制
BACKEND_MEM_LIMIT
FRONTEND_MEM_LIMIT
...
```

### 5. 构建并启动

- 🔄 构建所有 Docker 镜像
- 🚀 启动所有服务容器
- ⏳ 等待服务健康检查通过

---

## 配置文件说明

### docker-compose.yml（本地 MySQL）

适用于没有 RDS 的场景，MySQL 运行在容器中。

### docker-compose.rds.yml（RDS 版本）

适用于有阿里云 RDS 的生产环境。

---

## 手动部署

如果不想使用自动部署脚本，可以手动配置：

### 1. 创建环境变量文件

```bash
# 复制模板（根据实际情况选择）
cp .env.example .env

# 编辑配置
vim .env
```

### 2. 配置 HTTPS 证书

```bash
# 证书存放位置
mkdir -p scripts/deploy/ssl

# 复制证书文件
cp your-cert.crt scripts/deploy/ssl/cert.pem
cp your-key.key scripts/deploy/ssl/key.pem
```

### 3. 启动服务

```bash
# 本地 MySQL 版本
docker compose -f scripts/deploy/docker-compose.yml up -d

# RDS 版本
docker compose -f scripts/deploy/docker-compose.rds.yml up -d
```

### 4. 初始化数据库

```bash
# 首次部署需要运行数据库迁移
docker compose -f scripts/deploy/docker-compose.yml exec backend npx prisma db push
```

---

## 服务管理

### 查看服务状态

```bash
# 查看所有服务
docker compose -f scripts/deploy/docker-compose.yml ps

# 查看资源使用
docker stats
```

### 查看日志

```bash
# 查看所有服务日志
docker compose -f scripts/deploy/docker-compose.yml logs -f

# 查看特定服务
docker compose -f scripts/deploy/docker-compose.yml logs -f backend
docker compose -f scripts/deploy/docker-compose.yml logs -f frontend
docker compose -f scripts/deploy/docker-compose.yml logs -f website
```

### 重启服务

```bash
# 重启所有服务
docker compose -f scripts/deploy/docker-compose.yml restart

# 重启单个服务
docker compose -f scripts/deploy/docker-compose.yml restart backend
docker compose -f scripts/deploy/docker-compose.yml restart frontend
```

### 停止服务

```bash
# 停止所有服务
docker compose -f scripts/deploy/docker-compose.yml stop

# 停止单个服务
docker compose -f scripts/deploy/docker-compose.yml stop backend
```

### 删除服务

```bash
# 停止并删除所有服务（保留数据卷）
docker compose -f scripts/deploy/docker-compose.yml down

# 停止并删除所有服务（包括数据卷）
docker compose -f scripts/deploy/docker-compose.yml down -v
```

---

## 数据持久化

### 数据卷

| 卷名 | 用途 |
|------|------|
| `qzt-backend-logs` | 后端日志 |
| `qzt-redis-data` | Redis 数据 |
| `qzt-mysql-data` | MySQL 数据（仅本地版本） |

### 备份数据

```bash
# 备份 MySQL
docker compose -f scripts/deploy/docker-compose.yml exec mysql mysqldump -u root -p qzt_db > backup.sql

# 备份 Redis
docker compose -f scripts/deploy/docker-compose.yml exec redis redis-cli --rdb /data/dump.rdb

# 备份数据卷
docker run --rm -v qzt-mysql-data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-backup.tar.gz /data
```

### 恢复数据

```bash
# 恢复 MySQL
cat backup.sql | docker compose -f scripts/deploy/docker-compose.yml exec -T mysql mysql -u root -p qzt_db

# 恢复数据卷
docker run --rm -v qzt-mysql-data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql-backup.tar.gz -C /
```

---

## HTTPS 配置详解

### SSL 证书存放位置

```
scripts/deploy/ssl/
├── cert.pem    # 证书文件
└── key.pem     # 私钥文件
```

### 自动切换 HTTPS/HTTP

Nginx 容器启动时会自动检测证书文件：
- 有证书 → 启用 HTTPS（443 端口）
- 无证书 → 仅 HTTP（80 端口）

### 更新证书

```bash
# 1. 替换证书文件
cp new-cert.pem scripts/deploy/ssl/cert.pem
cp new-key.pem scripts/deploy/ssl/key.pem

# 2. 重启 frontend 容器
docker compose -f scripts/deploy/docker-compose.yml restart frontend
```

---

## 常见问题

### 1. 容器无法启动

```bash
# 查看容器日志
docker compose -f scripts/deploy/docker-compose.yml logs backend

# 检查容器状态
docker compose -f scripts/deploy/docker-compose.yml ps -a
```

### 2. 镜像拉取失败

```bash
# 配置阿里云镜像加速（脚本已自动配置）
cat /etc/docker/daemon.json

# 手动重启 Docker
systemctl daemon-reload && systemctl restart docker
```

### 3. 端口冲突

```bash
# 检查端口占用
netstat -tlnp | grep -E '80|443|7890|5180|3306|6379'
```

### 4. HTTPS 证书问题

```bash
# 检查证书文件是否存在
ls -la scripts/deploy/ssl/

# 检查证书有效期
openssl x509 -in scripts/deploy/ssl/cert.pem -noout -dates

# 查看容器内证书挂载
docker compose -f scripts/deploy/docker-compose.yml exec frontend ls -la /etc/nginx/ssl/
```

### 5. 内存不足

```bash
# 查看内存使用
free -h

# 调整资源限制（编辑 .env 文件）
BACKEND_MEM_LIMIT=1g
FRONTEND_MEM_LIMIT=256m
```

---

## 更新部署

### 更新代码

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像
docker compose -f scripts/deploy/docker-compose.yml build

# 3. 重启服务
docker compose -f scripts/deploy/docker-compose.yml up -d
```

### 仅更新特定服务

```bash
# 仅更新后端
docker compose -f scripts/deploy/docker-compose.yml up -d --build backend

# 仅更新前端
docker compose -f scripts/deploy/docker-compose.yml up -d --build frontend
```

---

## 文件结构

```
qzt/
├── scripts/deploy/
│   ├── init-server.sh          # 服务器初始化入口
│   ├── docker-deploy.sh        # Docker 交互式部署
│   ├── bare-metal-deploy.sh    # 裸机部署
│   ├── server-deploy.sh        # 服务部署（CI/CD）
│   ├── setup-ssl.sh            # SSL 证书配置
│   ├── docker-compose.yml      # 本地 MySQL 版
│   ├── docker-compose.rds.yml  # RDS 版本
│   ├── README.md                # 裸机部署指南（本文件）
│   └── docker.md               # Docker 部署指南
├── backend/
│   └── Dockerfile
├── frontend/
│   ├── Dockerfile
│   ├── docker-entrypoint.sh    # 容器启动脚本
│   ├── nginx.conf              # HTTPS 配置
│   └── nginx.http.conf         # HTTP 配置
└── website/
    └── Dockerfile
```

---

## 安全建议

1. ✅ **修改默认密码**：`.env` 中的所有密码都是自动生成的
2. ✅ **使用 HTTPS**：生产环境务必启用 SSL 证书
3. ✅ **定期更新**：`git pull` 获取最新镜像和代码
4. ✅ **备份策略**：定期备份数据卷和数据库
5. ✅ **监控日志**：`docker compose logs -f` 监控异常

---

## 技术支持

如遇问题，请检查：
1. Docker 日志：`docker compose logs`
2. 容器状态：`docker compose ps`
3. 资源使用：`docker stats`
4. 网络连接：`docker network inspect qzt-network`

更多信息请参考：
- 裸机部署：`README.md`
- 项目主页：`https://github.com/Gyv12345/qzt`
