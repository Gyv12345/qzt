# 企智通 (QZT) 2C4G 机器部署配置优化计划

## 一、背景与现状

### 1.1 当前部署架构
- **机器规格**：2 核心 CPU，4GB 内存（裸机部署）
- **部署方式**：PM2 + Nginx + MySQL + Redis
- **服务组成**：
  - Backend: NestJS API (PM2 集群 2 实例，每实例 1G 内存)
  - Frontend: React + Vite (Nginx 静态托管)
  - Website: Next.js 15 (PM2 单实例 500M 内存)
  - MySQL 8.0 (256M buffer pool，200 连接)
  - Redis 7 (未限制内存)

### 1.2 现有配置文件
| 文件 | 用途 |
|------|------|
| `config/pm2/ecosystem.config.cjs` | PM2 进程管理 |
| `config/mysql/my.cnf` | MySQL 配置 |
| `config/nginx/qzt.conf` | Nginx 反向代理 |
| `docker-compose.yml` | 开发环境容器编排 |
| `.github/workflows/deploy.yml` | CI/CD 部署流程 |

---

## 二、关键问题识别

### 2.1 🔴 P0 - 必须修复

#### 定时任务重复执行
**文件**: `backend/src/modules/scheduler/scheduler.service.ts:28-31`

**问题**：PM2 集群模式下，每个 Worker 实例都会独立执行 `onModuleInit()`，导致 5 个定时任务在 2 个实例中重复运行（实际执行 10 次）。

**影响**：
- 合同到期提醒、日志清理等任务重复执行
- BullMQ 通知队列产生重复通知
- 数据库查询压力翻倍

**解决方案**：添加实例检查，只在主实例（NODE_APP_INSTANCE=0）运行定时任务。

---

### 2.2 🟡 P1 - 建议优化

#### MySQL 配置未针对 2C4G 优化
**文件**: `config/mysql/my.cnf`

**问题**：
- `max_connections = 200` 对 2C4G 机器偏高
- `innodb_buffer_pool_size = 256M` 偏保守（可提升到 512M）
- 缺少线程缓存配置

#### Redis 内存未限制
**问题**：docker-compose.yml 中 Redis 未设置 `maxmemory`，可能占用过多内存。

#### PM2 内存限制偏紧
**文件**: `config/pm2/ecosystem.config.cjs:22`

**问题**：`max_memory_restart: '1G'` 对 NestJS 应用来说预留不足，建议调整为 900M 或 1.2G。

---

### 2.3 🟢 P2 - 可选优化

#### Nginx 配置
- 缺少 HTTP/2 支持
- 缺少 Brotli 压缩（比 Gzip 效率高 20%）
- 缺少 Open File Cache

#### Next.js Website
- `next.config.ts` 配置过于简单
- 缺少压缩、缓存、图片优化配置

---

## 三、优化方案

### 3.1 修复定时任务重复执行

**修改文件**: `backend/src/modules/scheduler/scheduler.service.ts`

```typescript
onModuleInit() {
  const instanceId = process.env.NODE_APP_INSTANCE;
  if (instanceId !== '0') {
    this.logger.log(`[调度器] 非主实例 (instance=${instanceId})，跳过定时任务初始化`);
    return;
  }
  this.logger.log('[调度器] 初始化定时任务...');
  this.setupScheduledTasks();
}
```

---

### 3.2 优化 MySQL 配置

**修改文件**: `config/mysql/my.cnf`

```ini
[mysqld]
# 连接数优化（针对 2C4G）
max_connections = 100              # 从 200 降至 100
thread_cache_size = 8              # 新增：减少线程创建开销

# InnoDB 优化
innodb_buffer_pool_size = 512M     # 从 256M 提升至 512M
innodb_buffer_pool_instances = 1   # < 1G 时用 1 个实例
innodb_log_file_size = 128M        # 从 64M 提升，提升写入性能

# 缓存优化
table_open_cache = 2000            # 从 4000 降至 2000
table_definition_cache = 1000      # 从 2000 降至 1000
```

---

### 3.3 优化 Redis 配置

**修改文件**: `docker-compose.yml` (Redis 部分)

```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --appendonly yes
    --requirepass redis123
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
```

**生产环境 redis.conf**（如需要）：
```ini
maxmemory 256mb
maxmemory-policy allkeys-lru
```

---

### 3.4 优化 PM2 配置

**修改文件**: `config/pm2/ecosystem.config.cjs`

