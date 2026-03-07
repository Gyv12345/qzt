# 分页响应规范

## 标准结构

```typescript
return {
  data: result,                      // 数据数组
  total,                             // 总记录数
  page,                              // 当前页（从1开始）
  pageSize,                          // 每页大小
  totalPages: Math.ceil(total / pageSize),
}
```

## 字段说明

| 字段 | 类型 | 必需 |
|------|------|------|
| `data` | `T[]` | ✅ 必须用此字段名 |
| `total` | `number` | ✅ |
| `page` | `number` | ✅ |
| `pageSize` | `number` | ✅ |
| `totalPages` | `number` | ✅ |

## 禁止使用的字段名

- ❌ `items` - 旧客户模块
- ❌ `records` - 旧跟进记录模块
- ❌ `list`, `results`

## 前端访问

```typescript
// ✅ 正确
const items = data?.data || []
const total = data?.total || 0

// ❌ 错误
const items = data?.items || []
```

## 相关文档

- [CRUD 模板](./contacts-crud-template.md)
- [故障排除](./troubleshooting.md)
