# 企智通 (QZT) Docker 部署指南

> 使用 Docker Compose 一键部署企智通全栈应用

## 部署架构

```
┌─────────────────────────────────────────┐
│              Docker Host                │
│  ┌───────────────────────────────────┐  │
│  │       qzt-network (bridge)        │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ │  │
│  │  │backend │ │frontend│ │website │ │  │
│  │  │ :7890  │ │  :80   │ │ :5180  │ │  │
│  │  └────────┘ └────────┘ └────────┘ │  │
│  │  ┌────────┐ ┌────────┐           │  │
│  │  │ Redis  │ │ MySQL  │ (可选)   │  │
│  │  │ :6379  │ │ :3306  │           │  │
│  │  └────────┘ └────────┘           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Volumes:                               │
│  - qzt-backend-logs (日志)              │
│  - qzt-redis-data (Redis 持久化)        │
│  - qzt-mysql-data (MySQL 持久化)        │
└─────────────────────────────────────────┘
```

---

## 前置要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Docker | >= 20.10 | 容器运行时 |
| Docker Compose | >= 2.0 | 编排工具 |
| 服务器配置 | >= 2C2G | 推荐 2C4G |

### 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh

# CentOS/RHEL
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker compose version
```

---

## 快速开始

### 方式一：交互式部署（推荐）

```bash
# 克隆项目
git clone https://github.com/Gyv12345/qzt.git
cd qzt

# 运行部署脚本
bash scripts/deploy/docker-deploy.sh
```

**部署脚本会**：
1. 检查 Docker 环境
2. 检测服务器配置（CPU/内存）
3. 询问数据库选择（RDS 或本地 MySQL）
4. 根据配置自动分配资源
5. 生成 `.env` 文件
6. 构建并启动所有服务
7. 等待服务就绪
8. 显示访问地址

### 方式二：手动部署

#### 1. 选择数据库配置

**使用 RDS**：
```bash
# 复制环境变量模板
cp .env.rds.example .env

# 编辑配置
vim .env
```

**使用本地 MySQL**：
```bash
# 复制环境变量模板
cp .env.local.example .env

# 编辑配置
vim .env
```

#### 2. 配置环境变量

编辑 `.env` 文件，填写必要信息：

```bash
# ======== RDS 配置（使用 RDS 时填写） ========
RDS_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
RDS_PORT=3306
RDS_USERNAME=your_db_user
RDS_PASSWORD=your_db_password
RDS_DATABASE=qzt_db

# ======== 本地 MySQL 配置（使用本地数据库时填写） ========
MYSQL_ROOT_PASSWORD=your_root_password
DB_PASSWORD=your_db_password

# ======== Redis 配置 ========
REDIS_PASSWORD=your_redis_password

# ======== JWT 配置 ========
JWT_SECRET=your_jwt_secret

# ======== 域名配置 ========
DOMAIN_NAME=yourdomain.com
ADMIN_DOMAIN=admin.yourdomain.com
```

#### 3. 启动服务

**使用 RDS**：
```bash
docker compose -f docker-compose.rds.yml up -d
```

**使用本地 MySQL**：
```bash
docker compose up -d
```

#### 4. 初始化数据库

```bash
# 首次部署需要运行数据库迁移
docker compose exec backend npx prisma db push
```

---

## 资源分配

部署脚本会根据服务器配置自动调整资源限制：

### 2C2G 配置

| 服务 | CPU 限制 | 内存限制 |
|------|----------|----------|
| Backend | 1 core | 512MB |
| Frontend | 0.5 core | 128MB |
| Website | 0.5 core | 256MB |
| Redis | 0.5 core | 128MB |
| MySQL | 1 core | 512MB |

### 2C4G 配置（推荐）

| 服务 | CPU 限制 | 内存限制 |
|------|----------|----------|
| Backend | 1 core | 1GB |
| Frontend | 0.5 core | 256MB |
| Website | 0.5 core | 512MB |
| Redis | 0.5 core | 256MB |
| MySQL | 1 core | 1GB |

### 4C8G+ 配置

| 服务 | CPU 限制 | 内存限制 |
|------|----------|----------|
| Backend | 2 cores | 2GB |
| Frontend | 1 core | 512MB |
| Website | 1 core | 1GB |
| Redis | 1 core | 512MB |
| MySQL | 2 cores | 2GB |

---

## 服务管理

### 查看服务状态

```bash
# 查看所有服务
docker compose ps

# 查看资源使用
docker stats

# 查看日志
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f website
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart backend
docker compose restart frontend
docker compose restart website
```

### 停止服务

```bash
# 停止所有服务
docker compose stop

# 停止单个服务
docker compose stop backend
```

### 删除服务

```bash
# 停止并删除所有服务（保留数据卷）
docker compose down

# 停止并删除所有服务（包括数据卷）
docker compose down -v
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
docker compose exec mysql mysqldump -u root -p qzt_db > backup.sql

# 备份 Redis
docker compose exec redis redis-cli --rdb /data/dump.rdb

# 备份数据卷
docker run --rm -v qzt-mysql-data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-backup.tar.gz /data
```

### 恢复数据

```bash
# 恢复 MySQL
cat backup.sql | docker compose exec -T mysql mysql -u root -p qzt_db

