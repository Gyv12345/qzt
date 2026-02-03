# 前端架构重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 QZT 前端从 React Router v7 完全迁移到 TanStack Router，借鉴 shadcn-admin 架构模式，实现类型安全路由、高级数据表格、主题切换和全局搜索。

**Architecture:** 采用文件路由系统（TanStack Router），所有路由参数和搜索参数完全类型化。使用 Zod schema 验证搜索参数。集成 TanStack Table 实现高级数据表格。使用 React Hook Form + Zod 进行表单验证。实现明暗主题切换和全局搜索功能。

**Tech Stack:** React 19, TypeScript, TanStack Router, TanStack Table, TanStack Query, React Hook Form, Zod, Tailwind CSS 4, Shadcn UI

---

## 阶段一：环境准备（1-2天）

### Task 1: 安装核心依赖

**Files:**
- Modify: `frontend/package.json`

**Step 1: 安装 TanStack Router**

```bash
cd frontend
pnpm add @tanstack/react-router@^1.141.2
```

**Expected:** package.json 更新，node_modules 安装新依赖

**Step 2: 安装 TanStack Table**

```bash
pnpm add @tanstack/react-table@^8.21.3
```

**Expected:** package.json 更新

**Step 3: 安装表单验证依赖**

```bash
pnpm add react-hook-form@^7.68.0 @hookform/resolvers@^5.2.2 zod@^4.2.0
```

**Expected:** package.json 更新

**Step 4: 安装其他依赖**

```bash
pnpm add cmdk@1.1.1 react-top-loading-bar@^3.0.2
```

**Expected:** package.json 更新

**Step 5: 提交依赖安装**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: 安装 TanStack Router 和相关依赖

- @tanstack/react-router: 文件路由系统
- @tanstack/react-table: 高级数据表格
- react-hook-form + zod: 表单验证
- cmdk: 全局搜索
- react-top-loading-bar: 加载进度条"
```

**Expected:** Git commit 成功

---

### Task 2: 配置 Vite 插件

**Files:**
- Create: `frontend/vite.config.ts` (backup existing)
- Modify: `frontend/vite.config.ts`

**Step 1: 备份现有配置**

```bash
cp vite.config.ts vite.config.ts.backup
```

**Expected:** 备份文件创建

**Step 2: 添加 TanStack Router 插件**

```typescript
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client'],
  },
  server: {
    port: 3456,
    proxy: {
      '/api': {
        target: 'http://localhost:7890',
        changeOrigin: true,
      },
    },
  },
})
```

**Expected:** vite.config.ts 包含 TanStack Router 插件

**Step 3: 提交配置**

```bash
git add vite.config.ts vite.config.ts.backup
git commit -m "feat: 配置 TanStack Router Vite 插件"
```

---

### Task 3: 创建目录结构

**Files:**
- Create: `frontend/src/routes/`
- Create: `frontend/src/routes/(auth)/`
- Create: `frontend/src/routes/_authenticated/`
- Create: `frontend/src/features/`
- Create: `frontend/src/components/layout/`
- Create: `frontend/src/components/data-table/`
- Create: `frontend/src/components/errors/`
- Create: `frontend/src/hooks/`

**Step 1: 创建路由目录**

```bash
cd frontend/src
mkdir -p routes/(auth)
mkdir -p routes/_authenticated
```

**Expected:** 目录创建成功

**Step 2: 创建 features 目录**

```bash
mkdir -p features/{customer,contact,contract,invoice,product,follow-record,statistics,dashboard,auth,system}
```

**Expected:** features 目录创建成功

**Step 3: 创建组件目录**

```bash
mkdir -p components/layout/data
mkdir -p components/data-table
mkdir -p components/errors
```

**Expected:** 组件目录创建成功

**Step 4: 创建 hooks 目录**

```bash
mkdir -p hooks
```

**Expected:** hooks 目录创建成功

**Step 5: 提交目录结构**

```bash
git add .
git commit -m "feat: 创建 TanStack Router 目录结构

