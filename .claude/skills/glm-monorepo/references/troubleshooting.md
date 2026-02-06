# QZT 故障排除指南

## TanStack Router 问题

### 问题: 路由匹配失败

**症状**:
```
Error: Invariant failed: Could not find an active match from "/_authenticated/customers/"
```

**原因**: `getRouteApi()` 路径参数末尾多了斜杠

**解决方案**:
```typescript
// ❌ 错误
const route = getRouteApi('/_authenticated/customers/')

// ✅ 正确 - 移除末尾斜杠
const route = getRouteApi('/_authenticated/customers')
```

**说明**: TanStack Router 对路径非常敏感，路径参数必须与路由定义完全一致。

---

### 问题: 参数类型返回 `unknown`

**症状**: `Route.useParams()` 返回 `unknown` 类型

**解决方案**:
```bash
# 重新生成路由树
cd frontend
rm src/routeTree.gen.ts
pnpm run dev
# 路由树会自动重新生成
```

## TanStack Query 问题

### 问题: Query data cannot be undefined

**症状**:
```
Query data cannot be undefined. Please make sure to return a value other than undefined from your query function.
Affected query key: ["customers",{"page":1,"pageSize":10}]
```

**原因**: API 响应拦截器已提取 `data.data`，但代码中错误地再次访问 `.data`

**错误示例**:
```typescript
// ❌ 错误 - response 已经是数据本身
const response = await customerControllerFindAll(params)
return response.data as any  // response.data 是 undefined
```

**正确做法**:
```typescript
// ✅ 正确 - 直接返回 API 调用结果
return await customerControllerFindAll(params) as any
```

**解释**: `api-client.ts` 的响应拦截器已自动提取后端统一响应格式的 `data` 字段，所以返回的数据就是实际的分页对象 `{ items, total, page, pageSize }`，不再有嵌套的 `.data` 属性。

**影响范围**:
- `useCustomers()` - 客户列表查询
- `useCustomer()` - 客户详情查询
- `useCreateCustomer()` - 创建客户
- `useUpdateCustomer()` - 更新客户
- `useDeleteCustomer()` - 删除客户

---

## 浏览器模块加载问题

### 问题: require is not defined

**症状**:
```
ReferenceError: require is not defined
at cell (customers-table.tsx:91:43)
```

**原因**: 在浏览器环境中使用 CommonJS 的 `require()` 进行动态导入

**错误示例**:
```typescript
// ❌ 错误 - 浏览器不支持 require
const columns = customersColumns.map((col) => {
  if (col.id === 'actions') {
    return {
      ...col,
      cell: (props: any) => {
        const { DataTableRowActions } = require('./data-table-row-actions')
        return <DataTableRowActions {...props} />
      }
    }
  }
})
```

**正确做法**:
```typescript
// ✅ 正确 - 在文件顶部静态导入
import { DataTableRowActions } from './data-table-row-actions'

const columns = useMemo(() => {
  return customersColumns.map((col) => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: (props: any) => (
          <DataTableRowActions
            row={props.row}
            onEdit={onEdit}
            onDelete={handleDelete}
          />
        )
      }
    }
    return col
  })
}, [onEdit, handleDelete])
```

**关键点**:
1. 使用 ES6 静态 `import` 而非 CommonJS `require()`
2. 使用 `useMemo` 缓存列定义，避免每次渲染重新创建
3. 使用 `useCallback` 稳定回调函数引用

---

## Orval 生成问题

### 问题: Orval 生成失败

**症状**: 运行 `pnpm run generate:api` 报错

**解决方案**:
```bash
# 1. 确认后端服务运行
curl http://localhost:7890/api-docs-json

# 2. 检查 orval.config.ts 配置
# frontend/orval.config.ts
input: {
  target: 'http://localhost:7890/api-docs-json',
}

# 3. 清除缓存重试
rm -rf frontend/node_modules/.vite
cd frontend && pnpm run generate:api
```

---

## API 调用问题

### 问题: 404 错误

**可能原因**: API 路径错误

