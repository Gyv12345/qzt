# Docker 开发环境指南

## 快速开始

### 1. 启动所有服务

```bash
# 基础服务（后端 + 前端 + 网站 + 数据库）
docker-compose up -d

# 包含管理工具（phpMyAdmin + Redis Commander）
docker-compose --profile tools up -d
```

### 2. 查看服务状态

```bash
docker-compose ps
```

### 3. 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f website
```

### 4. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（清空数据库）
docker-compose down -v
```

## 服务访问

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:3456 | React 管理后台 |
| 后端 API | http://localhost:7890 | NestJS API |
| 网站 | http://localhost:5180 | Next.js 公司网站 |
| phpMyAdmin | http://localhost:8080 | 数据库管理（需 tools profile） |
| Redis Commander | http://localhost:8081 | Redis 管理（需 tools profile） |

## 数据库连接

```
Host: localhost
Port: 3307
User: qzt
Password: qzt123
Database: qzt_dev
```

## Redis 连接

```
Host: localhost
Port: 6380
Password: redis123
```

## 常见问题

### 1. 端口冲突

如果端口被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "新端口:容器端口"
```

### 2. 数据持久化

数据存储在 Docker 卷中，重启容器不会丢失数据。

### 3. 重新构建镜像

```bash
docker-compose build backend
docker-compose up -d backend
```

### 4. 清理所有资源

```bash
docker-compose down -v
docker system prune -a
```