- routes/(auth): 认证相关路由
- routes/_authenticated: 已认证路由
- features/: 功能模块目录
- components/layout/: 布局组件
- components/data-table/: 数据表格组件
- components/errors/: 错误页面
- hooks/: 自定义 hooks"
```

---

### Task 4: 配置 Tailwind CSS 主题变量

**Files:**
- Modify: `frontend/tailwind.config.js` (or create if using CSS)
- Modify: `frontend/src/styles/theme.css` (if using Tailwind v4)

**Step 1: 检查 Tailwind 配置文件**

```bash
ls -la | grep tailwind
```

**Expected:** 找到配置文件（tailwind.config.js 或 tailwind.css）

**Step 2: 添加主题 CSS 变量（如果使用 Tailwind v4）**

在 `src/styles/theme.css` 添加：

```css
@theme {
  --color-light: #ffffff;
  --color-dark: #09090b;
  --color-primary: #3b82f6;
  --color-primary-foreground: #ffffff;
  --color-muted: #f4f4f5;
  --color-muted-foreground: #71717a;
  --color-accent: #f4f4f5;
  --color-accent-foreground: #18181b;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-border: #e4e4e7;
  --color-input: #e4e4e7;
  --color-ring: #3b82f6;
  --radius: 0.5rem;
}

.dark {
  --color-light: #09090b;
  --color-dark: #ffffff;
  --color-muted: #27272a;
  --color-muted-foreground: #a1a1aa;
  --color-accent: #27272a;
  --color-accent-foreground: #fafafa;
  --color-border: #27272a;
  --color-input: #27272a;
}
```

**Expected:** 主题变量添加成功

**Step 3: 提交主题配置**

```bash
git add src/styles/theme.css
git commit -m "feat: 添加 Tailwind CSS 主题变量

- 支持明暗模式
- 定义颜色系统
- 定义圆角、边框等设计 token"
```

---

## 阶段二：核心布局迁移（2-3天）

### Task 5: 创建根路由

**Files:**
- Create: `frontend/src/routes/__root.tsx`

**Step 1: 创建路由上下文类型**

```typescript
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

// 定义路由上下文类型
interface RouterContext {
  isAuthenticated: boolean
  user: User | null
}

// User 类型（临时定义，后续从 models 导入）
interface User {
  id: string
  username: string
  email: string
}
```

**Expected:** 类型定义完成

**Step 2: 创建根路由组件**

```typescript
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ({ error }) => {
    console.error('路由错误:', error)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">出错了</h1>
          <p className="text-muted-foreground">
            {error.message || '未知错误'}
          </p>
        </div>
      </div>
    )
  },
})

function RootLayout() {
  return <Outlet />
}
```

**Expected:** 根路由组件创建完成

**Step 3: 启动开发服务器测试**

```bash
pnpm dev
```

**Expected:** 服务器启动，TanStack Router 插件自动生成 routeTree.gen.ts

**Step 4: 检查生成的文件**

```bash
ls -la src/routes/routeTree.gen.ts
```

**Expected:** routeTree.gen.ts 文件已生成

**Step 5: 提交根路由**

```bash
git add src/routes/__root.tsx src/routes/routeTree.gen.ts
git commit -m "feat: 创建 TanStack Router 根路由

- 定义 RouterContext 类型
- 实现全局错误处理
- 集成 Outlet 嵌套路由"
```

---

### Task 6: 创建认证布局路由

**Files:**
- Create: `frontend/src/routes/_authenticated/__root.tsx`
- Create: `frontend/src/components/layout/authenticated-layout.tsx`

**Step 1: 创建认证布局组件**

```typescript
// components/layout/authenticated-layout.tsx
import { Outlet } from '@tanstack/react-router'
import { AppSidebar } from './app-sidebar'
import { Header } from './header'

