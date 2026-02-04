---
name: qzt-dev
description: 企账通（QZT）项目开发工作流。使用此技能进行任何 QZT 项目的开发任务，包括后端 API 开发、前端页面开发、组件开发或功能测试。该技能协调使用 React、NestJS、UI/UX 和测试等最佳实践技能。开发新功能或遇到问题时，优先查阅参考文档。
---

## 🎯 快速开始

```bash
# 启动开发环境（前端 + 后端）
pnpm dev

# 或使用启动脚本
./start-dev.sh
```

**端口**: 前端 3456，后端 7890

## 🔧 核心开发规则

### ⚠️ API 开发铁律

**前端绝对不能直接修改或手写 API 调用代码！**

**正确流程**:
1. 后端开发 API → 2. 生成 API 客户端 `pnpm run generate:api` → 3. 前端使用生成的 API

**详细参考**: [API 开发规范和模式](./references/api-patterns.md)

### 开发任务流程

根据任务类型选择合适的技能：

#### 后端开发
调用 `nestjs-best-practices` 技能获得 NestJS 最佳实践指导

#### 前端开发
根据需求调用：
- `vercel-react-best-practices` - React 性能优化
- `ui-ux-pro-max` - UI/UX 设计
- 参考 [CRUD 功能实现模式](./references/crud-patterns.md)

#### 功能测试
调用 `webapp-testing` 技能进行功能验证和调试

## 📚 参考文档

### 核心开发指南

| 文档 | 用途 | 何时阅读 |
|------|------|---------|
| **[API 开发规范](./references/api-patterns.md)** | API 开发流程、配置、调试 | 开发或修改 API 时 |
| **[CRUD 实现模式](./references/crud-patterns.md)** | 完整的客户管理 CRUD 功能参考 | 实现列表、表单、对话框功能时 |
| **[故障排除指南](./references/troubleshooting.md)** | 常见问题和解决方案 | 遇到错误或异常时 |
| **[Prisma 最佳实践](./references/prisma-patterns.md)** | 关联查询、性能优化 | 编写数据库查询时 |

### Shadcn Admin 参考文档

- 📄 **[Shadcn Admin 项目概览](./references/shadcn-admin-overview.md)** - 项目介绍、技术栈
- 🏗️ **[Shadcn Admin 架构详解](./references/shadcn-admin-architecture.md)** - 组件架构、路由系统
- 🔄 **[Shadcn Admin 迁移指南](./references/shadcn-admin-migration-guide.md)** - 集成组件到 QZT

## 🛠️ 常用命令

### 后端

```bash
cd backend
pnpm run start:dev      # 开发
pnpm run build          # 构建
pnpm run prisma:generate # 生成 Prisma 客户端
pnpm run prisma:migrate  # 数据库迁移
```

### 前端

```bash
cd frontend
pnpm run dev            # 开发
pnpm run build          # 构建
pnpm run generate:api   # 生成 API 客户端（重要！）
pnpm run lint           # 代码检查
pnpm run format         # 代码格式化
```

## ⚡ 快速检查清单

### 后端开发
- [ ] API 接口已实现
- [ ] Swagger 注解正确
- [ ] 后端服务运行在 7890

### 前端开发
- [ ] 已运行 `pnpm run generate:api`
- [ ] 查看过 `src/models/` 类型定义
- [ ] 使用 `getScrmApi()` 生成的函数
- [ ] 不直接修改 `src/services/api.ts`

### 功能测试
- [ ] 功能正常工作
- [ ] API 调用成功
- [ ] 错误处理正确
- [ ] 控制台无错误

## 🚨 快速故障排除

遇到问题？查阅 **[故障排除指南](./references/troubleshooting.md)**

### 常见问题速查

| 问题 | 快速解决方案 |
|------|-------------|
| 路由匹配失败 | 移除 `getRouteApi()` 路径末尾斜杠 |
| Query undefined | 直接返回 API 调用结果，不访问 `.data` |
| require 错误 | 改用 ES6 `import`，不使用 `require()` |
| 404 错误 | 检查是否有 `/api` 前缀（不应该有） |
| 类型错误 | 运行 `pnpm run generate:api` |

## 📖 技术栈概览

### 前端
- React 19 + Vite 7 + TanStack Router/Query
- Shadcn UI + Tailwind CSS
- React Hook Form + Zod
- Orval (API 生成)

### 后端
- NestJS 10 + Prisma 5
- PostgreSQL
- Swagger/OpenAPI 3.0

### 工具
- pnpm（包管理器）
- TypeScript（严格类型）

## 🎓 核心原则

1. ✅ **使用 Orval 生成的 API**，不要手写
2. ✅ **使用 TanStack Query** 管理服务器状态
3. ✅ **使用 Shadcn UI** 组件，保持一致性
4. ✅ **遵循 Prisma 最佳实践**，优化查询
5. ✅ **遇到问题查阅参考文档**

---

**遇到具体问题时，优先查阅相应的参考文档获取详细指导和示例。**
