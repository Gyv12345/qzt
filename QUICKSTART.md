# 🚀 前后端协作快速上手

## 核心机制：自动化检查 + 类型契约

### 📌 关键命令

```bash
# 前端开发前必做
cd frontend && pnpm check:api

# 后端修改 API 后必做
cd backend && pnpm check:api

# 对比前后端契约（发现不一致）
pnpm check:contract
```

---

## 🎯 实战场景

### 场景 1: 开发新模块（如：客户管理）

#### 后端开发者
```bash
# 1. 创建 Controller
@ApiTags('customers')  # ⚠️ 必须使用英文
@Controller('customers')
export class CustomersController {
  @Get()
  @ApiQuery({ name: 'page', required: false })
  findAll(@Query() query: FindAllDto) {
    // ...
  }
}

# 2. 启动服务
pnpm run start:dev

# 3. 运行检查
pnpm check:api

# 4. 通知前端："customers 模块 API 已就绪"
```

#### 前端开发者
```bash
# 1. 运行检查脚本
cd frontend && pnpm check:api

# 2. 查看生成的文件
# - src/services/api/customers.ts (API 方法)
# - src/models/customer*.ts (类型定义)

# 3. 如果是新模块，添加到 index.ts
# 编辑 src/services/api/index.ts:
import { getCustomers } from './customers'

export const getScrmApi = () => ({
  getCustomers(),  # 添加这一行
  // ...
})

# 4. 开发功能
# 在 features/customers/hooks/use-customers.ts 中:
import { getScrmApi } from '@/services/api'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      return await getScrmApi().customers().customerControllerFindAll()
    },
  })
}

# 5. 如果发现缺字段 → 找后端补充 DTO
```

---

### 场景 2: 修改现有 API（如：添加字段）

#### 后端修改
```typescript
// 修改 DTO，添加新字段
export class UpdateCustomerDto {
  name: string
  newField: string  # 新增字段
}

// 运行检查
pnpm check:api  # 会提示通知前端
```

#### 前端响应
```bash
# 1. 重新生成 API
cd frontend && pnpm generate:api

# 2. 检查类型变化
git diff src/models/update-customer-dto.ts

# 3. 更新使用该 API 的代码
# 4. 运行契约对比
pnpm check:contract
```

---

## ⚠️ 常见陷阱（必看）

### 陷阱 1: 分页字段不统一

**问题**：不同 API 返回不同结构

```typescript
// ❌ 错误：假设都是 items
const customers = data?.items || []

// ✅ 正确：查看实际 API 返回
// 方法 1: 浏览器 Network 标签查看响应
// 方法 2: curl 测试
curl http://localhost:7890/customers | jq

// 根据实际情况访问
const customers = data?.items || []  # 客户、联系人
const products = data?.data || []    # 产品、合同
const roles = data || []             # 权限（直接返回数组）
```

### 陷阱 2: 传递不存在参数

```typescript
// ❌ 错误：传递后端不支持的参数
await api.permissions().permissionControllerFindAllRoles({ page: 1 })

// ✅ 正确：查看类型定义
// 文件：src/models/permissionControllerFindAllRolesParams.ts
// 如果文件不存在或为空，说明不需要参数
await api.permissions().permissionControllerFindAllRoles()
```

### 陷阱 3: 忘记导出模块

```typescript
// ❌ 错误：Orval 生成了文件，但未导出
// src/services/api/index.ts
export const getScrmApi = () => ({
  // 缺少 newModule
})

// ✅ 正确：手动添加导出
import { getNewModule } from './new-module'

export const getScrmApi = () => ({
  getNewModule(),  # 添加
})
```

---

## 🔍 调试技巧

### 查看 API 信息
```bash
# 方式 1: 查看 Swagger 文档
curl http://localhost:7890/api-docs-json | jq '.paths'

# 方式 2: 查看 Tags
curl http://localhost:7890/api-docs-json | jq '.tags'

# 方式 3: 测试特定接口
curl http://localhost:7890/customers | jq
```

### 查看前端类型
```bash
# 列出所有类型文件
ls frontend/src/models/

# 查看特定类型
cat frontend/src/models/customer.ts

# 查看生成的 API
cat frontend/src/services/api/customers.ts
```

### 对比前后端
```bash
# 运行契约对比工具
pnpm check:contract

# 会显示：
# - 前端使用的 API
# - 后端提供的 API
# - 不一致的地方
```

---

## 📋 开发检查清单

### 后端开发者
- [ ] 使用 **英文** `@ApiTags('modulename')`
- [ ] 使用 `@ApiQuery()` 定义查询参数
- [ ] DTO 字段完整且类型正确
- [ ] Swagger 文档准确（端口 7890）
- [ ] 运行 `pnpm check:api` 检查
- [ ] 通知前端 API 已更新

### 前端开发者
- [ ] 运行 `pnpm check:api` 确保最新
- [ ] 查看 `src/services/api/<module>.ts`
- [ ] 查看 `src/models/<type>.ts` 了解字段
- [ ] 在 `index.ts` 中导出新模块
- [ ] 使用 `getScrmApi()` 调用
- [ ] 缺字段 → 找后端补充

---

## 💡 关键原则

1. **契约优先**：Swagger 文档即契约
2. **类型驱动**：看类型定义，不假设字段
3. **自动化**：使用脚本，避免手动检查
4. **快速反馈**：立即发现不一致，不拖延

---

## 🆘 遇到问题？

### 问题: 类型错误
```bash
# 1. 重新生成 API
cd frontend && pnpm generate:api

# 2. 检查是否导出模块
cat frontend/src/services/api/index.ts

# 3. 查看实际类型
cat frontend/src/models/<your-type>.ts
```

### 问题: API 调用失败
```bash
# 1. 确认后端运行
curl http://localhost:7890/api-docs-json

# 2. 查看 Swagger 文档
open http://localhost:7890/api-docs

# 3. 测试接口
curl http://localhost:7890/<endpoint>
```

### 问题: 前后端不一致
```bash
# 运行对比工具
pnpm check:contract

# 根据提示修复：
# - 前端缺字段 → 找后端补充
# - 后端缺接口 → 后端补充
```

---

## 📚 相关文件

- **流程文档**: [API_CONTRACT_WORKFLOW.md](./API_CONTRACT_WORKFLOW.md)
- **前端脚本**: `frontend/check-api-consistency.sh`
- **后端脚本**: `backend/check-api-changes.sh`
- **契约对比**: `scripts/compare-api-contract.ts`

---

**记住**：这套机制的核心是让前后端通过 **Swagger 契约** 保持一致，而不是靠人肉沟通和文档。
