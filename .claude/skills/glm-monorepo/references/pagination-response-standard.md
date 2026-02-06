# 分页响应统一规范

## 概述

本文档记录了项目分页 API 响应结构的统一规范。统一响应结构可以减少前端判断逻辑，提高代码可维护性。

## 标准响应结构

### 分页响应格式

```typescript
// ✅ 正确的分页响应结构
return {
  data: result,        // 数据数组
  total,               // 总记录数
  page,                // 当前页
  pageSize,            // 每页大小
  totalPages: Math.ceil(total / pageSize),
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | `T[]` | 数据数组，**必须使用此字段名** |
| `total` | `number` | 总记录数 |
| `page` | `number` | 当前页码（从 1 开始） |
| `pageSize` | `number` | 每页记录数 |
| `totalPages` | `number` | 总页数 |

## 禁止使用的字段名

以下字段名**禁止使用**：

- ❌ `items` - 旧客户模块使用
- ❌ `records` - 旧跟进记录模块使用
- ❌ `list` - 不符合语义
- ❌ `results` - 不符合语义

## 前端访问数据

### 正确方式

```typescript
// ✅ 正确
const items = data?.data || []
const total = data?.total || 0
```

### 错误方式

```typescript
// ❌ 错误 - 不要使用其他字段名
const items = data?.items || []
const items = data?.records || []
const items = data?.list || []
```

## 修改历史

### 2025-02-06: 分页响应统一

**问题**：后端分页响应存在三种数据字段命名
- 大多数模块：`{ data, total, page, pageSize, totalPages }`
- 客户模块：`{ items, total, page, pageSize, totalPages }`
- 跟进记录模块：`{ records, total, page, pageSize, totalPages }`

**影响**：前端需要根据不同 API 使用不同字段名访问数据，增加了维护成本

**修复方案**：

#### 后端修改（2 个文件）

| 文件 | 修改内容 | 行号 |
|------|----------|------|
| `backend/src/modules/customer/customer.service.ts` | 3 处 `items` → `data` | 177, 523, 592 |
| `backend/src/modules/follow-record/follow-record.service.ts` | 1 处 `records` → `data` | 47 |

#### 前端修改（6 个文件）

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/features/customers/components/customers-table.tsx` | `items` → `data` |
| `frontend/src/features/contacts/components/contacts-table.tsx` | `items` → `data` |
| `frontend/src/features/invoices/components/invoices-table.tsx` | `items` → `data` |
| `frontend/src/features/payments/components/payments-table.tsx` | `items` → `data` |
| `frontend/src/features/follow-records/components/follow-records-table.tsx` | `items` → `data` |
| `frontend/src/features/service-teams/components/service-team-form-dialog.tsx` | 2 处 `items` → `data` |

#### 验证步骤

1. 修改后端代码
2. 运行 `cd frontend && pnpm run generate:api` 重新生成类型
3. 修改前端代码适配新的字段名
4. 重启服务 `./start-dev.sh restart`
5. 测试各模块列表页能正常加载数据

## 后端开发指南

### 编写分页接口

```typescript
// {module}.service.ts
async findAll(query: QueryDto) {
  const { page = 1, pageSize = 10, ...filters } = query;

  // 构建查询条件
  const where = this.buildWhereClause(filters);

  // 计算总数
  const total = await this.prisma.{model}.count({ where });

  // 查询数据
  const data = await this.prisma.{model}.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  });

  // ✅ 返回标准分页结构
  return {
    data,                     // ✅ 使用 data 字段
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

### 检查清单

开发新分页接口时，确保：

- [ ] 使用 `data` 字段存储数据数组
- [ ] 返回 `total` 总记录数
- [ ] 返回 `page` 当前页码
- [ ] 返回 `pageSize` 每页大小
- [ ] 返回 `totalPages` 总页数
- [ ] 使用英文 `@ApiTags`

## 前端开发指南

### 使用分页数据

```typescript
// hooks/use-{module}s.ts
export function use{Module}s(params?: QueryParams) {
  return useQuery({
    queryKey: ['{module}s', params],
    queryFn: async () => {
      const { {module}ControllerFindAll } = getScrmApi();
      return await {module}ControllerFindAll(params);
    },
  });
}

// components/{module}s-table.tsx
const { data } = use{Module}s(queryParams);
const items = data?.data || [];  // ✅ 正确
const total = data?.total || 0;
```

### 检查清单

使用分页 API 时，确保：

- [ ] 使用 `data?.data` 访问数据数组
- [ ] 使用 `data?.total` 获取总记录数
- [ ] 已运行 `pnpm run generate:api`
- [ ] 使用 Orval 生成的类型定义

## 相关链接

- [API 开发规范](./api-patterns.md)
- [联系人 CRUD 模板](./contacts-crud-template.md)
- [故障排除指南](./troubleshooting.md)