export function AuthenticatedLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

**Expected:** 认证布局组件创建完成

**Step 2: 创建认证路由**

```typescript
// routes/_authenticated/__root.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    // 类型安全的认证检查
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})
```

**Expected:** 认证路由创建完成

**Step 3: 创建占位符组件**

```typescript
// components/layout/app-sidebar.tsx
export function AppSidebar() {
  return <aside className="w-64 bg-gray-900 text-white">Sidebar</aside>
}

// components/layout/header.tsx
export function Header() {
  return <header className="h-16 border-b bg-white">Header</header>
}
```

**Expected:** 占位符组件创建完成

**Step 4: 提交认证布局**

```bash
git add src/routes/_authenticated/__root.tsx
git add src/components/layout/authenticated-layout.tsx
git add src/components/layout/app-sidebar.tsx
git add src/components/layout/header.tsx
git commit -m "feat: 创建认证布局路由

- 实现认证检查逻辑
- 创建 AuthenticatedLayout 组件
- 添加占位符 Sidebar 和 Header
- 配置路由重定向"
```

---

### Task 7: 实现 AppSidebar 组件

**Files:**
- Modify: `frontend/src/components/layout/app-sidebar.tsx`
- Create: `frontend/src/components/layout/data/sidebar-data.ts`

**Step 1: 创建侧边栏数据**

```typescript
// components/layout/data/sidebar-data.ts
import {
  LayoutDashboard,
  Building2,
  Book,
  MessageSquare,
  BarChart3,
  FileText,
  Receipt,
  Package,
  Settings,
} from 'lucide-react'

export const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: '首页' },
  { path: '/customers', icon: Building2, label: '公司' },
  { path: '/contacts', icon: Book, label: '联系人' },
  { path: '/follow-records', icon: MessageSquare, label: '跟进' },
  { path: '/statistics', icon: BarChart3, label: '统计' },
  { path: '/contracts', icon: FileText, label: '合同' },
  { path: '/invoices', icon: Receipt, label: '开票' },
  { path: '/products', icon: Package, label: '产品' },
  { path: '/system', icon: Settings, label: '系统' },
]
```

**Expected:** 侧边栏数据定义完成

**Step 2: 实现侧边栏组件**

```typescript
// components/layout/app-sidebar.tsx
import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import { menuItems } from './data/sidebar-data'

export function AppSidebar() {
  const router = useRouter()
  const currentPath = router.state.location.pathname
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 text-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <Building2 className="h-8 w-8 text-blue-400" />
        {!collapsed && (
          <span className="ml-2 text-xl font-bold">企账通</span>
        )}
      </div>

      {/* 菜单 */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center rounded-lg px-3 py-2 transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* 折叠按钮 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center border-t border-gray-800 p-3 text-gray-400 hover:text-white"
      >
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  )
}
```

**Expected:** 侧边栏组件实现完成

**Step 3: 测试侧边栏**

```bash
# 启动开发服务器
pnpm dev
```

**Expected:** 侧边栏显示，菜单项可点击

**Step 4: 提交侧边栏**

```bash
git add src/components/layout/app-sidebar.tsx
git add src/components/layout/data/sidebar-data.ts
git commit -m "feat: 实现完整的 AppSidebar 组件

- 添加菜单配置数据
- 实现路由导航
- 添加折叠/展开功能
- 集成 Lucide 图标"
```

---

### Task 8: 实现 Header 组件

**Files:**
- Modify: `frontend/src/components/layout/header.tsx`

**Step 1: 创建 Header 组件**

```typescript
import { useRouter } from '@tanstack/react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export function Header() {
  const router = useRouter()
  const navigate = router.useNavigate()

  const handleLogout = () => {
    // 清除认证信息
    localStorage.removeItem('token')
    // 跳转到登录页
    navigate({ to: '/login' })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      {/* 左侧：面包屑（暂留空） */}
      <div className="flex-1" />

      {/* 右侧：操作区 */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
        >
          退出
        </Button>
        <Avatar>
          <AvatarFallback>用户</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
```

