---
name: qzt-dev
description: 企账通（QZT）项目开发工作流。使用此技能进行任何 QZT 项目的开发任务，包括后端 API 开发、前端页面开发、组件开发或功能测试。该技能协调使用 React、Ant Design、NestJS、UI/UX 和测试等最佳实践技能。
---

## 开发工作流

根据任务类型，在开始开发前调用相应的专业技能：

### 后端开发
调用 `nestjs-best-practices` 技能以获得：
- NestJS 模块和依赖注入最佳实践
- 安全性和性能优化指导
- 企业级应用架构模式

### 前端开发
同时调用以下三个技能：

1. **`vercel-react-best-practices`** - React 性能优化
   - 组件优化模式
   - 数据获取策略
   - Bundle 优化


3. **`ui-ux-pro-max`** - UI/UX 设计
   - 样式系统（50+ 种风格）
   - 配色方案和字体搭配
   - 响应式布局和交互设计

### 功能测试
开发完成后，调用 `webapp-testing` 技能进行：
- 功能验证测试
- UI 行为调试
- 浏览器截图和日志查看
- 回归测试

## 技术栈

- **前端**: React + UmiJS + Ant Design Pro
- **后端**: NestJS
- **开发工具**: pnpm（不使用 npm）
- **端口配置**: 前端 3456，后端 7890

## 快速启动

使用 `./start-dev.sh` 或 `pnpm dev` 启动开发环境。脚本会自动检查后端和前端是否已在运行，避免重复启动。

## 重要配置说明

### API 路径和代理

**关键规则：不要手动修改 service 文件中的 API 路径！**

#### 前端代理配置

前端通过 `.umirc.ts` 配置代理，将 `/api` 前缀的请求转发到后端：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:7890',
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
  },
}
```

#### app.tsx 中的请求配置

```typescript
export const request: RequestConfig = {
  prefix: '/api',  // 自动添加 /api 前缀
  // ...
}
```

#### API 调用流程

1. **前端发起请求**：
   ```typescript
   // service 文件中
   getCustomers() {
     return request<API.Customer[]>('/customers')  // 注意：没有 /api 前缀
   }
   ```

2. **Umi 自动添加前缀**：
   - 实际请求：`/api/customers`

3. **代理转发到后端**：
   - 目标：`http://localhost:7890/customers`
   - pathRewrite 删除 `/api` 前缀

4. **后端接收**：
   ```typescript
   @Get()
   findAll() {
     // 路径是 /customers，不是 /api/customers
   }
   ```

#### ⚠️ 重要配置陷阱

**问题：app.tsx 中的 prefix 配置不生效**

在 Umi 4.x 中，如果 `.umirc.ts` 中有 `request: {}`，它会覆盖 `app.tsx` 中的 request 配置！

**❌ 错误配置：**
```typescript
// .umirc.ts
export default defineConfig({
  request: {},  // 这个空对象会覆盖 app.tsx 的配置！
});

// app.tsx
export const request: RequestConfig = {
  prefix: '/api',  // 不会生效！
};
```

**✅ 正确配置：**

方案1：只在 `.umirc.ts` 中配置（推荐）
```typescript
// .umirc.ts
export default defineConfig({
  request: {
    prefix: '/api',
  },
});

// app.tsx - 只配置其他选项，不配置 prefix
export const request: RequestConfig = {
  timeout: 10000,
  errorConfig: { ... },
  // 不要在这里配置 prefix
};
```

方案2：删除 `.umirc.ts` 中的 `request: {}`
```typescript
// .umirc.ts - 完全删除 request 键
export default defineConfig({
  // 没有 request 配置
});

// app.tsx
export const request: RequestConfig = {
  prefix: '/api',  // 现在可以生效了
};
```

**当前项目使用方案1**：在 `.umirc.ts` 中配置 prefix。

1. **前端发起请求**：
   ```typescript
   // service 文件中
   getCustomers() {
     return request<API.Customer[]>('/customers')  // 注意：没有 /api 前缀
   }
   ```

2. **Umi 自动添加前缀**：
   - 实际请求：`/api/customers`

3. **代理转发到后端**：
   - 目标：`http://localhost:7890/customers`
   - pathRewrite 删除 `/api` 前缀

4. **后端接收**：
   ```typescript
   @Get()
   findAll() {
     // 路径是 /customers，不是 /api/customers
   }
   ```

#### 常见错误

❌ **错误做法**：
```typescript
// service 中手动添加 /api
request('/api/customers')  // 错误！会变成 /api/api/customers
```

✅ **正确做法**：
```typescript
// service 中使用相对路径
request('/customers')  // 正确！会自动变成 /api/customers
```

#### 后端路由配置

后端控制器中不需要添加 `/api` 前缀：

```typescript
@Controller('customers')  // 不是 @Controller('/api/customers')
export class CustomerController {
  @Get()  // 实际路径: /customers
  findAll() {}

  @Get(':id')  // 实际路径: /customers/:id
  findOne(@Param('id') id: string) {}
}
```

#### 调试技巧

如果遇到 404 错误：

1. **检查浏览器 Network 面板**：
   - 查看实际请求 URL
   - 应该是 `/api/customers`，而不是 `/api/api/customers` 或 `/customers`

2. **检查后端服务**：
   ```bash
   curl http://localhost:7890/customers
   ```

3. **检查代理配置**：
   - `.umirc.ts` 中的 `proxy` 配置
   - `app.tsx` 中的 `prefix: '/api'`

4. **不要修改 service 文件**：
   - service 由 Umi 生成和管理
   - 使用相对路径，让 Umi 自动添加前缀

### Prisma 最佳实践

#### 关联查询的三种方式

**1. 自动关联（直接访问外键）**
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

**2. include + select（推荐）**
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

**3. 手动链接查询**
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

#### 核心原则

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

#### 命名约定

Prisma 生成的关联字段命名：
- 一对多：使用复数形式，如 `roles`, `customers`
- 多对一：使用单数形式，如 `customer`, `product`
- 自引用：区分父级和子级，如 `parent`, `children`

在 schema.prisma 中定义关系时，确保字段命名符合这些约定。