```javascript
{
  name: 'qzt-backend',
  instances: 2,
  exec_mode: 'cluster',
  max_memory_restart: '900M',      // 从 1G 降至 900M，留更多余量
  node_args: '--max-old-space-size=896',  // 新增：显式设置 V8 堆大小
  shutdown_with_message: true,     // 新增：优雅关闭
  // ... 其他配置
}
```

---

### 3.5 优化 Nginx 配置（可选）

**修改文件**: `config/nginx/nginx.conf` 和 `config/nginx/qzt.conf`

**新增功能**：
- HTTP/2 支持（如果启用 HTTPS）
- Open File Cache
- Brotli 压缩（需安装模块）

```nginx
# 在 http 块添加
open_file_cache max=1000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;
```

---

### 3.6 优化 Next.js 配置（可选）

**修改文件**: `website/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',

  // 压缩优化
  compress: true,

  // 图片优化
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],  // 优先使用现代格式
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // 生产环境优化
  productionBrowserSourceMaps: false,
  swcMinify: true,  // 使用 SWC 压缩（更快）

  // 实验性功能
  experimental: {
    optimizeCss: true,  // CSS 优化
  },
};
```

---

## 四、资源分配优化后预估

| 组件 | 优化前 | 优化后 | 说明 |
|------|--------|--------|------|
| Backend × 2 | 1G × 2 = 2G | 900M × 2 = 1.8G | 降低单实例限制 |
| Website | 500M | 400M | 足够使用 |
| MySQL Buffer Pool | 256M | 512M | 提升查询性能 |
| Redis | 未限制 | 256M | 设置上限 |
| 系统+其他 | ~500M | ~500M | 保留 |
| **总计** | ~2.76G | ~3.02G | 仍在 4G 范围内 |

**结论**：优化后内存使用约 75%，仍有 25% 余量应对突发流量。

---

## 五、深度优化判断

### 5.1 当前结论：**不需要深度优化**

**理由**：
1. ✅ 配置问题可以通过调整参数解决
2. ✅ 应用复杂度不高，业务逻辑相对简单
3. ✅ 2C4G 机器足以支撑当前业务规模

### 5.2 何时需要深度优化？

触发条件（满足任一即考虑）：
- 并发用户 > 100
- API QPS > 500
- 响应时间 P95 > 500ms
- 内存使用率持续 > 85%
- CPU 使用率持续 > 80%

### 5.3 深度优化方向（供参考）

| 方向 | 复杂度 | 效果 | 建议 |
|------|--------|------|------|
| CDN 静态资源 | 低 | 高 | 优先考虑 |
| Redis 多级缓存 | 中 | 中高 | 视情况而定 |
| 数据库读写分离 | 高 | 中 | 暂不需要 |
| 引入 K8s | 高 | 低 | 过度设计 |
| 服务拆分 | 高 | 中 | 暂不需要 |

---

## 六、实施计划

### 阶段 1：P0 问题修复（必须）
1. 修改 `scheduler.service.ts` 添加实例检查
2. 测试定时任务只执行一次

### 阶段 2：P1 配置优化（建议）
3. 更新 `config/mysql/my.cnf`
4. 更新 `docker-compose.yml` Redis 配置
5. 更新 `config/pm2/ecosystem.config.cjs`
6. 重启服务并验证

### 阶段 3：P2 可选优化
7. 根据实际情况决定是否实施

---

## 七、验证方法

### 7.1 定时任务验证
```bash
# 查看日志，确认只有一条初始化日志
pm2 logs qzt-backend --lines 50

# 验证通知不重复
# 在合同到期任务执行后检查通知数量
```

### 7.2 性能验证
```bash
# 内存使用
free -h

# MySQL 连接数
mysql -e "SHOW STATUS LIKE 'Threads_connected';"

# PM2 状态
pm2 status

# API 响应时间
curl -w "@curl-format.txt" http://localhost:7890/api/health
```

### 7.3 压力测试（可选）
```bash
# 使用 autocannon 或 wrk
npx autocorn -c 50 -d 30 http://localhost:7890/api/health
```

---

## 八、关键文件清单

| 文件路径 | 修改内容 |
|----------|----------|
| `backend/src/modules/scheduler/scheduler.service.ts` | 添加主实例检查 |
| `config/mysql/my.cnf` | 优化连接数和 buffer pool |
| `docker-compose.yml` | Redis 内存限制 |
| `config/pm2/ecosystem.config.cjs` | 调整内存限制和添加 node_args |
| `website/next.config.ts` | (可选) 添加优化配置 |
| `config/nginx/nginx.conf` | (可选) HTTP/2 和缓存 |