**Expected:** Header 组件创建完成

**Step 2: 测试 Header**

```bash
# 在浏览器中测试退出按钮
```

**Expected:** 点击退出按钮跳转到登录页

**Step 3: 提交 Header**

```bash
git add src/components/layout/header.tsx
git commit -m "feat: 实现 Header 组件

- 添加退出登录功能
- 集成用户头像显示
- 响应式布局"
```

---

### Task 9: 创建登录路由

**Files:**
- Move: `frontend/src/pages/LoginPage.tsx` → `frontend/src/routes/(auth)/login.tsx`

**Step 1: 移动登录页面**

```bash
mv src/pages/LoginPage.tsx src/routes/(auth)/login.tsx
```

**Expected:** 文件移动成功

**Step 2: 更新登录页面为 TanStack Router 格式**

```typescript
// routes/(auth)/login.tsx
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { getScrmApi } from '@/services'

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: () =>
      getScrmApi().authControllerLogin({
        username,
        password,
      }),
    onSuccess: (data) => {
      // 保存 token
      localStorage.setItem('token', data.access_token)
      // 跳转到重定向页面或首页
      const redirect = (search.redirect as string) || '/dashboard'
      navigate({ to: redirect, replace: true })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-96 space-y-4">
        <h1 className="text-2xl font-bold">登录</h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
          className="w-full rounded border p-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          className="w-full rounded border p-2"
        />
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded bg-blue-600 p-2 text-white hover:bg-blue-700"
        >
          {loginMutation.isPending ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}
```

**Expected:** 登录页面更新为 TanStack Router 格式

**Step 3: 测试登录流程**

```bash
# 在浏览器中测试登录
```

**Expected:** 登录成功后跳转到 dashboard

**Step 4: 提交登录路由**

```bash
git add src/routes/\(auth\)/login.tsx
git commit -m "feat: 创建登录路由

- 使用 TanStack Router 文件路由
- 集成 TanStack Query
- 实现重定向逻辑
- 支持 search 参数传递"
```

---

### Task 10: 创建 Dashboard 路由

**Files:**
- Move: `frontend/src/pages/DashboardPage.tsx` → `frontend/src/routes/_authenticated/dashboard.tsx`

**Step 1: 移动 Dashboard 页面**

```bash
mv src/pages/DashboardPage.tsx src/routes/_authenticated/dashboard.tsx
```

**Expected:** 文件移动成功

**Step 2: 更新 Dashboard 为 TanStack Router 格式**

```typescript
// routes/_authenticated/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  // 从原 DashboardPage.tsx 复制内容
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表板</h1>
      {/* 原有内容 */}
    </div>
  )
}
```

**Expected:** Dashboard 页面更新完成

**Step 3: 创建首页重定向**

```typescript
// routes/_authenticated/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard',
    })
  },
})
```

**Expected:** 根路径重定向到 dashboard

**Step 4: 测试 Dashboard**

```bash
# 在浏览器中访问 /
```

**Expected:** 自动重定向到 /dashboard

**Step 5: 提交 Dashboard**

```bash
git add src/routes/_authenticated/dashboard.tsx
git add src/routes/_authenticated/index.tsx
git commit -m "feat: 创建 Dashboard 路由

- 迁移仪表板页面
- 实现根路径重定向
- 使用 TanStack Router 格式"
```

---

## 阶段三：页面迁移（5-7天）

### Task 11: 迁移 Customer 模块 - 列表页

**Files:**
- Move: `frontend/src/pages/customer/*` → `frontend/src/features/customer/*`
- Create: `frontend/src/routes/_authenticated/customers.tsx`

**Step 1: 移动 Customer 页面组件**

```bash
mv src/pages/customer src/features/customer
```

