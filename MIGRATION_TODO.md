# 单一来源架构迁移任务清单

## 概述

将后端 DTO 迁移到使用 `@qzt/shared-types` 作为单一真实来源，实现前后端类型自动一致。

---

## 第一阶段：后端 DTO 迁移

### 1.1 按模块迁移后端 DTO

对每个模块执行以下操作：

#### 模块列表（按优先级）

| 优先级 | 模块 | 文件路径 | 状态 |
|--------|------|----------|------|
| P0 | customer | `backend/src/modules/customer/dto/` | ⏳ 待执行 |
| P0 | auth | `backend/src/modules/auth/dto/` | ⏳ 待执行 |
| P1 | user | `backend/src/modules/users/dto/` | ⏳ 待执行 |
| P1 | product | `backend/src/modules/product/dto/` | ⏳ 待执行 |
| P1 | contract | `backend/src/modules/contract/dto/` | ⏳ 待执行 |
| P2 | payment | `backend/src/modules/payment/dto/` | ⏳ 待执行 |
| P2 | invoice | `backend/src/modules/invoice/dto/` | ⏳ 待执行 |
| P2 | contact | `backend/src/modules/contact/dto/` | ⏳ 待执行 |
| P3 | 其他模块 | - | ⏳ 待执行 |

#### 单个模块迁移步骤

以 `customer` 模块为例：

```bash
# 1. 备份现有 DTO（可选）
cd backend/src/modules/customer
mv dto dto.backup

# 2. 创建新的 DTO 文件
mkdir -p dto
```

**新建 `dto/index.ts`：**

```typescript
// backend/src/modules/customer/dto/index.ts

import { applySwaggerDecorators } from '@qzt/shared-types/utils'
import {
  CreateCustomerDto as BaseCreateCustomerDto,
  UpdateCustomerDto as BaseUpdateCustomerDto,
  QueryCustomerDto as BaseQueryCustomerDto,
  createCustomerSchema,
  updateCustomerSchema,
  queryCustomerSchema,
} from '@qzt/shared-types/customer'

// 创建客户 DTO - 添加自定义 Swagger 描述
export const CreateCustomerDto = applySwaggerDecorators(
  BaseCreateCustomerDto,
  createCustomerSchema,
  {
    name: { description: '公司名称', example: 'XX科技有限公司' },
    shortName: { description: '公司简称', example: 'QZT' },
    code: { description: '公司编码', example: 'QZT001' },
    industry: { description: '所属行业', example: '软件开发' },
    scale: { description: '公司规模', example: '11-50人' },
    address: { description: '公司地址' },
    website: { description: '公司网站', example: 'https://example.com' },
    customerLevel: { description: '客户等级', example: 'LEAD' },
    sourceChannel: { description: '来源渠道' },
    followUserId: { description: '跟进人ID', example: 'user_123' },
    tags: { description: '标签（JSON数组）' },
    remark: { description: '备注' },
  }
)

// 更新客户 DTO - 所有字段可选
export const UpdateCustomerDto = applySwaggerDecorators(
  BaseUpdateCustomerDto,
  updateCustomerSchema,
  {
    name: { description: '公司名称' },
    shortName: { description: '公司简称' },
    // ... 其他字段
  }
)

// 查询客户 DTO
export const QueryCustomerDto = applySwaggerDecorators(
  BaseQueryCustomerDto,
  queryCustomerSchema,
  {
    page: { description: '页码', example: 1 },
    pageSize: { description: '每页数量', example: 10 },
    keyword: { description: '搜索关键词' },
    customerLevel: { description: '客户等级' },
    status: { description: '客户状态' },
    followUserId: { description: '跟进人ID' },
    sortField: { description: '排序字段' },
    sortOrder: { description: '排序方向', example: 'desc' },
  }
)
```

**更新 Controller：**

```typescript
// backend/src/modules/customer/controllers/customer.controller.ts

// 修改前
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from '../dto'

// 修改后（导入路径不变，内容已变更）
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from '../dto'
```

---

### 1.2 验证 Swagger 文档

```bash
# 1. 重启后端
cd backend && pnpm start:dev

# 2. 访问 Swagger 文档
open http://localhost:7890/api-docs

# 3. 检查：
# - DTO 字段是否正确显示
# - 枚举值是否正确
# - 描述和示例是否显示
```

