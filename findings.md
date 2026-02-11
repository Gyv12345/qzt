# Findings & Decisions

## Requirements
用户需求：
1. 将裸机部署改造为 Docker 部署
2. 支持有 RDS 数据库的用户（可选择不安装本地数据库）
3. 根据宿主机配置自动分配资源
4. 支持团队协作（后端 + 前端 + 网站工程师）

## Research Findings

### 现有部署架构分析

**当前痛点（从 session catchup 中发现）：**
1. Workspace 依赖问题：`@qzt/shared-types` 需要特殊处理
2. pnpm lockfile 不匹配：workspace 与子项目的 lockfile 冲突
3. Prisma 版本问题：全局 vs 项目版本不一致
4. 环境依赖复杂：Node.js、pnpm、PM2、Redis、Nginx 需要逐个安装
5. SSH 部署容易失败：网络、权限、路径问题

**现有项目结构：**
```
qzt/
├── backend/          # NestJS API (端口 7890)
├── frontend/         # React + Vite (端口 3456)
├── website/          # Next.js 15 (端口 5180)
├── packages/
│   └── shared-types/ # 共享类型包
├── scripts/deploy/   # 现有部署脚本
└── .github/workflows/deploy.yml
```

### Docker 技术选型

| 组件 | 方案选择 | 理由 |
|------|----------|------|
| 基础镜像 | `node:20-alpine` | 最小体积（~120MB），安全性好 |
| 构建工具 | `pnpm` | 项目已有 workspace 配置 |
| 运行时后端 | `node` 直接运行 | 避免 PM2 在容器内增加复杂度 |
| 运行时前端 | `nginx:alpine` | 静态文件服务最佳实践 |
| 运行时网站 | `node:20-alpine` | Next.js standalone 模式 |
| 编排工具 | `docker-compose` | 简单易用，适合单机部署 |
| 镜像仓库 | Docker Hub / 阿里云 ACR | 根据用户位置选择 |

### Workspace 依赖处理方案

**问题：** `@qzt/shared-types` 是 workspace 依赖，Docker 构建时需要特殊处理

**解决方案：**
1. 在 backend/website Dockerfile 中，先构建 shared-types
2. 使用多阶段构建，共享构建产物
3. 或者将 shared-types 发布到私有 npm registry

**推荐方案：** 多阶段构建 + 共享层

```dockerfile
# 共享层：构建 shared-types
FROM node:20-alpine AS shared-types-builder
WORKDIR /app
COPY packages/shared-types/package.json ./packages/shared-types/
RUN cd packages/shared-types && pnpm install
COPY packages/shared-types ./
RUN cd packages/shared-types && pnpm build

# 后端使用共享层
FROM node:20-alpine AS backend
COPY --from=shared-types-builder /app/packages/shared-types ./packages/shared-types
...
```

### 数据库选择策略

**交互式脚本逻辑：**
```bash
echo "是否使用外部 RDS 数据库？"
echo "1) 是 - 使用阿里云 RDS MySQL"
echo "2) 否 - 启动本地 MySQL 容器"
read -p "请选择 (1-2):" DB_CHOICE

if [ "$DB_CHOICE" = "1" ]; then
    read -p "RDS 地址:" DB_HOST
    read -p "RDS 端口 [3306]:" DB_PORT
    read -p "数据库用户:" DB_USER
    read -sp "数据库密码:" DB_PASS
    # 生成 docker-compose.yml 不包含 mysql 服务
else
    # 生成包含 mysql 服务的 docker-compose.yml
fi
```

### 资源分配策略

**自动检测脚本：**
```bash
# 获取 CPU 核心数
CPU_CORES=$(nproc)

# 获取总内存（MB）
TOTAL_MEM=$(free -m | awk '/Mem:/ {print $2}')

# 根据配置分配资源
if [ $CPU_CORES -le 2 ] && [ $TOTAL_MEM -le 2048 ]; then
    # 2C2G 配置
    BACKEND_MEM="512m"
    FRONTEND_MEM="128m"
    WEBSITE_MEM="256m"
    REDIS_MEM="128m"
    MYSQL_MEM="512m"
elif [ $CPU_CORES -le 2 ] && [ $TOTAL_MEM -le 4096 ]; then
    # 2C4G 配置
    BACKEND_MEM="1g"
    FRONTEND_MEM="256m"
    WEBSITE_MEM="512m"
    REDIS_MEM="256m"
    MYSQL_MEM="1g"
else
    # 4C8G+ 配置
    BACKEND_MEM="2g"
    FRONTEND_MEM="512m"
    WEBSITE_MEM="1g"
    REDIS_MEM="512m"
    MYSQL_MEM="2g"
fi
```

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 使用多阶段构建 | 减少最终镜像大小 50%+，分离构建和运行时依赖 |
| Node.js 20 Alpine | 最小体积 + 安全性，兼容性好 |
| 健康检查使用 /api/health | 与现有后端一致 |
| 环境变量通过 .env 文件 | 符合 12-Factor App 原则 |
| 使用 Docker Network | 服务间隔离通信，安全性更高 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| pnpm workspace 在 Docker 中构建 | 使用多阶段构建，先构建 shared-types |
| CI/CD 需要改造 | 新建 Docker 构建流程，保留旧流程作为备份 |

## Resources
- Docker Multi-stage Builds: https://docs.docker.com/build/building/multi-stage/
- Next.js Docker Deployment: https://nextjs.org/docs/deployment#docker-image
- Docker Compose Spec: https://compose-spec.io/

## Visual/Browser Findings
N/A - 纯后端/DevOps 任务