**检查步骤**:
1. 查看浏览器 Network 面板
2. 确认请求 URL 不包含 `/api` 前缀
3. 应该是 `http://localhost:7890/customers`
4. 不应该是 `http://localhost:7890/api/customers`

---

### 问题: CORS 错误

**可能原因**: 后端未配置 CORS

**解决方案**: 在 `backend/main.ts` 添加 CORS 配置：
```typescript
app.enableCors({
  origin: 'http://localhost:3456',
  credentials: true,
})
```

---

### 问题: 类型错误

**可能原因**: 未重新生成 API

**解决方案**:
```bash
cd frontend
pnpm run generate:api
```

---

### 问题: 401 错误

**可能原因**: Token 未添加

**检查步骤**:
1. 确认 localStorage 中有 token
2. 检查 mutator 拦截器是否正确添加 Authorization header
3. 查看浏览器 Network 面板的 Request Headers

---

## Tailwind CSS 问题

### 问题: 样式不生效

**症状**: 添加的 Tailwind 类名不工作

**解决方案**:
```bash
# 1. 检查类名是否正确
# 2. 确认内容在 src 目录下
# 3. 检查 tailwind.config.js 中的 content 配置
# 4. 重启开发服务器
```

---

## 通用调试技巧

### 检查后端服务

```bash
# 检查后端是否运行
curl http://localhost:7890/health

# 检查 Swagger 文档
curl http://localhost:7890/api-docs-json

# 检查特定 API
curl http://localhost:7890/customers
```

### 检查前端服务

```bash
# 检查前端是否运行
curl http://localhost:3456

# 检查代理配置
cat frontend/vite.config.ts | grep -A 5 "proxy"
```

### 检查生成的 API

```bash
# 查看 API 文件
ls frontend/src/services/api.ts

# 查看类型定义
ls frontend/src/models/

# 检查特定类型
cat frontend/src/models/customerControllerFindAllParams.ts
```

### 浏览器开发者工具

1. **Network 面板**: 查看实际请求 URL 和响应
2. **Console 面板**: 查看错误信息
3. **React DevTools**: 查看组件树和状态
4. **TanStack Query Devtools**: 查看查询缓存和状态

---

## 模块导入和启动问题

### 问题: 后端模块依赖注入错误

**症状**:
```
Nest can't resolve dependencies of the SchedulerMetadataAccessor (?).
Please make sure that the argument Reflector at index [0] is available in the ScheduleModule context.

Nest can't resolve dependencies of the BullExplorer (?, DiscoveryService, BullMetadataAccessor, MetadataScanner).
Please make sure that the argument ModuleRef at index [0] is available in the BullModule context.
```

**原因**: NestJS 模块（`@nestjs/schedule`、`@nestjs/bull`）需要特定的提供者（`Reflector`、`ModuleRef`），但未正确配置。

**决策流程**（重要）:
遇到此类问题时，**必须先询问用户**，而不是直接注释掉模块：

1. **识别问题**：确定是哪个模块的依赖注入问题
2. **询问用户**：
   ```
   检测到 [模块名] 存在依赖注入问题。
   这是一个可选的功能模块。

   请选择解决方案：
   1. 暂时禁用该模块（注释掉），让系统先运行起来
   2. 修复该模块的依赖注入问题

   如果选择修复，我需要查询 NestJS 最佳实践来正确配置该模块。
   ```

3. **根据用户选择执行**：
   - 选择 1：注释掉模块导入
   - 选择 2：查询最佳实践并修复，记录解决方案到本文档

**如果选择修复**：

#### ScheduleModule 依赖注入问题

**问题**：`@nestjs/schedule` 的 `SchedulerMetadataAccessor` 需要 `Reflector`

**正确修复方法**：

```typescript
// 方法 1: 在 AppModule 中提供 Reflector
import { Reflector } from '@nestjs/core';

@Module({
  providers: [Reflector],
  // ...
})
export class AppModule {}

// 方法 2: 在 SchedulerModule 中导入提供 Reflector 的模块
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // 其他需要 Reflector 的模块
  ],
})
export class SchedulerModule {}
```