**Expected:** customer 目录移动到 features

**Step 2: 创建客户列表路由**

```typescript
// routes/_authenticated/customers.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CustomerListPage } from '@/features/customer'

const customerSearchSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
  keyword: z.string().optional(),
  customerLevel: z.array(z.string()).optional(),
  sortField: z.enum(['name', 'createdAt', 'customerLevel']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

type CustomerSearch = z.infer<typeof customerSearchSchema>

export const Route = createFileRoute('/_authenticated/customers')({
  validateSearch: (search) => customerSearchSchema.parse(search),
  component: CustomerListPage,
})
```

**Expected:** 客户列表路由创建完成

**Step 3: 更新 CustomerListPage 组件**

```typescript
// features/customer/CustomerListPage.tsx
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { getScrmApi } from '@/services'

const customerRoute = getRouteApi('/_authenticated/customers')

export function CustomerListPage() {
  const search = customerRoute.useSearch()
  const navigate = customerRoute.useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      getScrmApi().customerControllerFindAll({
        page: search.page - 1,
        pageSize: search.pageSize,
        keyword: search.keyword,
        customerLevel: search.customerLevel,
      }),
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">客户管理</h1>
      {/* 原有表格组件 */}
    </div>
  )
}
```

**Expected:** CustomerListPage 更新为使用 TanStack Router

**Step 4: 测试客户列表**

```bash
# 在浏览器中访问 /customers
```

**Expected:** 客户列表正常显示

**Step 5: 提交客户列表**

```bash
git add src/routes/_authenticated/customers.tsx
git add src/features/customer/
git commit -m "feat: 迁移客户列表页面

- 使用 TanStack Router 文件路由
- 集成 Zod schema 验证搜索参数
- 类型安全的路由参数
- URL 状态同步"
```

---

### Task 12: 迁移 Customer 模块 - 详情页

**Files:**
- Create: `frontend/src/routes/_authenticated/customers.$id.tsx`

**Step 1: 创建客户详情路由**

```typescript
// routes/_authenticated/customers.$id.tsx
import { createFileRoute, notFound } from '@tanstack/react-router'
import { CustomerDetailPage } from '@/features/customer'

export const Route = createFileRoute('/_authenticated/customers/$id')({
  loader: async ({ params: { id } }) => {
    const customer = await getScrmApi().customerControllerFindOne({ id })
    if (!customer) {
      throw notFound()
    }
    return customer
  },
  component: CustomerDetailPage,
})
```

**Expected:** 客户详情路由创建完成

**Step 2: 更新 CustomerDetailPage 组件**

```typescript
// features/customer/CustomerDetailPage.tsx
import { Route } from '@/routes/_authenticated/customers.$id'

export function CustomerDetailPage() {
  const { id } = Route.useParams()
  const customer = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{customer.name}</h1>
      <p>ID: {id}</p>
      {/* 原有详情内容 */}
    </div>
  )
}
```

**Expected:** CustomerDetailPage 更新完成

**Step 3: 测试客户详情**

```bash
# 在浏览器中访问 /customers/:id
```

**Expected:** 客户详情正常显示

**Step 4: 提交客户详情**

```bash
git add src/routes/_authenticated/customers.\$id.tsx
git commit -m "feat: 迁移客户详情页面

- 使用动态路由参数
- 类型安全的路径参数
- 集成 loader 数据预加载"
```

---

### Task 13-20: 迁移其他模块

按照相同的模式迁移：
- Contact 模块（Task 13-14）
- Contract 模块（Task 15-16）
- Invoice 模块（Task 17）
- Product 模块（Task 18-19）
- Follow-Record 模块（Task 20）
- Statistics 模块（Task 21）
- System 模块（Task 22）

每个模块遵循相同的步骤：
1. 移动页面组件到 features
2. 创建列表路由
3. 创建详情路由（如果有）
4. 更新组件使用 TanStack Router hooks
5. 测试功能
6. 提交代码

