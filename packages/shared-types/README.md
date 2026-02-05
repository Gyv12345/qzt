# @qzt/shared-types

QZT 企账通项目前后端共享类型包 - **单一真实来源架构**。

## 概述

该包提供了前后端共享的类型定义和验证规则，基于 [Zod](https://zod.dev/) 实现。

- ✅ 类型安全：TypeScript 类型自动从 Zod Schema 推断
- ✅ 运行时验证：前后端共用相同的验证逻辑
- ✅ 单一数据源：类型定义只在一处维护，Orval 自动生成前端类型

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     单一真实来源架构                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  @qzt/shared-types (唯一来源)                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Zod Schema  →  DTO 类  →  Swagger 装饰器            │    │
│  │  customer.schema.ts  →  CreateCustomerDto           │    │
│  └─────────────────────────────────────────────────────┘    │
│           ↓                        ↓                        │
│    后端直接使用            Orval 自动生成                     │
│                          (类型自动一致)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
src/
├── customer/          # 客户模块
│   ├── schemas/      # Zod Schemas
│   └── dtos/         # DTO 导出层（后端用）
├── contract/         # 合同模块
├── product/          # 产品模块
├── invoice/          # 发票模块
├── payment/          # 收款模块
├── auth/             # 认证模块
├── user/             # 用户模块
├── contact/          # 联系人模块
├── common/           # 通用类型
│   └── schemas/      # 分页、响应等
├── utils/            # 工具函数
└── index.ts          # 统一导出入口
```

## 使用方式

### 前端使用

```typescript
// 导入类型和 Schema
import {
  customerSchema,
  createCustomerSchema,
  type Customer,
  type CustomerLevel,
} from '@qzt/shared-types/customer'

// 表单验证
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const form = useForm({
  resolver: zodResolver(createCustomerSchema),
  defaultValues: {
    name: '',
    customerLevel: 'LEAD',
  },
})
```

### 后端使用

```typescript
// 导入共享 DTO 和 Schema
import {
  CreateCustomerDto,
  createCustomerSchema,
} from '@qzt/shared-types/customer'

// 方式一：直接使用（无自定义 Swagger 描述）
export { CreateCustomerDto } from '@qzt/shared-types/customer'

// 方式二：添加自定义 Swagger 描述（推荐）
import { applySwaggerDecorators } from '@qzt/shared-types/utils'

export const CreateCustomerDtoWithSwagger = applySwaggerDecorators(
  CreateCustomerDto,
  createCustomerSchema,
  {
    name: { description: '公司名称', example: 'XX科技有限公司' },
    shortName: { description: '公司简称' },
    code: { description: '公司编码', example: 'QZT001' },
  }
)

// 在 Controller 中使用
@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  @Post()
  @ApiOperation({ summary: '创建客户' })
  async create(@Body() dto: CreateCustomerDtoWithSwagger) {
    // dto 自动带有 Zod 验证和 Swagger 装饰器
    return this.customerService.create(dto)
  }
}
```

## 迁移状态

| 模块 | Schema | DTO | 前端 | 后端 |
|------|--------|-----|------|------|
| common | ✅ | - | ✅ | ✅ |
| customer | ✅ | ⏳ | ⏳ | ⏳ |
| contract | ⏳ | ⏳ | ⏳ | ⏳ |
| product | ⏳ | ⏳ | ⏳ | ⏳ |
| invoice | ⏳ | ⏳ | ⏳ | ⏳ |
| payment | ⏳ | ⏳ | ⏳ | ⏳ |
| auth | ⏳ | ⏳ | ⏳ | ⏳ |
| user | ⏳ | ⏳ | ⏳ | ⏳ |
| contact | ⏳ | ⏳ | ⏳ | ⏳ |

## 开发

```bash
# 构建
pnpm build

# 监听模式
pnpm dev

# 类型检查
pnpm type-check

# 清理
pnpm clean
```

## 注意事项

1. **枚举值变更**：数据库中存储的是数字（0, 1, 2...），但 Schema 使用字符串枚举（'LEAD', 'PROSPECT'...），需要在 Service 层进行映射
2. **日期格式**：使用 `z.coerce.date()` 自动将字符串转换为 Date 对象
3. **可选字段**：更新类 DTO 使用 `.partial()` 使所有字段变为可选
