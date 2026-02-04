# QZT Prisma 最佳实践

## 关联查询的三种方式

### 1. 自动关联（直接访问外键）

适用于只需要外键 ID 的情况：

```typescript
const customers = await prisma.customer.findMany({
  select: {
    id: true,
    name: true,
    followUserId: true,  // 直接访问外键
  }
})
```

### 2. include + select（推荐）

适用于需要关联对象的特定字段：

```typescript
const contract = await prisma.contract.findUnique({
  where: { id },
  include: {
    customer: {
      select: { id: true, name: true, contactPhone: true }
    },
    product: {
      select: { id: true, name: true, price: true }
    }
  }
})
```

### 3. 手动链接查询

仅在以下场景使用：
- 性能敏感场景（大数据量）
- 需要复杂过滤的关联数据
- 多处复用同一批关联数据

```typescript
const [contracts, customers] = await Promise.all([
  prisma.contract.findMany({
    where: { status: 0 },
    select: { id: true, contractNo: true, customerId: true }
  }),
  prisma.customer.findMany({
    where: {
      id: { in: contracts.map(c => c.customerId) },
      status: 1  // 独立过滤条件
    }
  })
])
```

## 核心原则

✅ **优先使用 include + select**：
- 代码简洁，类型安全
- Prisma 自动优化查询（使用 JOIN）
- 避免返回过多字段

✅ **始终使用 select 限制字段**：
```typescript
// ❌ 返回所有字段
include: { customer: true }

// ✅ 只返回需要的字段
include: {
  customer: {
    select: { id: true, name: true }
  }
}
```

❌ **避免反模式**：
```typescript
// ❌ N+1 查询
for (const contract of contracts) {
  const customer = await prisma.customer.findUnique({
    where: { id: contract.customerId }
  })
}

// ❌ 简单场景过度优化（使用手动链接）
// 简单关联让 Prisma 处理即可
```

## 命名约定

Prisma 生成的关联字段命名：
- **一对多**: 使用复数形式，如 `roles`, `customers`
- **多对一**: 使用单数形式，如 `customer`, `product`
- **自引用**: 区分父级和子级，如 `parent`, `children`

在 `schema.prisma` 中定义关系时，确保字段命名符合这些约定。

## 性能优化

### 避免笛卡尔积

当多个 `include` 关系是多对多时，可能会产生笛卡尔积：

```typescript
// ❌ 可能产生笛卡尔积
const result = await prisma.user.findMany({
  include: {
    roles: true,      // 多对多
    permissions: true // 多对多
  }
})
```

**解决方案**：使用手动链接查询
```typescript
// ✅ 先查询主表
const users = await prisma.user.findMany({
  select: { id: true, name: true }
})

// ✅ 再分别查询关联表
const [roles, permissions] = await Promise.all([
  prisma.role.findMany({
    where: { users: { some: { id: { in: users.map(u => u.id) } } } }
  }),
  prisma.permission.findMany({
    where: { users: { some: { id: { in: users.map(u => u.id) } } } }
  })
])

// ✅ 手动组装结果
const result = users.map(user => ({
  ...user,
  roles: roles.filter(r => r.users.some(u => u.id === user.id)),
  permissions: permissions.filter(p => p.users.some(u => u.id === user.id))
}))
```

### 事务处理

```typescript
await prisma.$transaction(async (tx) => {
  // 创建客户
  const customer = await tx.customer.create({
    data: { name: 'Test Company' }
  })

  // 创建联系人（使用事务中的 prisma 客户端）
  await tx.contact.create({
    data: {
      customerId: customer.id,
      name: 'John Doe'
    }
  })
})
```

### 分页优化

```typescript
const [customers, total] = await Promise.all([
  prisma.customer.findMany({
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { createdAt: 'desc' }
  }),
  prisma.customer.count()
])
```