---

## 阶段四：功能增强（3-4天）

### Task 23: 实现数据表格组件

**Files:**
- Create: `frontend/src/components/data-table/data-table.tsx`
- Create: `frontend/src/components/data-table/data-table-toolbar.tsx`
- Create: `frontend/src/components/data-table/data-table-pagination.tsx`

**Step 1: 创建基础数据表格组件**

```typescript
// components/data-table/data-table.tsx
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  pageSize?: number
}

export function DataTable<TData>({ data, columns, pageSize = 10 }: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: { sorting, columnFilters, pagination },
  })

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : header.column.columnDef.header}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {cell.column.columnDef.cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
```

**Expected:** 数据表格基础组件创建完成

**Step 2: 创建工具栏组件**

```typescript
// components/data-table/data-table-toolbar.tsx
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface DataTableToolbarProps<TData> {
  table: any
}

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  return (
    <div className="flex items-center justify-between">
      <Input
        placeholder="搜索..."
        value={(table.getState().globalFilter as string) ?? ''}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />
    </div>
  )
}
```

**Expected:** 工具栏组件创建完成

**Step 3: 创建分页组件**

```typescript
// components/data-table/data-table-pagination.tsx
import { Button } from '@/components/ui/button'

interface DataTablePaginationProps {
  table: any
}

export function DataTablePagination({ table }: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        上一页
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        下一页
      </Button>
    </div>
  )
}
```

**Expected:** 分页组件创建完成

**Step 4: 提交数据表格组件**

```bash
git add src/components/data-table/
git commit -m "feat: 实现数据表格组件

- 使用 TanStack Table
- 支持排序、筛选、分页
- 响应式设计"
```

---

### Task 24: 实现主题切换功能

**Files:**
- Create: `frontend/src/components/theme-switch.tsx`
- Create: `frontend/src/hooks/use-theme.ts`

**Step 1: 创建主题 hook**

```typescript
// hooks/use-theme.ts
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = stored || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  return { theme, toggleTheme }
}
```

**Expected:** 主题 hook 创建完成

**Step 2: 创建主题切换组件**

```typescript
// components/theme-switch.tsx
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-9 w-9 p-0">
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  )
}
```

**Expected:** 主题切换组件创建完成

**Step 3: 集成到 Header**

```typescript
// components/layout/header.tsx
import { ThemeSwitch } from '@/components/theme-switch'

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      {/* ... */}
      <div className="flex items-center space-x-4">
        <ThemeSwitch />
        {/* ... */}
      </div>
    </header>
  )
}
```

**Expected:** Header 集成主题切换

**Step 4: 测试主题切换**

```bash
# 在浏览器中点击主题切换按钮
```

**Expected:** 主题在明暗模式间切换

**Step 5: 提交主题切换**

```bash
git add src/components/theme-switch.tsx
git add src/hooks/use-theme.ts
git add src/components/layout/header.tsx
git commit -m "feat: 实现主题切换功能

- 支持明暗模式切换
- 保存用户偏好到 localStorage
- 集成到 Header 组件"
```

---

### Task 25: 实现全局搜索功能

**Files:**
- Create: `frontend/src/components/search.tsx`
- Install: `cmdk` package (已在 Task 1 安装)

**Step 1: 创建搜索组件**

```typescript
// components/search.tsx
import { useState, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { CommandDialog, CommandInput, CommandList } from '@/components/ui/command'
import { Search } from 'lucide-react'
import { menuItems } from './layout/data/sidebar-data'

export function Search() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const navigate = router.useNavigate()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelect = (path: string) => {
    navigate({ to: path })
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span>搜索...</span>
        <kbd className="ml-auto">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="搜索页面..." />
        <CommandList>
          {menuItems.map((item) => (
            <div
              key={item.path}
              onClick={() => handleSelect(item.path)}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 hover:bg-accent"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
```

