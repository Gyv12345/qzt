---
name: qzt-dev
description: 企账通（QZT）项目开发工作流。使用此技能进行任何 QZT 项目的开发任务，包括后端 API 开发、前端页面开发、组件开发或功能测试。该技能协调使用 React、NestJS、UI/UX 和测试等最佳实践技能。开发新功能或遇到问题时，优先查阅参考文档。
---

## 🎯 快速开始

```bash
# ⚠️ 唯一正确的启动方式
./start-dev.sh
```

**端口**: 前端 3456，后端 7890

**⚠️ 重要**：
- **永远使用 `./start-dev.sh` 启动开发环境**
- **不要手动运行** `pnpm run start:dev` 或 `pnpm run dev`
- 启动脚本会自动检查服务是否已在运行，避免重复启动
- 启动脚本提供统一的日志管理和进程监控

## 🔧 核心开发规则

### ⚠️ 启动服务规范

**唯一正确的启动方式**：
```bash
./start-dev.sh
```

**禁止的操作**：
- ❌ 不要手动运行 `cd backend && pnpm run start:dev`
- ❌ 不要手动运行 `cd frontend && pnpm run dev`
- ❌ 不要使用其他启动脚本

**原因**：
- `start-dev.sh` 会检查服务是否已在运行，避免重复启动
- 提供统一的日志管理（日志存储在 `logs/` 目录）
- 自动处理进程清理和端口冲突
- 提供统一的服务监控

**检查服务状态**：
```bash
# 查看后端日志
tail -f logs/backend_latest.log

# 查看前端日志
tail -f logs/frontend_latest.log

# 检查端口占用
lsof -ti:7890  # 后端
lsof -ti:3456  # 前端
```

### ⚠️ 决策流程规范

**遇到模块启动失败或依赖注入问题时，必须遵循以下流程**：

#### 步骤 1: 识别问题

明确识别是什么类型的错误：
- 模块依赖注入错误（`Nest can't resolve dependencies...`）
- 路径配置错误（`cannot be found`）
- 导入/导出不匹配（`does not provide an export`）
- 其他错误

#### 步骤 2: 询问用户（必须）

**永远不要直接注释掉功能模块！** 必须先询问用户：

```
检测到 [模块名] 存在 [问题类型]。

问题分析：
- 错误信息：[具体错误]
- 影响范围：[影响的功能]
- 可选模块：是/否

请选择解决方案：
1. 暂时禁用该模块，让系统先运行起来
2. 修复该模块的问题

如果选择修复，我将：
- 查询 NestJS 最佳实践
- 实施正确的修复方案
- 将解决方案记录到 troubleshooting.md 避免未来重复问题
```

#### 步骤 3: 执行用户选择的方案

**如果用户选择暂时禁用**：
1. 注释掉相关模块的导入
2. 记录禁用原因和位置
3. 提醒用户后续需要修复

**如果用户选择修复**：
1. 查询官方文档和最佳实践
2. 实施正确的修复方案
3. 更新 `references/troubleshooting.md` 文档
4. 验证修复是否有效

#### 步骤 4: 记录和预防

- 将问题和解决方案记录到 `references/troubleshooting.md`
- 标注问题的复现条件
- 提供预防措施

**示例对话**：

❌ **错误做法**：
```
检测到 SchedulerModule 依赖注入问题。
直接注释掉该模块...
✅ 系统启动成功
```

✅ **正确做法**：
```
检测到 SchedulerModule 存在依赖注入错误。

问题分析：
- 错误：SchedulerMetadataAccessor 需要 Reflector
- 影响：定时任务功能将无法使用
- 可选模块：是（不影响核心业务）

请选择解决方案：
1. 暂时禁用 SchedulerModule
2. 修复依赖注入问题

[等待用户选择...]
```

### ⚠️ API 开发铁律

**前端绝对不能直接修改或手写 API 调用代码！**

**正确流程**:
1. 后端开发 API → 2. 生成 API 客户端 `pnpm run generate:api` → 3. 前端使用生成的 API

**后端 API Tags 规范**:
- **必须使用英文 @ApiTags**（如 `auth`、`customers`、`notifications`）
- **禁止使用中文 Tags**（如 `认证`、`客户管理`、`通知管理`）
- Tags 会直接映射为前端 API 文件名
- 中文文件名会导致跨平台兼容性问题

**示例**:
```typescript
// ✅ 正确
@ApiTags('auth')
@Controller('auth')
export class AuthController {}

// ❌ 错误
@ApiTags('认证')
@Controller('auth')
export class AuthController {}
```

**详细参考**: [API 开发规范和模式](./references/api-patterns.md)

### 🌍 国际化（i18n）规范

**前后端都支持中英文，默认中文。**

#### 后端国际化

**使用 nestjs-i18n 返回国际化消息**：

```typescript
// 在 Service 中注入 I18nService
constructor(private i18n: I18nService) {}

// 使用翻译 key
throw new UnauthorizedException(this.i18n.t('auth.INVALID_CREDENTIALS'));
```

