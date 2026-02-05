# 单一来源架构迁移总结

> **状态**: ✅ 第一阶段已完成 (2025-02-05)

## 概述

将后端 DTO 迁移到使用 `@qzt/shared-types` 作为单一真实来源，实现前后端类型自动一致。

---

## 已完成的迁移

### ✅ 数据库类型统一

**status/paymentMethod 字段迁移 (2025-02-05)：**
- `Contract.status`: Int (0,1,2) -> String (UNPAID, PARTIAL, PAID)
- `Payment.method`: String ('1','2','3','4') -> String (BANK_TRANSFER, WECHAT, ALIPAY, CASH)
- `Payment.status`: Int (0,1) -> String (PENDING, CONFIRMED, CANCELLED)
- `Contact.status`: Int (0,1) -> String (ACTIVE, INACTIVE)
- `Invoice.status`: 新增字段，默认 PENDING
- `User.status`: Int -> String (ACTIVE, INACTIVE)
- `Product.status`: Int -> String (ACTIVE, INACTIVE)

**customerLevel 字段迁移：**
- 从 `INTEGER` (0, 1, 2, 3) 迁移到 `STRING` ('LEAD', 'PROSPECT', 'CUSTOMER', 'VIP')
- 创建数据库迁移转换现有数据
- 更新 `statistics.service.ts` 使用字符串枚举比较

### ✅ 后端 DTO 迁移

| 模块 | 状态 | 说明 |
|------|------|------|
| customer | ✅ 完成 | CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto |
| auth | ✅ 完成 | LoginDto, LoginResponseDto |
| user | ✅ 完成 | CreateUserDto, UpdateUserDto, QueryUserDto |
| product | ✅ 完成 | CreateProductDto, UpdateProductDto, QueryProductDto |
| contract | ✅ 完成 | CreateContractDto, UpdateContractDto, QueryContractDto |
| payment | ✅ 完成 | CreatePaymentDto, UpdatePaymentDto, QueryPaymentDto |
| invoice | ✅ 完成 | CreateInvoiceDto, UpdateInvoiceDto, QueryInvoiceDto |
| contact | ✅ 完成 | CreateContactDto, UpdateContactDto, QueryContactDto |

### ✅ 前端 API 生成

- Orval 自动从 Swagger 生成类型
- `customerLevel` 生成为 TypeScript 枚举类型 `CreateCustomerDtoCustomerLevel`
- 新增支付相关 API 文件

---

## 迁移模式（最终方案）

由于 `applySwaggerDecorators` 在 NestJS 中存在兼容性问题，最终采用以下模式：

```typescript
// backend/src/modules/customer/dto/create-customer.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsIn } from 'class-validator'
import type { Login } from '@qzt/shared-types/dist/auth/schemas'

export class CreateCustomerDto implements Login {
  @ApiPropertyOptional({
    description: '客户等级',
    example: 'LEAD',
    enum: ['LEAD', 'PROSPECT', 'CUSTOMER', 'VIP'],
  })
  @IsOptional()
  @IsIn(['LEAD', 'PROSPECT', 'CUSTOMER', 'VIP'])
  customerLevel?: string
  // ... 其他字段
}
```

**关键点：**
1. 使用 `implements` 关键字引用 shared-types 类型确保类型一致性
2. 保留 `class-validator` 装饰器用于运行时验证
3. 保留 `@nestjs/swagger` 装饰器用于 API 文档

---

## 开发新功能时的类型定义流程

1. **修改 shared-types**：在 `packages/shared-types/src/` 中添加/修改 Zod Schema
2. **构建 shared-types**：`cd packages/shared-types && pnpm build`
3. **更新后端 DTO**：确保 DTO 类 implements shared-types 导出的类型
4. **重启后端**：`cd backend && pnpm start:dev`
5. **重新生成前端 API**：`cd frontend && pnpm run generate:api`

---

## 已知问题与解决方案

### SQLite 不支持枚举

**问题**: SQLite 不支持原生 ENUM 类型

**解决**: 使用 `String` 类型 + 应用层验证 (Zod Schema + class-validator)

### Orval 子路径导出问题

**问题**: TypeScript 无法解析 `@qzt/shared-types/customer` 类型的子路径导出

**解决**:
- 移除 package.json 中的 `exports` 字段
- 使用 `import type { ... } from '@qzt/shared-types/dist/xxx/schemas'` 导入类型

---

## 相关文件

| 文件 | 用途 |
|------|------|
| `packages/shared-types/` | 共享类型定义包 |
| `backend/prisma/schema.prisma` | 数据库 Schema |
| `backend/src/modules/*/dto/` | 后端 DTO 定义 |
| `frontend/src/models/` | Orval 生成的类型定义 |
| `frontend/orval.config.ts` | Orval 配置 |
