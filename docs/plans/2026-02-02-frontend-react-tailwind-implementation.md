# 企账通前端重构实施计划 (React + Tailwind + shadcn/ui)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 使用 React + Vite + Tailwind CSS + shadcn/ui 重新构建企账通前端，实现响应式布局(PC/平板/移动端)

**Architecture:**
- Vite 脚手架 + React 18 + TypeScript
- React Router v6 路由管理
- Zustand 状态管理 + TanStack Query 数据同步
- Tailwind CSS + shadcn/ui 设计系统
- Orval 从后端 OpenAPI 自动生成 API 服务

**Tech Stack:**
- Vite 5.x, React 18, TypeScript 5
- React Router v6, Zustand, TanStack Query
- Tailwind CSS v3, shadcn/ui, react-icons
- Orval, ESLint, Prettier

**Branch:** `feat/react-tailwind-frontend`
**Port:** Frontend 3456, Backend 7890

---

## 阶段一:项目初始化 (30分钟)

### Task 1: 创建功能分支

**Files:**
- Git branch only

**Step 1: 创建并切换到新分支**

```bash
git checkout -b feat/react-tailwind-frontend
```

**Step 2: 验证分支**

```bash
git branch
```

Expected: `* feat/react-tailwind-frontend`

**Step 3: 提交分支创建**

```bash
git commit --allow-empty -m "feat: start React + Tailwind frontend implementation"
```

---

### Task 2: 初始化 Vite + React 项目

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/vite-env.d.ts`

**Step 1: 在项目根目录创建 frontend 目录并初始化**

```bash
cd /Users/shichenyang/WebstormProjects/qzt
pnpm create vite frontend --template react-ts
```

Expected: Vite 创建项目并输出 `Done. Now run:`

**Step 2: 进入 frontend 目录安装依赖**

```bash
cd frontend
pnpm install
```

Expected: 依赖安装完成，没有错误

**Step 3: 测试基础运行**

```bash
pnpm dev
```

Expected: Vite 服务器启动，访问 http://localhost:5173 显示 React + Vite 页面

**Step 4: 停止服务器并提交**

按 `Ctrl+C` 停止服务器

```bash
git add frontend/
git commit -m "feat: initialize Vite + React + TypeScript project"
```

---

### Task 3: 配置 Tailwind CSS

**Files:**
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/index.css`
- Modify: `frontend/src/main.tsx`

**Step 1: 安装 Tailwind CSS 依赖**

```bash
cd /Users/shichenyang/WebstormProjects/qzt/frontend
pnpm add -D tailwindcss postcss autoprefixer
pnpm exec tailwindcss init -p
```

Expected: 创建 `tailwind.config.js` 和 `postcss.config.js`

**Step 2: 配置 tailwind.config.js**

替换 `tailwind.config.js` 内容为:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

**Step 3: 安装 tailwindcss-animate 插件**

```bash
pnpm add -D tailwindcss-animate
```

**Step 4: 创建全局 CSS 文件**

替换 `src/index.css` 内容为:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;

    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;

    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    --primary: 219 83% 53%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;

    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;

    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;

    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 219 83% 53%;

    --radius: 0.5rem;
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;

    --card: 222 47% 14%;
    --card-foreground: 210 40% 98%;

    --popover: 222 47% 14%;
    --popover-foreground: 210 40% 98%;

    --primary: 217 91% 60%;
    --primary-foreground: 222 47% 11%;

    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;

    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62% 30%;
    --destructive-foreground: 210 40% 98%;

    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 224 76% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 5: 修改 main.tsx 导入 CSS**

确保 `src/main.tsx` 包含:

```typescript
import './index.css'
```

**Step 6: 测试 Tailwind 配置**

修改 `src/App.tsx` 为:

```typescript
function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <h1 className="text-3xl font-bold text-primary">企账通</h1>
      <p className="text-muted-foreground">Tailwind CSS 配置测试</p>
    </div>
  )
}

export default App
```

运行测试:

```bash
pnpm dev
```

Expected: 访问 http://localhost:5173 显示蓝色标题和灰色文字

**Step 7: 提交配置**

```bash
git add frontend/
git commit -m "feat: configure Tailwind CSS with shadcn/ui theme variables"
```

---

### Task 4: 安装核心依赖

**Files:**
- Modify: `frontend/package.json`

**Step 1: 安装路由和状态管理依赖**