**Expected:** 搜索组件创建完成

**Step 2: 集成到 Header**

```typescript
// components/layout/header.tsx
import { Search } from '@/components/search'

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      {/* ... */}
      <div className="flex items-center space-x-4">
        <Search />
        {/* ... */}
      </div>
    </header>
  )
}
```

**Expected:** Header 集成搜索

**Step 3: 测试全局搜索**

```bash
# 按 Cmd+K (Mac) 或 Ctrl+K (Windows)
# 输入搜索内容并选择
```

**Expected:** 全局搜索对话框打开，可选择页面跳转

**Step 4: 提交全局搜索**

```bash
git add src/components/search.tsx
git add src/components/layout/header.tsx
git commit -m "feat: 实现全局搜索功能

- 支持 Cmd+K 快捷键
- 搜索页面菜单
- 快速导航到页面"
```

---

## 阶段五：测试与优化（2-3天）

### Task 26: 编写单元测试

**Files:**
- Create: `frontend/src/features/customer/__tests__/customer-list.test.tsx`
- Create: `frontend/src/components/data-table/__tests__/data-table.test.tsx`

**Step 1: 创建客户列表测试**

```typescript
// features/customer/__tests__/customer-list.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerListPage } from '../customer-list-page'

describe('CustomerListPage', () => {
  it('应该显示客户列表', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <CustomerListPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('客户管理')).toBeInTheDocument()
    })
  })
})
```

**Expected:** 测试文件创建完成

**Step 2: 运行测试**

```bash
pnpm test
```

**Expected:** 测试通过

**Step 3: 提交测试**

```bash
git add src/features/customer/__tests__/
git commit -m "test: 添加客户列表单元测试"
```

---

### Task 27: 编写 E2E 测试

**Files:**
- Create: `frontend/e2e/customer.spec.ts`

**Step 1: 创建 E2E 测试**

```typescript
// e2e/customer.spec.ts
import { test, expect } from '@playwright/test'

test.describe('客户管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
  })

  test('应该显示客户列表', async ({ page }) => {
    await page.goto('http://localhost:3456/customers')
    await expect(page.locator('h1')).toContainText('客户管理')
  })

  test('应该能够搜索客户', async ({ page }) => {
    await page.goto('http://localhost:3456/customers')
    await page.fill('input[placeholder*="搜索"]', '测试')
    await page.waitForTimeout(500)
    // 验证搜索结果
  })
})
```

**Expected:** E2E 测试创建完成

**Step 2: 运行 E2E 测试**

```bash
pnpm test:e2e
```

**Expected:** E2E 测试通过

**Step 3: 提交 E2E 测试**

```bash
git add e2e/
git commit -m "test: 添加客户管理 E2E 测试"
```

---

### Task 28: 清理旧代码

**Files:**
- Delete: `frontend/src/router/`
- Delete: `frontend/src/pages/` (已迁移的内容)
- Delete: `frontend/src/layouts/MainLayout.tsx` (已迁移)

**Step 1: 删除旧的 router 目录**

```bash
rm -rf src/router
```

**Expected:** router 目录删除

**Step 2: 删除已迁移的页面**

```bash
# 确认所有页面已迁移后删除
rm -rf src/pages
```

**Expected:** pages 目录删除

**Step 3: 删除旧的 layouts**

```bash
rm -rf src/layouts
```

**Expected:** layouts 目录删除

**Step 4: 提交清理**

```bash
git add -A
git commit -m "chore: 清理旧的 React Router 代码

- 删除 src/router/
- 删除 src/pages/
- 删除 src/layouts/
- 完成迁移到 TanStack Router"
```

---

### Task 29: 更新文档

**Files:**
- Modify: `frontend/README.md`
- Create: `frontend/docs/MIGRATION.md`

**Step 1: 创建迁移文档**