**注意**：`ScheduleModule.forRoot()` 应该只在根模块（`AppModule`）中调用一次，不要在子模块中重复调用。

#### BullModule 依赖注入问题

**问题**：`@nestjs/bull` 的 `BullExplorer` 需要 `ModuleRef`

**正确修复方法**：

```typescript
// BullModule.forRoot() 应该在 AppModule 中调用
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    // 其他模块
  ],
})
export class AppModule {}

// 在子模块中只注册队列
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'queue-name',
    }),
  ],
})
export class FeatureModule {}
```

**重要**：
- `BullModule.forRoot()` 只在根模块调用一次
- 子模块使用 `BullModule.registerQueue()` 注册队列
- `ModuleRef` 由 NestJS 自动提供，不需要手动添加

---

### 问题: i18n 翻译文件路径错误

**症状**:
```
I18nError: i18n path (/Users/shichenyang/WebstormProjects/qzt/backend/dist/src/i18n/) cannot be found
```

**原因**: 编译后的文件在 `dist/` 目录，但 i18n 翻译文件在 `src/i18n/`，路径配置错误

**解决方案**:

```typescript
// backend/src/app.module.ts
I18nModule.forRoot({
  fallbackLanguage: 'zh',
  loaderOptions: {
    // ❌ 错误 - 指向 dist/src/i18n/
    path: path.join(__dirname, '/i18n/'),

    // ✅ 正确 - 指向 src/i18n/
    path: path.join(__dirname, '../../src/i18n/'),
    watch: true,
  },
  resolvers: [AcceptLanguageResolver],
}),
```

**说明**：
- `__dirname` 在编译后指向 `dist/src/app.module.js` 所在目录
- 使用 `../../src/i18n/` 回到项目根目录下的 `src/i18n/`
- 或者将 i18n 文件复制到 dist 目录（不推荐）

---

### 问题: 前端 API 导入名称不匹配

**症状**:
```
The requested module '/src/services/api/auth.ts' does not provide an export named 'get'
```

**原因**: Orval 生成的导出名称与 `index.ts` 中的导入名称不匹配

**示例**:
```typescript
// Orval 生成的 auth.ts 导出
export const getAuth = () => { ... }

// 但 index.ts 期望导入
import { get } from './auth'  // ❌ 错误 - 没有 get 导出
```

**解决方案**:

**方法 1: 修改 index.ts 导入**（推荐）
```typescript
// frontend/src/services/api/index.ts
import { getAuth as getAuthApi } from './auth'  // ✅ 使用实际导出的名称
```

**方法 2: 配置 Orval 使用特定导出名**
```typescript
// frontend/orval.config.ts
export default defineConfig({
  qzt: {
    output: {
      mode: 'tags',
      target: 'src/services/api/index.ts',
      override: {
        // 为特定标签指定导出名称
        tags: {
          auth: {
            output: './auth.ts',
            get: 'get',  // 强制使用 get 作为导出名
          },
        },
      },
    },
  },
})
```

**预防措施**:
每次运行 `pnpm run generate:api` 后，检查生成的文件导出名称是否与 `index.ts` 中的导入匹配。

**注意**：这个问题通常是临时性的，Orval 每次生成可能略有不同。如果再次出现，检查：
1. `frontend/src/services/api/*.ts` 的实际导出名称
2. `frontend/src/services/api/index.ts` 的导入语句
3. 确保两者匹配

---

## 快速修复检查清单

遇到问题时，按顺序检查：

- [ ] 使用 `./start-dev.sh` 启动服务（不是手动 `pnpm run start:dev`）
- [ ] 后端服务运行在 7890 端口
- [ ] 前端服务运行在 3456 端口
- [ ] 已运行 `pnpm run generate:api`
- [ ] API 路径没有 `/api` 前缀
- [ ] 使用 `getScrmApi()` 生成的函数
- [ ] 直接返回 API 调用结果（不访问 `.data`）
- [ ] 使用 ES6 `import` 而非 `require()`
- [ ] 路由路径没有末尾斜杠
- [ ] 浏览器控制台无错误
- [ ] 后端模块依赖注入问题已询问用户解决方案
