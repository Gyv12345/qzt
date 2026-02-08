# 企智通 Docker 部署指南

## 快速开始

### 一键部署（推荐）

```bash
./install.sh
```

一键部署脚本会自动完成以下操作：
1. 检查 Docker 和 Docker Compose 是否安装
2. 生成安全的 .env.prod 配置文件
3. 构建 Docker 镜像
4. 启动所有服务（MySQL、Redis、Backend、Frontend）
5. 运行数据库迁移
6. 显示访问信息

### 手动部署

如果需要手动控制部署过程，可以按照以下步骤操作：

#### 1. 创建环境配置

```bash
cp .env.prod.example .env.prod
# 编辑 .env.prod，修改密码等配置
```

#### 2. 构建镜像

```bash
docker compose -f docker/docker-compose.prod.yml build
```

#### 3. 启动服务

```bash
docker compose -f docker/docker-compose.prod.yml up -d
```

#### 4. 查看日志

```bash
docker compose -f docker/docker-compose.prod.yml logs -f
```

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 80 | 前端 Web 界面 |
| Backend | 7890 | 后端 API 服务 |
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存服务 |

## 默认账号

- 用户名: `admin`
- 密码: `admin123`

**重要**: 首次登录后请立即修改默认密码！

## 常用命令

### 查看服务状态

```bash
docker compose -f docker/docker-compose.prod.yml ps
```

### 查看日志

```bash
# 所有服务日志
docker compose -f docker/docker-compose.prod.yml logs -f

# 特定服务日志
docker compose -f docker/docker-compose.prod.yml logs -f backend
docker compose -f docker/docker-compose.prod.yml logs -f frontend
```

### 停止服务

```bash
docker compose -f docker/docker-compose.prod.yml stop
```

### 重启服务

```bash
docker compose -f docker/docker-compose.prod.yml restart
```

### 完全删除服务（包括数据卷）

```bash
docker compose -f docker/docker-compose.prod.yml down -v
```

### 数据库备份

```bash
# 备份数据库
docker compose -f docker/docker-compose.prod.yml exec mysql \
    mysqldump -u root -p'$(grep MYSQL_ROOT_PASSWORD .env.prod | cut -d= -f2)' \
    qzt_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker compose -f docker/docker-compose.prod.yml exec -T mysql \
    mysql -u root -p'$(grep MYSQL_ROOT_PASSWORD .env.prod | cut -d= -f2)' \
    qzt_prod < backup_xxx.sql
```

## 环境变量说明

详见 `.env.prod.example` 文件，主要配置项：

| 变量 | 说明 |
|------|------|
| MYSQL_ROOT_PASSWORD | MySQL root 密码 |
| MYSQL_DATABASE | 数据库名称 |
| MYSQL_USER | 数据库用户 |
| MYSQL_PASSWORD | 数据库密码 |
| REDIS_PASSWORD | Redis 密码 |
| JWT_SECRET | JWT 密钥 |
| VITE_API_BASE_URL | 前端 API 地址 |

## 故障排除

### 端口冲突

如果 80 或 7890 端口被占用，可以修改 `docker-compose.prod.yml` 中的端口映射：

```yaml
ports:
  - "8080:80"  # 将前端改为 8080 端口
```

### 数据库连接失败

1. 检查 MySQL 容器是否正常运行：
```bash
docker compose -f docker/docker-compose.prod.yml ps mysql
```

2. 查看 MySQL 日志：
```bash
docker compose -f docker/docker-compose.prod.yml logs mysql
```

### 前端无法访问后端 API

1. 检查后端服务状态：
```bash
curl http://localhost:7890/health
```

2. 查看 Nginx 配置是否正确：
```bash
docker compose -f docker/docker-compose.prod.yml logs frontend
```

## 生产环境建议

1. **修改默认密码**: 修改 `.env.prod` 中的所有密码
2. **定期备份**: 设置 cron 任务定期备份数据库
3. **监控日志**: 使用 ELK 或类似工具收集和分析日志
4. **HTTPS**: 在前端前添加 Nginx 反向代理并配置 SSL
5. **资源限制**: 在 docker-compose.yml 中为服务设置资源限制