# 恢复数据卷
docker run --rm -v qzt-mysql-data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql-backup.tar.gz -C /
```

---

## 健康检查

### 服务健康端点

| 服务 | 健康检查端点 | 说明 |
|------|-------------|------|
| Backend | `/api/health` | 返回 200 表示健康 |
| Frontend | `/health` | 返回 "healthy" |
| Website | `/health` | 返回 200 表示健康 |

### 手动检查

```bash
# 检查后端
curl http://localhost:7890/api/health

# 检查前端
curl http://localhost/health

# 检查网站
curl http://localhost:5180/health
```

### 容器健康状态

```bash
# 查看容器健康状态
docker compose ps

# 预期输出（healthy 状态）：
# NAME            STATUS
# qzt-backend     Up X minutes (healthy)
# qzt-frontend    Up X minutes (healthy)
# qzt-website     Up X minutes (healthy)
# qzt-redis       Up X minutes (healthy)
# qzt-mysql       Up X minutes (healthy)
```

---

## 更新部署

### 更新代码

```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker compose build

# 重启服务
docker compose up -d
```

### 零停机更新

```bash
# 使用 rolling 更新
docker compose up -d --no-deps --build backend

# 或使用 docker compose 的滚动更新
docker compose up -d --force-recreate
```

---

## 日志管理

### 查看日志

```bash
# 查看所有服务日志
docker compose logs

# 实时查看日志
docker compose logs -f

# 查看指定行数
docker compose logs --tail 100

# 查看特定时间后的日志
docker compose logs --since 1h
```

### 日志配置

日志默认使用 JSON 文件驱动，配置：

| 配置 | 值 | 说明 |
|------|-----|------|
| max-size | 10m | 单个日志文件最大 10MB |
| max-file | 3 | 保留最近 3 个日志文件 |

### 日志位置

```bash
# 容器内日志
docker compose exec backend ls -la logs/

# 查看后端日志
docker compose exec backend tail -f logs/pm2-combined.log
```

---

## 常见问题

### 1. 容器无法启动

```bash
# 查看容器日志
docker compose logs backend

# 检查容器状态
docker compose ps -a

# 检查资源使用
docker stats
```

### 2. 数据库连接失败

**使用 RDS**：
- 检查 RDS 白名单是否包含服务器 IP
- 检查 `.env` 中的连接信息是否正确
- 测试连接：`docker compose exec backend nc -zv $RDS_HOST 3306`

**使用本地 MySQL**：
```bash
# 检查 MySQL 容器状态
docker compose ps mysql

# 进入 MySQL 容器
docker compose exec mysql bash

# 测试连接
mysql -u root -p
```

### 3. 内存不足

```bash
# 查看内存使用
free -h

# 检查容器内存限制
docker inspect qzt-backend | grep -A 10 Memory

# 调整资源限制
# 编辑 docker-compose.yml 中的 deploy.resources.limits.memory
```

### 4. 端口冲突

```bash
# 检查端口占用
netstat -tlnp | grep -E '80|7890|5180|3306|6379'

# 修改端口（编辑 docker-compose.yml）
# ports:
#   - "8080:80"  # 将 80 改为 8080
```

### 5. 镜像构建失败

```bash
# 清理构建缓存
docker builder prune

# 重新构建
docker compose build --no-cache

# 使用 BuildKit（更快）
DOCKER_BUILDKIT=1 docker compose build
```

---

## 性能优化

### 启用 BuildKit

```bash
# ~/.docker/daemon.json
{
  "features": {
    "buildkit": true
  }
}

systemctl restart docker
```

### 使用镜像缓存

```bash
# 拉取基础镜像
docker pull node:20-alpine
docker pull nginx:alpine
docker pull redis:7-alpine
docker pull mysql:8.0
```

### 限制日志大小

在 `docker-compose.yml` 中已配置日志轮转：
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 安全建议

1. **修改默认密码**：`.env` 中的所有密码
2. **使用密钥管理**：考虑使用 Docker Secrets 或外部密钥管理服务
3. **限制容器权限**：容器已配置非 root 用户运行
4. **定期更新镜像**：`docker compose pull` 获取最新基础镜像
5. **启用 HTTPS**：使用 Nginx 反向代理配置 SSL

---

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build images
        run: |
          docker compose build

      - name: Save images
        run: |
          docker save qzt-backend qzt-frontend qzt-website | gzip > qzt-images.tar.gz

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: docker-images
          path: qzt-images.tar.gz

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: docker-images

      - name: Load images
        run: docker load < qzt-images.tar.gz

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker compose pull
            docker compose up -d
```

---

## 文件结构

```
qzt/
├── docker-compose.yml          # 本地 MySQL 版本
├── docker-compose.rds.yml      # RDS 版本
├── .env.rds.example            # RDS 环境变量模板
├── .env.local.example          # 本地环境变量模板
├── backend/
│   └── Dockerfile              # 后端镜像
├── frontend/
│   ├── Dockerfile              # 前端镜像
│   └── nginx.conf              # Nginx 配置
├── website/
│   └── Dockerfile              # 网站镜像
└── scripts/deploy/
    └── docker-deploy.sh        # 交互式部署脚本
```

---

## 技术支持

如遇问题，请检查：
1. Docker 日志：`docker compose logs`
2. 容器状态：`docker compose ps`
3. 资源使用：`docker stats`
4. 网络连接：`docker network inspect qzt-network`
