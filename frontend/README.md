# 企账通 (QZT) SCRM 前端

基于 React 19 + TanStack Router + TanStack Query + shadcn/ui 的现代化 SCRM 系统。

## 技术栈

### 核心框架
- **React 19.2.4** - UI 框架
- **TypeScript ~5.9.3** - 类型系统
- **Vite 7.2.4** - 构建工具

### 路由与状态管理
- **TanStack Router v1.141.2** - 文件路由系统，完全类型安全
- **TanStack Query v5.90.20** - 服务端状态管理
- **Zustand v5.0.11** - 客户端状态管理

### UI 组件
- **shadcn/ui (@radix-ui)** - 无样式组件库
- **Tailwind CSS 4.x** - 工具优先的 CSS 框架
- **Lucide React** - 图标库
- **cmdk** - 命令面板组件

### 数据管理
- **TanStack Table v8.21.3** - 表格组件
- **React Hook Form v7.71.1** - 表单管理
- **Zod v4.3.6** - 类型安全的验证

## 开发指南

### 环境准备

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

### 开发端口

- 前端: `http://localhost:3456`
- 后端: `http://localhost:7890`

### API 开发规范

**重要：前端绝对不能直接修改或手写 API 调用代码！**

必须遵循以下流程：

1. **后端开发 API** → 后端添加/修改 API 接口
2. **生成 API 客户端** → `pnpm run generate:api`
3. **确认 API 字段** → 查看生成的 TypeScript 类型定义
4. **开发前端功能** → 使用生成的类型和 API 函数

```bash
# 生成 API 客户端
pnpm run generate:api
```

### 代码检查

```bash
# Lint
pnpm lint

# 格式化
pnpm format
```

## 项目结构

```
src/
├── routes/                    # TanStack Router 文件路由
│   ├── __root.tsx             # 根路由
│   ├── routeTree.gen.ts       # 自动生成的路由树
│   ├── (auth)/                # 认证路由组
│   │   └── login.tsx          # 登录页
│   └── _authenticated/        # 已认证路由组
│       ├── __root.tsx         # 认证布局
│       ├── index.tsx          # 首页重定向
│       ├── dashboard.tsx      # 仪表板
│       ├── customers.tsx      # 客户列表
│       ├── customers.$id.tsx  # 客户详情
│       └── ...                # 其他业务页面
│
├── components/
│   ├── ui/                    # shadcn/ui 基础组件
│   ├── layout/                # 布局组件
│   │   ├── app-sidebar.tsx    # 侧边栏
│   │   ├── header.tsx         # 顶部栏
│   │   └── data/
│   │       └── sidebar-data.ts # 侧边栏数据
│   ├── data-table/            # 数据表格组件
│   ├── form/                  # 表单组件
│   ├── errors/                # 错误页面
│   ├── theme-switch.tsx       # 主题切换
│   └── search.tsx             # 全局搜索
│
├── features/                  # 业务功能模块
│   ├── customer/
│   ├── contact/
│   ├── contract/
│   └── ...
│
├── hooks/
│   └── use-table-url-state.ts # URL 状态管理
│
├── lib/
│   ├── api-client.ts          # API 客户端
│   ├── utils.ts               # 工具函数
│   ├── validations.ts         # Zod 验证 Schema
│   └── error-handler.ts       # 错误处理
│
├── services/                  # API 服务
│   ├── api.ts                 # API 入口
│   └── ...
│
├── stores/                    # Zustand 状态管理
│   └── authStore.ts           # 认证状态
│
├── models/                    # TypeScript 类型定义
│   └── ...
│
└── main.tsx                   # 应用入口
```

## 路由开发

TanStack Router 使用文件路由系统：

```typescript
// 创建列表页：routes/_authenticated/customers.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/customers')({
  component: CustomerListPage,
})

function CustomerListPage() {
  return <div>客户列表</div>
}
```

```typescript
// 创建详情页：routes/_authenticated/customers.$id.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/customers/$id')({
  component: CustomerDetailPage,
})

function CustomerDetailPage() {
  const { id } = Route.useParams() // 类型安全的路由参数
  return <div>客户详情: {id}</div>
}
```

## URL 状态管理

使用 `useTableUrlState` Hook 管理 URL 状态：

```typescript
import { useTableUrlState } from '@/hooks/use-table-url-state'

function CustomerList() {
  const { page, pageSize, keyword, setPage, setKeyword } = useTableUrlState({
    defaultPageSize: 10,
  })

  const { data } = useQuery({
    queryKey: ['customers', page, pageSize, keyword],
    queryFn: () => fetchCustomers({ page: page - 1, pageSize, keyword }),
  })

  return <Table data={data} />
}
```

## 表单验证

使用 React Hook Form + Zod：

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { customerSchema } from '@/lib/validations'

function CustomerForm() {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      customerLevel: 0,
    },
  })

  const onSubmit = (data) => {
    console.log(data)
  }

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>
}
```

## 功能特性

### 类型安全
- ✅ 路径参数、搜索参数、loader 数据全部类型推断
- ✅ 编译时错误检测，减少运行时错误
- ✅ IDE 自动补全和类型提示

### URL 状态同步
- ✅ 表格状态、筛选条件自动同步到 URL
- ✅ 可分享、可书签的应用状态
- ✅ 浏览器前进/后退按钮支持

### 开发体验
- ✅ 文件路由系统，路由结构清晰
- ✅ 自动类型生成，减少手动类型定义
- ✅ 热模块替换 (HMR)
- ✅ 快速的构建和更新

### 用户体验
- ✅ 数据预加载和缓存
- ✅ 智能的重新验证策略
- ✅ 代码分割和懒加载
- ✅ 主题切换（明暗模式）
- ✅ 全局搜索（Command + K）

## 快捷键

- `⌘K` / `Ctrl+K` - 打开全局搜索

## 响应式断点

- **Mobile**: < 768px (单列)
- **Tablet**: 768px - 1279px (两列)
- **Desktop**: ≥ 1280px (多列 + 侧边栏)

## 常见问题

### 1. 如何添加新页面？

在 `routes/_authenticated/` 目录下创建新文件，TanStack Router 会自动识别。

### 2. 如何添加新的 UI 组件？

使用 shadcn/ui CLI：

```bash
npx shadcn-ui@latest add [component-name]
```

### 3. 如何调试路由？

在开发模式下，路由调试工具会自动显示在页面右下角。

### 4. 如何处理认证？

认证在 `routes/_authenticated/__root.tsx` 的 `beforeLoad` 钩子中处理。

## 技术文档

- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Table](https://tanstack.com/table/latest)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## 许可证

MIT
