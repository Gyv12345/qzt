# Task Plan: Docker 化部署方案
<!--
  WHAT: 将现有裸机部署改造为 Docker 部署方案
  WHY: 裸机部署依赖复杂、环境不一致、难以维护，Docker 可以解决这些问题
  WHEN: 2026-02-11
-->

## Goal
设计并实现一个生产级的 Docker 部署方案，支持：
- 使用 docker-compose 编排所有服务
- 支持外部 RDS 数据库（可选本地数据库）
- 根据宿主机配置自动调整资源限制
- 支持一键部署和回滚

## Current Phase
Phase 5: 部署脚本（已完成 Phase 0-5）

## Team Structure
| 角色 | 负责项目 | 职责 | 状态 |
|------|----------|------|------|
| 后端工程师 | backend | Dockerfile、Prisma 迁移、环境变量 | ✅ 完成 |
| 前端工程师 | frontend | Dockerfile、Nginx 配置 | ✅ 完成 |
| 前端工程师 | website | Dockerfile、Next.js 配置 | ✅ 完成 |
| DevOps | 协调 | docker-compose、CI/CD 集成 | ✅ 完成 |

## Phases

### Phase 0: 需求分析与方案设计
- [x] 分析当前部署架构和痛点
- [x] 设计 Docker 镜像分层策略
- [x] 设计 docker-compose 服务编排
- [x] 设计资源分配策略（根据宿主机配置）
- [x] 设计环境变量管理方案
- [x] 设计网络架构（前端/后端/网站/Redis）
- **Status:** complete

### Phase 1: 后端 Docker 化（Backend Engineer 负责）
- [x] 编写 backend/Dockerfile
- [x] 处理 workspace 依赖（@qzt/shared-types）
- [x] 配置 Prisma 迁移脚本
- [x] 配置 PM2 集群模式（改为直接 node 运行，更适合容器）
- [x] 健康检查端点
- **Status:** complete

### Phase 2: 前端 Docker 化（Frontend Engineer 负责）
- [x] 编写 frontend/Dockerfile
- [x] 配置 Nginx 静态文件服务
- [x] 多阶段构建优化镜像大小
- **Status:** complete

### Phase 3: 网站 Docker 化（Website Engineer 负责）
- [x] 编写 website/Dockerfile
- [x] 配置 Next.js standalone 输出
- [x] 处理 ISR/SSR 构建产物
- **Status:** complete

### Phase 4: Docker Compose 编排
- [x] 编写 docker-compose.yml（本地数据库版本）
- [x] 编写 docker-compose.rds.yml（RDS 版本）
- [x] 配置服务网络（qzt-network）
- [x] 配置数据卷（redis-data、mysql-data、backend-logs）
- [x] 配置环境变量覆盖
- [x] 配置健康检查和重启策略
- **Status:** complete

### Phase 5: 部署脚本（支持 RDS 选择）
- [x] 服务器检测脚本（CPU/内存）
- [x] 交互式数据库选择（RDS / 本地 MySQL）
- [x] 资源限制自动计算
- [x] 一键部署脚本
- [ ] 回滚脚本（待实现）
- **Status:** complete (除回滚脚本)

### Phase 6: CI/CD 集成
- [ ] 更新 GitHub Actions 构建 Docker 镜像
- [ ] 推送到镜像仓库（Docker Hub / ACR）
- [ ] 服务器端拉取镜像部署
- **Status:** pending

### Phase 7: 文档与验证
- [x] 编写部署文档
- [ ] 本地测试部署
- [ ] 服务器测试部署
- **Status:** in_progress (文档完成，待测试)

## Key Questions
1. **是否使用多阶段构建？**
   - 是：减少镜像大小，构建分离
   - Node.js 基础镜像选择：alpine vs slim

2. **如何处理 workspace 依赖？**
   - 在 backend Dockerfile 中先构建 shared-types
   - 或者使用多阶段构建共享层

3. **数据库选择策略？**
   - 交互式脚本询问用户是否有 RDS
   - 有 RDS：配置连接字符串
   - 无 RDS：启动 MySQL 容器

4. **资源分配策略？**
   | 服务器配置 | 后端 | 前端 | 网站 | Redis | MySQL |
   |------------|------|------|------|-------|-------|
   | 2C2G | 512MB | 128MB | 256MB | 128MB | 512MB |
   | 2C4G | 1GB | 256MB | 512MB | 256MB | 1GB |
   | 4C8G | 2GB | 512MB | 1GB | 512MB | 2GB |

5. **网络架构？**
   ```
   ┌─────────────────────────────────────────┐
   │              Nginx (80/443)              │
   │  ┌──────────┬──────────┬──────────────┐ │
   │  │ frontend │ website  │  backend API │ │
   │  │  :3000   │  :5180   │    :7890     │ │
   │  └──────────┴──────────┴──────────────┘ │
   └─────────────────────────────────────────┘
         │             │            │
         └─────────────┴────────────┴───────┐ qzt-network
                                               │
                        ┌──────────────────────┼──────────────┐
                        │                      │              │
                   backend:7890           redis:6379    mysql:3306
                        │                      │              │
                   ┌────┴────┐             ┌──┴──┐        ┌──┴──┐
                   │ backend │             │Redis │        │MySQL│
                   └─────────┘             └─────┘        └─────┘
   ```

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 使用多阶段构建 | 减少最终镜像大小，分离构建和运行时依赖 |
| Node.js 20 Alpine 基础镜像 | 最小化镜像体积 |
| 单一 docker-compose 文件 | 简化部署，所有服务一键启动 |
| 交互式数据库选择 | 支持 RDS 用户跳过本地数据库 |
| 环境变量覆盖优先级 | .env → docker-compose.yml → 运行时 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (暂无) | - | - |

## Created Files
| 文件 | 描述 |
|------|------|
| backend/Dockerfile | 后端多阶段构建 Dockerfile |
| frontend/Dockerfile | 前端 Nginx Dockerfile |
| frontend/nginx.conf | Nginx SPA 配置 |
| website/Dockerfile | 网站 Next.js standalone Dockerfile |
| docker-compose.yml | 本地数据库版本编排文件 |
| docker-compose.rds.yml | RDS 版本编排文件 |
| .env.rds.example | RDS 环境变量模板 |
| .env.local.example | 本地环境变量模板 |
| scripts/deploy/docker-deploy.sh | 一键部署脚本 |

## Docker 镜像分层设计

### backend
```dockerfile
# Stage 1: 依赖层（缓存友好）
FROM node:20-alpine AS deps
WORKDIR /app
COPY packages/shared-types/package.json ./packages/shared-types/
COPY backend/package.json ./backend/
RUN cd backend && pnpm install --prod

# Stage 2: 构建层
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN cd packages/shared-types && pnpm build
RUN cd backend && pnpm prisma generate && pnpm build

# Stage 3: 运行时
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY backend/package.json ./
CMD ["node", "dist/main"]
```

### frontend
```dockerfile
# Stage 1: 构建层
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package.json frontend/
RUN cd frontend && pnpm install
COPY frontend/ ./
RUN cd frontend && pnpm build

# Stage 2: Nginx 运行时
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
```

### website
```dockerfile
# 类似 frontend，但使用 Next.js standalone 输出
```

## Notes
- 现有部署脚本：`scripts/deploy/` 目录
- 需要保留与现有 CI/CD 的兼容性
- 考虑使用 Docker BuildKit 加速构建