```markdown
# TanStack Router 迁移指南

## 概述

本项目已从 React Router v7 迁移到 TanStack Router。

## 主要变更

### 路由定义

**旧方式 (React Router)**:
```typescript
const router = createBrowserRouter([
  { path: '/customers', element: <CustomerList /> }
])
```

**新方式 (TanStack Router)**:
```typescript
// routes/_authenticated/customers.tsx
export const Route = createFileRoute('/_authenticated/customers')({
  component: CustomerList,
})
```

### 类型安全的搜索参数

**旧方式**:
```typescript
const [searchParams] = useSearchParams()
const page = Number(searchParams.get('page')) || 1
```

**新方式**:
```typescript
const search = Route.useSearch() // 完全类型化
console.log(search.page) // number 类型
```

### 路径参数

**旧方式**:
```typescript
const { id } = useParams<{ id: string }>()
```

**新方式**:
```typescript
const { id } = Route.useParams() // 自动推断为 string
```

## 文件路由命名规则

- `$param` - 动态参数: `customers.$id.tsx`
- `(group)` - 路由组，不影响 URL: `(auth)/login.tsx`
- `_private` - 不作为路由的一部分: `_authenticated/__root.tsx`

## 参考资料

- [TanStack Router 官方文档](https://tanstack.com/router/latest)
- [项目设计文档](../docs/plans/2026-02-03-frontend-refactor-design.md)
```

**Expected:** 迁移文档创建完成

**Step 2: 更新 README**

```markdown
# 企账通前端

基于 TanStack Router + Shadcn UI 的 SCRM 系统前端。

## 技术栈

- React 19
- TypeScript
- TanStack Router (文件路由)
- TanStack Query (数据获取)
- TanStack Table (数据表格)
- Tailwind CSS 4
- Shadcn UI

## 开始开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 项目结构

- `routes/` - TanStack Router 文件路由
- `features/` - 功能模块
- `components/` - UI 组件
- `hooks/` - 自定义 hooks
- `services/` - API 客户端

## 文档

- [迁移指南](docs/MIGRATION.md)
- [设计文档](../docs/plans/2026-02-03-frontend-refactor-design.md)
```

**Expected:** README 更新完成

**Step 3: 提交文档**

```bash
git add README.md docs/MIGRATION.md
git commit -m "docs: 添加 TanStack Router 迁移文档

- 创建详细的迁移指南
- 更新 README
- 添加参考链接"
```

---

## 验收清单

在完成所有任务后，验证以下功能：

### 功能测试

- [ ] 登录功能正常
- [ ] 所有页面可正常访问
- [ ] 客户/联系人 CRUD 功能正常
- [ ] 数据表格排序、筛选、分页正常
- [ ] URL 状态同步正常
- [ ] 主题切换正常
- [ ] 全局搜索（Cmd+K）正常
- [ ] 退出登录正常

### 性能测试

- [ ] 首屏加载时间 < 2s
- [ ] 路由切换流畅
- [ ] 数据表格滚动流畅

### 兼容性测试

- [ ] Chrome 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] Edge 最新版

### 代码质量

- [ ] TypeScript 无错误
- [ ] ESLint 无警告
- [ ] 所有测试通过
- [ ] Git 提交历史清晰

---

## 总结

本实施计划包含 **29 个主要任务**，分为 **5 个阶段**：

1. **阶段一：环境准备** (1-2天) - 4个任务
2. **阶段二：核心布局迁移** (2-3天) - 6个任务
3. **阶段三：页面迁移** (5-7天) - 10个任务
4. **阶段四：功能增强** (3-4天) - 3个任务
5. **阶段五：测试与优化** (2-3天) - 6个任务

**预计总时间**: 13-19 天

遵循 **DRY、YAGNI、TDD** 原则，每个任务都是独立的、可验证的、可提交的。

---

*实施计划创建日期: 2026-02-03*
*基于设计文档: docs/plans/2026-02-03-frontend-refactor-design.md*