---

## 第二阶段：前端 API 重新生成

### 2.1 重新生成 API

```bash
# 1. 确保 shared-types 已构建
cd packages/shared-types && pnpm build

# 2. 重新生成前端 API
cd frontend && pnpm run generate:api

# 3. 检查生成的文件
ls -la src/services/api/
ls -la src/models/
```

### 2.2 更新前端 index.ts（如果需要）

如果新生成了新的 API 文件（如 `payment-orders.ts`），需要更新 `src/services/api/index.ts`：

```typescript
// frontend/src/services/api/index.ts

// 添加新的导入
import { getPaymentOrders } from './payment-orders'
import { getPaymentConfigs } from './payment-configs'
import { getPaymentWebhooks } from './payment-webhooks'
import { getPaymentWebhooksPublic } from './payment-webhooks-public'

// 添加到导出
export { getPaymentOrders, getPaymentConfigs, getPaymentWebhooks, getPaymentWebhooksPublic }

// 添加到 getScrmApi
export const getScrmApi = () => ({
  // ... 其他
  ...getPaymentOrders(),
  ...getPaymentConfigs(),
  ...getPaymentWebhooks(),
  ...getPaymentWebhooksPublic(),
})
```

---

## 第三阶段：验证与测试

### 3.1 后端验证

```bash
# 1. 单元测试
cd backend && pnpm test

# 2. API 测试
curl -X POST http://localhost:7890/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"测试公司","customerLevel":"LEAD"}'
```

### 3.2 前端验证

```bash
# 1. 启动前端
cd frontend && pnpm dev

# 2. 检查：
# - 页面是否正常加载
# - API 调用是否成功
# - 类型提示是否正确
```

---

## 第四阶段：清理旧代码

### 4.1 删除备份的 DTO 文件

```bash
# 确认迁移成功后删除备份
rm -rf backend/src/modules/*/dto.backup
```

### 4.2 更新文档

更新项目文档，说明新的类型定义方式。

---

## 常见问题

### Q1: Swagger 中枚举显示不正确？

**A:** 检查 Zod Schema 中的枚举定义，确保使用 `z.enum()` 而不是 `z.nativeEnum()`。

### Q2: 前端生成的类型与后端不一致？

**A:** 执行以下步骤：
1. 确保后端已重启
2. 确保 Swagger 文档是最新的
3. 重新运行 `pnpm run generate:api`

### Q3: 如何添加新的 DTO 字段？

**A:** 修改 `shared-types` 中的 Zod Schema，然后：
1. `cd packages/shared-types && pnpm build`
2. 重启后端
3. `cd frontend && pnpm run generate:api`

### Q4: `applySwaggerDecorators` 报错？

**A:** 确保：
1. `@nestjs/swagger` 已安装
2. `shared-types` 包已构建
3. 导入路径正确

---

## 执行检查清单

### 准备阶段
- [ ] 确认 `@qzt/shared-types` 已构建
- [ ] 确认后端已安装 `@nestjs/swagger`
- [ ] 确认前端已配置 Orval

### 执行阶段
- [ ] 迁移 customer 模块
- [ ] 迁移 auth 模块
- [ ] 迁移 user 模块
- [ ] 迁移 product 模块
- [ ] 迁移 contract 模块
- [ ] 迁移 payment 模块
- [ ] 迁移 invoice 模块
- [ ] 迁移 contact 模块
- [ ] 迁移其他模块

### 验证阶段
- [ ] 后端 Swagger 文档正确
- [ ] 前端 API 生成成功
- [ ] 前端页面功能正常
- [ ] 类型检查通过

### 清理阶段
- [ ] 删除备份文件
- [ ] 更新项目文档

---

## 相关文件

| 文件 | 用途 |
|------|------|
| `packages/shared-types/src/utils/swagger.ts` | Swagger 装饰器工具 |
| `packages/shared-types/src/customer/schemas/` | 客户 Schema 定义 |
| `backend/src/modules/customer/dto/index.ts` | 客户 DTO（待迁移） |
| `frontend/orval.config.ts` | Orval 配置 |
| `frontend/src/services/api/index.ts` | API 导出文件 |
