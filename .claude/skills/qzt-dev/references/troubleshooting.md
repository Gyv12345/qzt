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

## 快速修复检查清单

遇到问题时，按顺序检查：

- [ ] 后端服务运行在 7890 端口
- [ ] 前端服务运行在 3456 端口
- [ ] 已运行 `pnpm run generate:api`
- [ ] API 路径没有 `/api` 前缀
- [ ] 使用 `getScrmApi()` 生成的函数
- [ ] 直接返回 API 调用结果（不访问 `.data`）
- [ ] 使用 ES6 `import` 而非 `require()`
- [ ] 路由路径没有末尾斜杠
- [ ] 浏览器控制台无错误
