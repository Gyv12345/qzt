# API 开发快速参考

## 🚨 记住这个流程

```
后端 API → pnpm run generate:api → 查看类型 → 开发组件
```

## 常用命令

```bash
# 生成 API 客户端（最重要！）
cd frontend && pnpm run generate:api

# 查看后端 Swagger 文档
open http://localhost:7890/api-docs

# 类型检查
pnpm run build
```

## 代码模板

### 使用 Query 获取数据

```typescript
import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import type { Customer } from '@/models'

const { data, isLoading } = useQuery({
  queryKey: ['customers'],
  queryFn: () => {
    const { customerControllerFindAll } = getScrmApi()
    return customerControllerFindAll({ page: 1 })
  }
})
```

### 使用 Mutation 修改数据

```typescript
import { useMutation } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import type { CreateCustomerDto } from '@/models'

const mutation = useMutation({
  mutationFn: (data: CreateCustomerDto) => {
    const { customerControllerCreate } = getScrmApi()
    return customerControllerCreate(data)
  }
})

// 使用
mutation.mutate({ name: '客户名', /* ... */ })
```

### 查看类型定义

```typescript
// 查看所有可用类型
import type {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  Product,
  Contract
} from '@/models'

// IDE 会提示所有字段
const customer: Customer = {
  id: '',
  name: '',
  // ... IDE 自动补全
}
```

## ⚠️ 禁止事项

❌ 不要手写 axios 请求
❌ 不要使用 `any` 类型
❌ 不要猜测字段名
❌ 不要在前端定义 API 类型

## ✅ 推荐做法

✅ 先运行 `pnpm run generate:api`
✅ 使用 `getScrmApi()` 获取函数
✅ 导入类型 `import type { ... } from '@/models'`
✅ 让 IDE 自动补全字段
✅ 信任 TypeScript 类型检查

## 故障排查

### 问题：找不到类型

```bash
# 重新生成 API
cd frontend && pnpm run generate:api
```

### 问题：类型不匹配

```bash
# 检查是否使用最新生成的 API
git diff src/services/api.ts
git diff src/models/

# 如果有修改，恢复并重新生成
git checkout src/services/api.ts src/models/
pnpm run generate:api
```

### 问题：后端 API 变更了

```bash
# 1. 确认后端已更新
curl http://localhost:7890/health

# 2. 重新生成
cd frontend && pnpm run generate:api

# 3. 检查类型错误
pnpm run build
```

---

**记住：先看类型，再写代码！**