```bash
cd /Users/shichenyang/WebstormProjects/qzt/frontend
pnpm add react-router-dom zustand @tanstack/react-query
pnpm add -D @types/react-router-dom
```

Expected: 安装完成

**Step 2: 安装 UI 相关依赖**

```bash
pnpm add react-icons recharts
pnpm add -D @types/recharts
```

Expected: 安装完成

**Step 3: 安装工具库**

```bash
pnpm add axios date-fns clsx tailwind-merge
```

Expected: 安装完成

**Step 4: 安装 Orval 和代码质量工具**

```bash
pnpm add -D orval @vitejs/plugin-react
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks prettier
```

Expected: 安装完成

**Step 5: 提交依赖**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat: install core dependencies (router, state, query, ui)"
```

---

## 阶段二:shadcn/ui 配置和基础组件 (45分钟)

### Task 5: 初始化 shadcn/ui

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`

**Step 1: 初始化 shadcn/ui**

```bash
cd /Users/shichenyang/WebstormProjects/qzt/frontend
pnpm dlx shadcn@latest init
```

在交互提示中选择:
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes
- React Server Components: No
- Component src: `src/components`
- Import alias: `@/`

Expected: 创建 `components.json` 和 `src/lib/utils.ts`

**Step 2: 添加常用 shadcn/ui 组件**

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add avatar
pnpm dlx shadcn@latest add form
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add toast
```

Expected: 创建 `src/components/ui/*` 目录和组件文件

**Step 3: 配置 Vite 路径别名**

修改 `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3456,
    proxy: {
      '/api': {
        target: 'http://localhost:7890',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

**Step 4: 更新 tsconfig.json 路径映射**

修改 `tsconfig.json` 添加:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 5: 测试组件导入**

修改 `src/App.tsx`:

```typescript
import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-3xl font-bold text-primary mb-4">企账通</h1>
      <Button>测试按钮</Button>
    </div>
  )
}

export default App
```

运行测试:

```bash
pnpm dev
```

Expected: 显示蓝色按钮

**Step 6: 提交配置**

```bash
git add frontend/
git commit -m "feat: initialize shadcn/ui and add base components"
```

---

### Task 6: 创建工具库和类型定义

**Files:**
- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/types/models.ts`

**Step 1: 创建 API 客户端**

创建 `src/lib/api-client.ts`:

```typescript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

**Step 2: 创建基础类型定义**

创建 `src/types/models.ts`:

```typescript
export interface User {
  id: string
  username: string
  name: string
  email?: string
  phone?: string
  avatar?: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  companyName?: string
  address?: string
  customerLevel: number
  sourceChannel?: number
  followUserId?: string
  tags?: string
  remark?: string
  status: number
  createdAt: string
  updatedAt: string
  followUser?: User
}

export interface FollowRecord {
  id: string
  customerId: string
  userId: string
  type: number
  content: string
  nextTime?: string
  images?: string
  createdAt: string
  updatedAt: string
  customer?: Customer
  user?: User
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}
```

**Step 3: 创建类型导出文件**

创建 `src/types/index.ts`:

```typescript
export * from './models'
```

**Step 4: 提交工具库**

```bash
git add frontend/src/
git commit -m "feat: create API client and TypeScript types"
```

---

## 阶段三:状态管理和路由 (45分钟)

### Task 7: 配置 Zustand 状态管理

**Files:**
- Create: `frontend/src/stores/auth.store.ts`
- Create: `frontend/src/stores/ui.store.ts`

**Step 1: 创建认证状态管理**

创建 `src/stores/auth.store.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginRequest } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  permissions: string[]

  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  updateUser: (user: User) => void
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      permissions: [],

      login: async (credentials) => {
        // TODO: 实现登录 API 调用
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        })
        const data = await response.json()

        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          permissions: data.user.permissions || [],
        })
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: [],
        })
      },

      updateUser: (user) => {
        set({ user })
      },

      hasPermission: (permission) => {
        const { permissions } = get()
        return permissions.includes(permission) || permissions.includes('*')
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

**Step 2: 创建 UI 状态管理**

创建 `src/stores/ui.store.ts`:

```typescript
import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  mobileMenuOpen: boolean

  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleMobileMenu: () => void
  setMobileMenuOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: 'system',
  mobileMenuOpen: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleMobileMenu: () =>
    set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  setTheme: (theme) => set({ theme }),
}))
```

**Step 3: 提交状态管理**

```bash
git add frontend/src/stores/
git commit -m "feat: implement Zustand state management (auth & ui)"
```

---

### Task 8: 配置 React Router

**Files:**
- Create: `frontend/src/pages/index.ts`
- Create: `frontend/src/pages/auth/LoginPage.tsx`
- Create: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Create: `frontend/src/pages/customer/CustomerListPage.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: 创建页面索引文件**

创建 `src/pages/index.ts`:

```typescript
export { default as LoginPage } from './auth/LoginPage'
export { default as DashboardPage } from './dashboard/DashboardPage'
export { default as CustomerListPage } from './customer/CustomerListPage'
```

**Step 2: 创建登录页面**

创建 `src/pages/auth/LoginPage.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ username, password })
      navigate('/')
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">企账通</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" className="w-full">
            登录
          </Button>
        </form>
      </Card>
    </div>
  )
}
```

**Step 3: 创建仪表板页面**

创建 `src/pages/dashboard/DashboardPage.tsx`:

```typescript
export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">工作台</h1>
      <p className="text-muted-foreground">欢迎使用企账通</p>
    </div>
  )
}
```

**Step 4: 创建客户列表页面**

创建 `src/pages/customer/CustomerListPage.tsx`:

```typescript
export default function CustomerListPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">客户管理</h1>
      <p className="text-muted-foreground">客户列表页面</p>
    </div>
  )
}
```

**Step 5: 配置路由**

修改 `src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage, DashboardPage, CustomerListPage } from '@/pages'
import { useAuthStore } from '@/stores/auth.store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomerListPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

**Step 6: 测试路由**

```bash
pnpm dev
```

Expected:
- 访问 `/` 自动跳转到 `/login`
- 登录后跳转到工作台

**Step 7: 提交路由配置**

```bash
git add frontend/src/
git commit -m "feat: configure React Router with protected routes"
```

---

## 阶段四:响应式布局框架 (1小时)

### Task 9: 创建响应式布局组件

**Files:**
- Create: `frontend/src/components/layout/ResponsiveLayout.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/MobileTabBar.tsx`

**Step 1: 创建响应式布局主组件**

创建 `src/components/layout/ResponsiveLayout.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileTabBar } from './MobileTabBar'

export default function ResponsiveLayout() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <Sidebar />}

      <div className={`${!isMobile ? 'ml-64' : ''} pb-16 md:pb-0`}>
        <Header isMobile={isMobile} />
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {isMobile && <MobileTabBar />}
    </div>
  )
}
```

**Step 2: 创建侧边栏组件**

创建 `src/components/layout/Sidebar.tsx`:

```typescript
import { Link, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons/react'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const location = useLocation()
  const collapsed = useUIStore((state) => state.sidebarCollapsed)

  const menuItems = [
    { path: '/', icon: HomeOutlined, label: '首页' },
    { path: '/customers', icon: UserOutlined, label: '客户' },
    { path: '/contracts', icon: FileTextOutlined, label: '合同' },
    { path: '/products', icon: AppstoreOutlined, label: '产品' },
    { path: '/settings', icon: SettingOutlined, label: '系统' },
  ]

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-center h-16 border-b border-slate-700">
        <span className={cn('font-bold text-xl', collapsed && 'hidden')}>
          企账通
        </span>
        <span className={cn('font-bold text-xl', !collapsed && 'hidden')}>
          企
        </span>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-slate-800'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
```

**Step 3: 创建头部组件**

创建 `src/components/layout/Header.tsx`:

```typescript
import { UserOutlined, LogoutOutlined, MenuOutlined } from '@ant-design/icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'

interface HeaderProps {
  isMobile: boolean
}

export function Header({ isMobile }: HeaderProps) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const toggleMobileMenu = useUIStore((state) => state.toggleMobileMenu)

  return (
    <header className="sticky top-0 z-10 bg-background border-b px-4 md:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            <MenuOutlined className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-xl font-bold">企账通</h1>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <Avatar className="w-8 h-8">
              <UserOutlined />
            </Avatar>
            <span className="hidden md:inline">{user?.name || '管理员'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <UserOutlined className="w-4 h-4 mr-2" />
            个人中心
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout}>
            <LogoutOutlined className="w-4 h-4 mr-2" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
```

**Step 4: 创建移动端底部Tab导航**

创建 `src/components/layout/MobileTabBar.tsx`:

```typescript
import { Link, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  UserOutlined,
  DollarOutlined,
  SettingOutlined,
} from '@ant-design/icons/react'
import { cn } from '@/lib/utils'

export function MobileTabBar() {
  const location = useLocation()

  const tabs = [
    { path: '/', icon: HomeOutlined, label: '首页' },
    { path: '/customers', icon: UserOutlined, label: '客户' },
    { path: '/contracts', icon: DollarOutlined, label: '合同' },
    { path: '/settings', icon: SettingOutlined, label: '系统' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = location.pathname === tab.path

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

**Step 5: 集成布局到路由**

修改 `src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage, DashboardPage, CustomerListPage } from '@/pages'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import { useAuthStore } from '@/stores/auth.store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <ResponsiveLayout>{children}</ResponsiveLayout> : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomerListPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

**Step 6: 测试响应式布局**

```bash
pnpm dev
```

Expected:
- PC端(≥1280px): 显示左侧边栏
- 移动端(<768px): 显示底部Tab导航
- 调整浏览器宽度，布局自动切换

**Step 7: 提交布局组件**

```bash
git add frontend/src/
git commit -m "feat: implement responsive layout with sidebar and mobile tab bar"
```

---

## 阶段五:Orval 配置和 API 服务生成 (30分钟)

### Task 10: 配置 Orval

**Files:**
- Create: `frontend/orval.config.ts`
- Modify: `frontend/package.json`

**Step 1: 创建 Orval 配置文件**

创建 `orval.config.ts`:

```typescript
export default {
  backend: {
    output: './src/services',
    url: 'http://localhost:7890/api-docs-json',
    openapi: true,
    definitions: {
      query: {
        useQuery: true,
        useInfinite: true,
        useInfiniteQueryParam: 'page',
      },
      mutation: {
        useMutation: true,
      },
    },
    hooks: {
      afterGeneration: 'prettier --write',
    },
  },
}
```

**Step 2: 添加生成脚本**

修改 `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "generate:api": "orval",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write ."
  }
}
```

**Step 3: 确保后端服务运行**

```bash
cd /Users/shichenyang/WebstormProjects/qzt
./start-dev.sh
```

或者手动启动后端:

```bash
cd backend
pnpm run start:dev
```

Expected: 后端服务运行在 http://localhost:7890

**Step 4: 生成 API 服务**

新开终端窗口:

```bash
cd /Users/shichenyang/WebstormProjects/qzt/frontend
pnpm generate:api
```

Expected: 在 `src/services/` 目录生成 API 服务文件

**Step 5: 检查生成的文件**

```bash
ls -la src/services/
```

Expected: 看到 `customers.ts`, `auth.ts`, `follow-records.ts` 等文件

**Step 6: 提交 Orval 配置**

```bash
git add frontend/
git commit -m "feat: configure Orval to generate API services from OpenAPI"
```

---

## 阶段六:客户管理模块 (1.5小时)

### Task 11: 创建客户列表页面

**Files:**
- Modify: `frontend/src/pages/customer/CustomerListPage.tsx`
- Create: `frontend/src/components/common/CustomerCard.tsx`
- Create: `frontend/src/components/common/CustomerTable.tsx`

**Step 1: 修改客户列表页面**

修改 `src/pages/customer/CustomerListPage.tsx`:

```typescript
import { useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { CustomerTable } from '@/components/common/CustomerTable'
import { CustomerCard } from '@/components/common/CustomerCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCustomers } from '@/services'

export default function CustomerListPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useCustomers({
    page,
    pageSize: isMobile ? 20 : 10,
    keyword: search || undefined,
  })

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">客户管理</h1>
        <Button>新建客户</Button>
      </div>

      <Input
        placeholder="搜索客户名称、联系人"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {isMobile ? (
        <div className="grid gap-4">
          {data?.data?.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      ) : (
        <CustomerTable
          customers={data?.data || []}
          total={data?.total || 0}
          page={page}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
```

**Step 2: 创建 useMediaQuery Hook**

创建 `src/hooks/useMediaQuery.ts`:

```typescript
import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}
```

**Step 3: 创建客户卡片组件**

创建 `src/components/common/CustomerCard.tsx`:

```typescript
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Customer } from '@/types'

interface CustomerCardProps {
  customer: Customer
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const levelMap = {
    0: { text: '潜在', color: 'default' as const },
    1: { text: '意向', color: 'secondary' as const },
    2: { text: '正式', color: 'default' as const },
    3: { text: 'VIP', color: 'outline' as const },
  }

  const level = levelMap[customer.customerLevel] || levelMap[0]

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg">{customer.name}</h3>
        <Badge variant={level.color}>{level.text}</Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">联系人:</span>
          <span>{customer.contactName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">电话:</span>
          <span>{customer.contactPhone}</span>
        </div>
        {customer.companyName && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">公司:</span>
            <span>{customer.companyName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">跟进人:</span>
          <span>{customer.followUser?.name || '-'}</span>
        </div>
      </div>
    </Card>
  )
}
```

**Step 4: 创建客户表格组件**

创建 `src/components/common/CustomerTable.tsx`:

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Customer } from '@/types'

interface CustomerTableProps {
  customers: Customer[]
  total: number
  page: number
  onPageChange: (page: number) => void
}

export function CustomerTable({
  customers,
  total,
  page,
  onPageChange,
}: CustomerTableProps) {
  const levelMap = {
    0: { text: '潜在', color: 'default' as const },
    1: { text: '意向', color: 'secondary' as const },
    2: { text: '正式', color: 'default' as const },
    3: { text: 'VIP', color: 'outline' as const },
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>客户名称</TableHead>
            <TableHead>联系人</TableHead>
            <TableHead>联系电话</TableHead>
            <TableHead>公司名称</TableHead>
            <TableHead>客户等级</TableHead>
            <TableHead>跟进人</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const level = levelMap[customer.customerLevel] || levelMap[0]

            return (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.contactName}</TableCell>
                <TableCell>{customer.contactPhone}</TableCell>
                <TableCell>{customer.companyName || '-'}</TableCell>
                <TableCell>
                  <Badge variant={level.color}>{level.text}</Badge>
                </TableCell>
                <TableCell>{customer.followUser?.name || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      查看
                    </Button>
                    <Button variant="ghost" size="sm">
                      编辑
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          上一页
        </Button>
        <span className="flex items-center px-4">第 {page} 页</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page * 10 >= total}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}
```

**Step 5: 测试客户列表**

```bash
pnpm dev
```

Expected: 显示客户列表，支持搜索、分页、响应式切换

**Step 6: 提交客户列表**

```bash
git add frontend/src/
git commit -m "feat: implement customer list page with responsive design"
```

---

### Task 12: 创建客户详情页面

**Files:**
- Create: `frontend/src/pages/customer/CustomerDetailPage.tsx`
- Create: `frontend/src/components/common/FollowTimeline.tsx`

**Step 1: 创建客户详情页面**

创建 `src/pages/customer/CustomerDetailPage.tsx`:

```typescript
import { useParams } from 'react-router-dom'
import { useCustomer } from '@/services'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FollowTimeline } from '@/components/common/FollowTimeline'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: customer, isLoading, error } = useCustomer(id!)

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败</div>

  const levelMap = {
    0: { text: '潜在', color: 'default' as const },
    1: { text: '意向', color: 'secondary' as const },
    2: { text: '正式', color: 'default' as const },
    3: { text: 'VIP', color: 'outline' as const },
  }

  const level = levelMap[customer?.customerLevel || 0] || levelMap[0]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{customer?.name}</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">客户信息</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">客户名称:</span>
                <p className="font-medium">{customer?.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">联系人:</span>
                <p className="font-medium">{customer?.contactName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">联系电话:</span>
                <p className="font-medium">{customer?.contactPhone}</p>
              </div>
              {customer?.companyName && (
                <div>
                  <span className="text-muted-foreground">公司名称:</span>
                  <p className="font-medium">{customer.companyName}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">客户等级:</span>
                <div className="mt-1">
                  <Badge variant={level.color}>{level.text}</Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">跟进人:</span>
                <p className="font-medium">{customer?.followUser?.name || '-'}</p>
              </div>
              {customer?.address && (
                <div>
                  <span className="text-muted-foreground">地址:</span>
                  <p className="font-medium">{customer.address}</p>
                </div>
              )}
              {customer?.remark && (
                <div>
                  <span className="text-muted-foreground">备注:</span>
                  <p className="font-medium">{customer.remark}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">跟进记录</h2>
            <FollowTimeline customerId={customer!.id} />
          </Card>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: 创建跟进记录时间线组件**

创建 `src/components/common/FollowTimeline.tsx`:

```typescript
import { useFollowRecords } from '@/services'
import { Button } from '@/components/ui/button'

interface FollowTimelineProps {
  customerId: string
}

export function FollowTimeline({ customerId }: FollowTimelineProps) {
  const { data: records, isLoading } = useFollowRecords({ customerId })

  if (isLoading) return <div>加载中...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button>添加跟进记录</Button>
      </div>

      <div className="space-y-4">
        {records?.map((record) => (
          <div key={record.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="w-0.5 flex-1 bg-border" />
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">{record.user?.name}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(record.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm">{record.content}</p>
              {record.nextTime && (
                <p className="text-sm text-muted-foreground mt-2">
                  下次跟进: {new Date(record.nextTime).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!records || records.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          暂无跟进记录
        </div>
      )}
    </div>
  )
}
```

**Step 3: 添加详情页路由**

修改 `src/App.tsx`:

```typescript
// 在 imports 中添加
import { CustomerDetailPage } from '@/pages'

// 在 Routes 中添加
<Route
  path="/customers/:id"
  element={
    <ProtectedRoute>
      <CustomerDetailPage />
    </ProtectedRoute>
  }
/>
```

修改 `src/components/common/CustomerTable.tsx` 添加跳转链接:

```typescript
import { useNavigate } from 'react-router-dom'

// 在组件内
const navigate = useNavigate()

// 在操作按钮中
<Button
  variant="ghost"
  size="sm"
  onClick={() => navigate(`/customers/${customer.id}`)}
>
  查看
</Button>
```

**Step 4: 测试客户详情**

```bash
pnpm dev
```

Expected: 点击客户跳转到详情页，显示客户信息和跟进记录

**Step 5: 提交客户详情**

```bash
git add frontend/src/
git commit -m "feat: implement customer detail page with follow timeline"
```

---

## 阶段七:优化和测试 (30分钟)

### Task 13: 配置 ESLint 和 Prettier

**Files:**
- Create: `frontend/.eslintrc.json`
- Create: `frontend/.prettierrc.json`

**Step 1: 创建 ESLint 配置**

创建 `.eslintrc.json`:

```json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["react", "@typescript-eslint"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-explicit-any": "warn"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

**Step 2: 创建 Prettier 配置**

创建 `.prettierrc.json`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

**Step 3: 运行代码检查**

```bash
pnpm lint
pnpm format
```

Expected: 自动格式化代码

**Step 4: 提交配置**

```bash
git add frontend/
git commit -m "feat: configure ESLint and Prettier"
```

---

### Task 14: 创建生产构建

**Files:**
- Build artifacts

**Step 1: 构建生产版本**

```bash
cd /Users/shichenyang/WebstormProjects/qzt/frontend
pnpm build
```

Expected: 在 `dist/` 目录生成构建文件

**Step 2: 预览构建结果**

```bash
pnpm preview
```

Expected: 启动预览服务器，可以访问构建后的应用

**Step 3: 检查构建大小**

```bash
du -sh dist/
```

**Step 4: 提交构建脚本**

```bash
git add frontend/
git commit -m "feat: verify production build"
```

---

### Task 15: 更新启动脚本

**Files:**
- Modify: `start-dev.sh`

**Step 1: 修改启动脚本**

修改项目根目录的 `start-dev.sh`:

```bash
#!/bin/bash

# 启动后端
echo "检查后端服务..."
if ! lsof -i :7890 > /dev/null 2>&1; then
    echo "启动后端服务..."
    cd backend && pnpm run start:dev &
    sleep 3
else
    echo "后端服务已在运行"
fi

# 启动前端
echo "检查前端服务..."
if ! lsof -i :3456 > /dev/null 2>&1; then
    echo "启动前端服务..."
    cd frontend && pnpm dev &
else
    echo "前端服务已在运行"
fi

echo "✅ 开发环境启动完成"
echo "后端: http://localhost:7890"
echo "前端: http://localhost:3456"
```

**Step 2: 测试启动脚本**

```bash
cd /Users/shichenyang/WebstormProjects/qzt
./start-dev.sh
```

Expected: 同时启动前后端服务

**Step 3: 提交启动脚本**

```bash
git add start-dev.sh
git commit -m "feat: update start script for new frontend"
```

---

## 阶段八:文档和总结 (30分钟)

### Task 16: 编写 README

**Files:**
- Create: `frontend/README.md`

**Step 1: 创建前端 README**

创建 `frontend/README.md`:

```markdown
# 企账通前端

基于 React + Vite + Tailwind CSS + shadcn/ui 构建的响应式前端应用。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **路由**: React Router v6
- **状态管理**: Zustand
- **数据请求**: TanStack Query
- **UI 框架**: Tailwind CSS + shadcn/ui
- **图标**: react-icons
- **图表**: recharts
- **API 生成**: Orval

## 开发

### 安装依赖

\`\`\`bash
pnpm install
\`\`\`

### 启动开发服务器

\`\`\`bash
pnpm dev
\`\`\`

访问 http://localhost:3456

### 生成 API 服务

\`\`\`bash
pnpm generate:api
\`\`\`

### 构建

\`\`\`bash
pnpm build
\`\`\`

### 代码检查

\`\`\`bash
pnpm lint
pnpm format
\`\`\`

## 目录结构

\`\`\`
src/
├── components/       # 组件
│   ├── ui/          # shadcn/ui 组件
│   ├── layout/      # 布局组件
│   └── common/      # 业务组件
├── pages/           # 页面
├── hooks/           # 自定义 Hooks
├── services/        # API 服务 (Orval 生成)
├── stores/          # Zustand 状态管理
├── lib/             # 工具库
├── types/           # TypeScript 类型
└── styles/          # 全局样式
\`\`\`

## 响应式断点

- **Mobile**: < 768px (单列 + 底部Tab)
- **Tablet**: 768px - 1279px (两列)
- **Desktop**: ≥ 1280px (三列 + 侧边栏)
```

**Step 2: 提交 README**

```bash
git add frontend/README.md
git commit -m "docs: add frontend README"
```

---

### Task 17: 最终检查和合并

**Step 1: 运行完整测试**

```bash
cd /Users/shichenyang/WebstormProjects/qzt
./start-dev.sh
```

测试清单:
- ✅ 登录功能正常
- ✅ 客户列表显示正常
- ✅ 客户详情显示正常
- ✅ 响应式布局切换正常
- ✅ API 请求正常
- ✅ 路由跳转正常

**Step 2: 检查 Git 状态**

```bash
git status
git log --oneline -20
```

**Step 3: 推送到远程**

```bash
git push -u origin feat/react-tailwind-frontend
```

**Step 4: 创建 Pull Request**

```bash
gh pr create --title "feat: 重构前端为 React + Tailwind + shadcn/ui" --body "## 概述
使用现代化技术栈重新构建前端应用

## 技术栈
- Vite + React 18 + TypeScript
- React Router v6 + Zustand + TanStack Query
- Tailwind CSS + shadcn/ui
- Orval 自动生成 API 服务

## 主要功能
✅ 响应式布局 (PC/平板/移动端)
✅ 认证和权限系统
✅ 客户管理模块
✅ 跟进记录模块

## 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试

## 截图
待添加"
```

---

## 总结

### 已完成任务

✅ **阶段一**: 项目初始化 (Vite + React + TypeScript)
✅ **阶段二**: Tailwind CSS + shadcn/ui 配置
✅ **阶段三**: Zustand 状态管理 + React Router
✅ **阶段四**: 响应式布局框架 (侧边栏 + 底部Tab)
✅ **阶段五**: Orval API 服务自动生成
✅ **阶段六**: 客户管理模块 (列表 + 详情 + 跟进记录)
✅ **阶段七**: ESLint + Prettier 代码质量
✅ **阶段八**: 文档和总结

### 技术亮点

- 🚀 **极快启动**: Vite 冷启动 < 1秒
- 💪 **类型安全**: 完整的 TypeScript 类型系统
- 🎨 **现代设计**: shadcn/ui 组件库
- 📱 **响应式**: 完美适配 PC/平板/移动端
- 🔄 **自动化**: Orval 从 OpenAPI 自动生成 API 服务
- ⚡ **性能**: TanStack Query 自动缓存管理

### 后续优化

- [ ] 单元测试 (Vitest)
- [ ] E2E 测试 (Playwright)
- [ ] 性能优化 (懒加载、代码分割)
- [ ] PWA 支持
- [ ] 国际化 (i18n)

---

**实施计划完成时间**: 预计 6-8 小时
**技术难度**: 中等
**推荐执行方式**: Subagent-Driven (本会话逐步实施)
