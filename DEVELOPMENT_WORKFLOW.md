# 前端开发流程规范

## ⚠️ 重要原则

### API 开发流程

**前端不能直接修改或手写 API 调用代码！**

必须遵循以下流程：

```
1. 后端开发 API
   ↓
2. 运行 pnpm run generate:api
   ↓
3. 查看 API 字段定义
   ↓
4. 开发前端组件/功能
```

## 详细步骤

### 1. 后端 API 开发

后端开发完成后，确保：
- 后端服务运行在 `http://localhost:7890`
- Swagger 文档可访问：`http://localhost:7890/api-docs-json`

### 2. 生成前端 API 客户端

```bash
cd frontend
pnpm run generate:api
```

Orval 会自动：
- 从后端 Swagger 获取 OpenAPI 规范
- 生成类型安全的 API 客户端
- 更新 `src/services/api.ts`
- 生成 TypeScript 模型到 `src/models/`

### 3. 查看 API 字段定义

在开发前，先查看 API 有哪些字段：

**方法 1：查看生成的类型定义**
```typescript
import type { Customer, CreateCustomerDto } from '@/models'

// 查看 Customer 类型了解字段结构
// 查看 CreateCustomerDto 了解创建时需要的字段
```

**方法 2：查看 Swagger 文档**
```bash
# 在浏览器打开
open http://localhost:7890/api-docs
```

**方法 3：查看生成的 API 函数**
```typescript
// src/services/api.ts
import { getScrmApi } from '@/services/api'

const { customerControllerCreate } = getScrmApi()

// IDE 会显示该函数需要什么参数、返回什么类型
```

### 4. 开发前端组件

确认字段后，开始开发组件：

```typescript
import { useMutation } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import type { CreateCustomerDto } from '@/models'

function CreateCustomerForm() {
  const mutation = useMutation({
    mutationFn: (data: CreateCustomerDto) => {
      const { customerControllerCreate } = getScrmApi()
      return customerControllerCreate(data)
    }
  })

  const handleSubmit = (formData: CreateCustomerDto) => {
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 根据CreateCustomerDto的字段渲染表单 */}
    </form>
  )
}
```

## 示例：完整的开发流程

### 场景：开发客户列表页面

#### 步骤 1：生成 API

```bash
cd frontend
pnpm run generate:api
```

#### 步骤 2：查看 API 定义

生成的 API 函数（`src/services/api.ts`）：
```typescript
const customerControllerFindAll = (
  params?: CustomerControllerFindAllParams
) => {
  return customInstance<Customer[]>({
    url: `/customers`,
    method: 'GET',
    params
  })
}
```

类型定义（`src/models/`）：
```typescript
export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  level: number
  status: 'ACTIVE' | 'INACTIVE'
  // ... 其他字段
}

export interface CustomerControllerFindAllParams {
  page?: number
  pageSize?: number
  keyword?: string
  customerLevel?: number
  // ... 其他查询参数
}
```

#### 步骤 3：开发组件

```typescript
import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import type { Customer } from '@/models'

export function CustomerList() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { customerControllerFindAll } = getScrmApi()
      return customerControllerFindAll({
        page: 1,
        pageSize: 10
      })
    }
  })

  if (isLoading) return <div>加载中...</div>

  return (
    <div>
      {data?.map((customer: Customer) => (
        <div key={customer.id}>
          {/* 使用 Customer 类型的字段 */}
          <h3>{customer.name}</h3>
          <p>等级: {customer.level}</p>
          <p>状态: {customer.status}</p>
        </div>
      ))}
    </div>
  )
}
```

## 常见问题

### Q: 为什么不能直接手写 API 调用？

**A:**
- ❌ **手动编写容易出错**：字段名、类型可能不匹配
- ❌ **缺乏类型安全**：没有 TypeScript 类型检查
- ❌ **难以维护**：后端 API 变更时，前端需要手动同步
- ❌ **重复劳动**：每次都要写相似的 axios 请求代码

**使用 Orval 的优势：**
- ✅ **类型安全**：自动生成 TypeScript 类型
- ✅ **自动同步**：后端变更后重新生成即可
- ✅ **减少错误**：编译时就能发现类型错误
- ✅ **提高效率**：专注于业务逻辑，不关心 API 调用细节

### Q: 后端 API 还没开发好怎么办？

**A:** 和后端确认 API 设计，然后：
1. 后端先提供 Swagger 定义（可以先不实现）
2. 运行 `pnpm run generate:api` 生成类型
3. 前端基于类型开发组件
4. 后端实现后联调测试

### Q: 需要修改 API 怎么办？

**A:** 不在前端修改！正确流程：
1. 修改后端 API 代码
2. 更新后端 Swagger 注解
3. 运行 `pnpm run generate:api`
4. 前端会自动获得更新后的类型和函数

### Q: 生成的类型不满足需求怎么办？

**A:**
- 如果是字段缺失：联系后端添加字段
- 如果需要扩展：可以创建派生类型
  ```typescript
  import type { Customer } from '@/models'

  // 扩展类型
  interface CustomerWithExtra extends Customer {
    displayName: string
    computedField: number
  }

  // 使用工具类型
  type CustomerForm = Omit<Customer, 'id' | 'createdAt'>
  ```

## 工具和命令

### 生成 API 客户端

```bash
cd frontend
pnpm run generate:api
```

### 查看后端 Swagger 文档

```bash
# 在浏览器打开
open http://localhost:7890/api-docs

# 或查看 JSON 格式
curl http://localhost:7890/api-docs-json | jq
```

### 类型检查

```bash
# 确保类型正确
pnpm run build
```

## 最佳实践

1. **先看类型，再写代码**
   - 开发新功能前，先查看相关的 TypeScript 类型
   - 使用 IDE 的类型提示和自动补全

2. **充分利用类型**
   - 使用 `import type` 导入类型
   - 避免使用 `any`，让 TypeScript 保护你

3. **后端优先**
   - 前端依赖后端的类型定义
   - 后端变更后，前端及时重新生成

4. **版本控制**
   - 生成的 `src/services/api.ts` 和 `src/models/` 提交到 Git
   - 团队成员保持同步

5. **代码审查**
   - PR 检查是否使用了正确的 API 类型
   - 确保没有手写的 API 调用代码

---

**记住：前端开发 = 确认 API 字段 → 使用类型 → 编写组件**

这个流程能保证：
- ✅ 类型安全
- ✅ 前后端同步
- ✅ 减少错误
- ✅ 提高效率