**翻译文件位置**：`backend/src/i18n/{zh,en}/`
- `auth.json` - 认证相关
- `common.json` - 通用消息
- `{module}.json` - 各模块专属

#### 前端国际化

**使用 i18next 翻译 UI 文本**：

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('common.success')}</h1>;
}
```

**切换语言**：
```tsx
const { i18n } = useTranslation();
i18n.changeLanguage('en'); // 切换到英文
i18n.changeLanguage('zh'); // 切换到中文
```

**翻译文件位置**：`frontend/src/i18n/locales/{zh,en}/translation.json`

#### 前后端协同

- 前端通过 `Accept-Language` 请求头发送语言偏好
- 后端 `AcceptLanguageResolver` 自动解析并返回对应语言
- 用户切换语言时，前后端自动同步

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

### 启动服务（唯一正确方式）

```bash
./start-dev.sh          # 启动前端 + 后端
```

**⚠️ 警告**：不要手动运行 `pnpm run start:dev` 或 `pnpm run dev`

### 查看日志

```bash
tail -f logs/backend_latest.log   # 后端日志
tail -f logs/frontend_latest.log  # 前端日志
```

### 后端开发

```bash
cd backend
pnpm run build          # 构建
pnpm run prisma:generate # 生成 Prisma 客户端
pnpm run prisma:migrate  # 数据库迁移
```

### 前端开发

```bash
cd frontend
pnpm run build          # 构建
pnpm run generate:api   # 生成 API 客户端（重要！）
pnpm run lint           # 代码检查
pnpm run format         # 代码格式化
```

## ⚡ 快速检查清单

### 后端开发
- [ ] API 接口已实现
- [ ] `@ApiTags` 使用英文（如 `auth`、`customers`）
- [ ] 错误消息使用 i18n（如 `this.i18n.t('auth.INVALID_CREDENTIALS')`）
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
| API 文件名是中文 | 检查后端 `@ApiTags`，改用英文，重新运行 `pnpm run generate:api` |
| 路由匹配失败 | 移除 `getRouteApi()` 路径末尾斜杠 |
| Query undefined | 直接返回 API 调用结果，不访问 `.data` |
| require 错误 | 改用 ES6 `import`，不使用 `require()` |
| 404 错误 | 检查是否有 `/api` 前缀（不应该有） |
| 类型错误 | 运行 `pnpm run generate:api` |
| Bull 模块依赖错误 | 迁移到 BullMQ + node-cron（见下方） |
| **Context Hook 报错** | **确保组件用 Provider 包裹，参考 Tasks 模块** |
| **API 响应 undefined** | **不访问 `.data`，拦截器已自动提取** |
| **环境变量未加载** | **使用 `forRootAsync` + `useFactory` + `ConfigService`** |

## 📖 技术栈概览

### 前端
- React 19 + Vite 7 + TanStack Router/Query
- Shadcn UI + Tailwind CSS
- React Hook Form + Zod
- Orval (API 生成)
- i18next (国际化，支持中英文)

### 后端
- NestJS 10 + Prisma 5
- PostgreSQL
- Swagger/OpenAPI 3.0
- nestjs-i18n (国际化，支持中英文)
- BullMQ + node-cron (异步任务和定时调度)

### 工具
- pnpm（包管理器）
- TypeScript（严格类型）

## 🎓 核心原则

1. ✅ **永远使用 `./start-dev.sh` 启动服务**，不要手动启动
2. ✅ **使用 Orval 生成的 API**，不要手写
3. ✅ **后端 @ApiTags 必须使用英文**（如 `auth`、`customers`）
4. ✅ **使用国际化（i18n）处理所有用户可见文本**，不要硬编码中文
5. ✅ **使用 TanStack Query** 管理服务器状态
6. ✅ **使用 Shadcn UI** 组件，保持一致性
7. ✅ **遵循 Prisma 最佳实践**，优化查询
8. ✅ **遇到问题查阅参考文档**
9. ✅ **遇到模块启动失败时，先询问用户再决定解决方案**
10. ✅ **使用 ConfigService 读取环境变量**，不要直接用 `process.env`
11. ✅ **Hook 返回 API 调用结果即可**，不要访问 `response.data`

---

## 📚 会话记录

详细的开发会话总结请查看：
- **[2025-02-04 会话总结](./references/session-2025-02-04.md)** - 完整会话总结
- **[2025-02-04 国际化实现](./references/session-2025-02-04-i18n.md)** - 中英文国际化实现
- **[2025-02-04 用户管理模块](./references/session-2025-02-04-users-module.md)** - 用户管理 CRUD 功能
- **[2025-02-04 部门管理模块](./references/session-2025-02-04-departments.md)** - 部门管理 CRUD + 树形表格 + 搜索
- **[2025-02-04 问题解决记录](./references/issue-resolution-2026-02-04.md)** - 问题排查和解决记录

**遇到具体问题时，优先查阅相应的参考文档获取详细指导和示例。**
