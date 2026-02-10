# 企智通 (QZT) 2C4G 部署验证指南

> 部署架构：ECS 2C4G + RDS MySQL 2C2G（最大连接数 1000）

## 部署前准备

### 1. 重新生成 Prisma Client（必须）

```bash
cd backend
pnpm prisma generate
```

**原因**：`schema.prisma` 中启用了 `connection_limit` 配置，需要重新生成客户端。

### 2. 配置生产环境变量

```bash
# 复制模板
cd backend
cp .env.production .env

# 编辑配置，填写实际的 RDS 连接信息
nano .env
```

**关键配置**：
- `DB_HOST`: RDS 内网地址（推荐）或公网地址
- `DB_PASSWORD`: 支持 `@`, `:`, `#` 等特殊字符，无需转义
- `PM2_CLUSTER_ENABLED=true`: 启用 2 实例集群
- `REDIS_ENABLED=true`: 建议启用 Redis 缓存

---

## 部署步骤

### 方式一：使用统一配置（推荐）

```bash
# 使用 config/pm2/ecosystem.config.cjs
cd /opt/qzt
pm2 start config/pm2/ecosystem.config.cjs
```

### 方式二：分别启动

```bash
# 启动 Backend
cd /opt/qzt/backend
pm2 start pm2.config.cjs

# 启动 Website
cd /opt/qzt/website
pm2 start ecosystem.config.cjs
```

---

## 验证清单

### 1. 进程状态检查

```bash
pm2 status
pm2 list
```

**预期输出**：
```
┌────┬───────────────┬─────┬─────────┬─────┬──────────┬──────────┐
│ id │ name          │ mode│ status  │ cpu │ memory   │ restarts │
├────┼───────────────┼─────┼─────────┼─────┼──────────┼──────────┤
│ 0  │ qzt-backend   │ cluster│ online│ 5%  │ 650MB    │ 0        │
│ 1  │ qzt-backend   │ cluster│ online│ 3%  │ 620MB    │ 0        │
│ 2  │ qzt-website   │ fork  │ online│ 2%  │ 380MB    │ 0        │
└────┴───────────────┴─────┴─────────┴─────┴──────────┴──────────┘
```

### 2. 内存使用检查

```bash
pm2 monit
```

**关键指标**：
- Backend 每实例内存应在 600-700MB 以下
- Website 内存应在 450-500MB 以下
- 总内存使用应在 2GB 以内

### 3. 健康检查

```bash
# Backend 健康检查
curl http://localhost:7890/health

# Website 访问检查
curl -I http://localhost:5180
```

### 4. 数据库连接检查

```bash
# 进入 MySQL
mysql -h your-rds-endpoint -u qzt_user -p

# 查看当前连接数
SHOW PROCESSLIST;
SELECT COUNT(*) FROM information_schema.PROCESSLIST;
```

**预期**：连接数应在 40 以内（2 实例 × 20 = 40）

### 5. 日志检查

```bash
# 查看实时日志
pm2 logs

# 查看错误日志
pm2 logs qzt-backend --err
pm2 logs qzt-website --err

# 查看日志文件
tail -f /opt/qzt/backend/logs/pm2-error.log
tail -f /opt/qzt/website/logs/pm2-error.log
```

---

## 资源分配总结

| 服务 | 内存限制 | 说明 |
|------|----------|------|
| **Backend** | 700MB × 2 = 1.4GB | PM2 集群 2 实例 |
| **Website** | 500MB | Next.js SSR |
| **Frontend** | ~50MB | Nginx 静态托管 |
| **Redis** | ~128MB | 本地 Redis 进程 |
| **系统预留** | ~1.3GB | OS + Nginx + 缓冲 |
| **总计** | ~3.8GB / 4GB | 留有余量 |

**数据库连接分配**：
- Backend: 40 个连接（2 实例 × 20）
- 剩余: 960 个连接（RDS 总共 1000）

---

## 常见问题排查

### 问题 1：启动后立即崩溃

**原因**：RDS 连接失败或环境变量未配置

**排查**：
```bash
pm2 logs qzt-backend --lines 50
```

检查：
- `DB_HOST`, `DB_PASSWORD` 是否正确
- RDS 白名单是否包含 ECS 内网 IP

### 问题 2：内存持续增长

**原因**：内存泄漏

**解决**：
- 每天凌晨 3 点已配置自动重启（`cron_restart`）
- 手动重启：`pm2 restart qzt-backend`

### 问题 3：数据库连接数超限

**原因**：`connection_limit` 配置过高

**解决**：
- 当前配置 20，2 实例共 40 个连接
- 如需调整，修改 `schema.prisma` 后重新 `prisma generate`

### 问题 4：Website 502 错误

**原因**：Next.js 未正常启动

**排查**：
```bash
pm2 logs qzt-website --lines 50
```

检查：
- 端口 5180 是否被占用
- `.next/standalone` 目录是否存在

---

## 监控建议

### 使用 PM2 监控

```bash
# 安装 PM2 Plus（可选）
pm2 link <secret_key> <public_key>

# 或使用简单监控
pm2 monit
```

### 系统资源监控

```bash
# CPU/内存
top -bn1 | head -20

# 磁盘
df -h

# 网络
netstat -tunlp
```

---

## 回滚方案

如遇严重问题，可快速回滚：

```bash
# 停止所有服务
pm2 delete all

# 恢复旧版本代码
git checkout <previous-tag>

# 重新启动
pm2 start config/pm2/ecosystem.config.cjs
```

---

## 下一步优化（可选）

在监控运行 1-2 周后，根据实际情况：

1. **提高限流阈值**：如果 CPU 利用率低，可提高 `THROTTLE_LIMIT` 从 100 到 200+
2. **增加 Backend 实例**：如果内存充足，可尝试 4 实例（需降低单实例内存到 350M）
3. **启用 Redis**：如果响应速度慢，启用 Redis 缓存
4. **日志聚合**：使用阿里云 SLS 收集 PM2 日志
