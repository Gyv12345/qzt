# Shadcn Admin 架构详解

> 来源: https://github.com/satnaing/shadcn-admin
> 版本: 2.2.1

## 目录架构

项目采用基于功能的架构（Feature-based Architecture），具有清晰的关注点分离：

### 整体架构图

```
shadcn-admin/
├── public/              # 静态资源
├── src/
│   ├── assets/         # 品牌资源（logo、图标）
│   ├── components/     # 可复用组件
│   ├── features/       # 业务功能模块
│   ├── hooks/          # 自定义 Hooks
│   ├── routes/         # 文件路由
│   ├── stores/         # 状态管理
│   └── styles/         # 全局样式
└── 配置文件
```

## 组件架构

### 组件分层

```
src/components/
├── ui/                    # Shadcn UI 基础组件（无业务逻辑）
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
├── layout/                # 布局组件（应用级结构）
│   ├── authenticated-layout.tsx
│   ├── app-sidebar.tsx
│   ├── header.tsx
│   └── nav-group.tsx
└── [feature]/            # 功能组件（具体业务功能）
    ├── data-table/       # 可复用的复杂组件
    ├── command-menu.tsx
    └── ...
```

### 布局系统

#### AuthenticatedLayout

**职责**: 已认证用户的布局容器

**特性**:
- 侧边栏状态持久化（通过 Cookie）
- 响应式设计（容器查询）
- 无障碍功能（跳转到主内容）
- 集成 Search 和 Layout Providers

**关键代码**:
```typescript
export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset className="@container/content">
            {children ?? <Outlet />}
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
```

#### 侧边栏架构

**组件组成**:
1. **AppSidebar** - 主容器，与 UI Sidebar 集成
2. **NavGroup** - 导航分组（支持折叠）
3. **Nav** - 导航项（支持活动状态、徽章、图标）

**导航数据结构**:
```typescript
interface SidebarData {
  title: string
  items: SidebarItem[]
}

interface SidebarItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  isActive?: boolean
  badge?: string | number
  items?: SidebarItem[]  // 嵌套项目
}
```

**响应式行为**:
- **桌面端**: 折叠时显示下拉菜单，展开时显示完整可折叠菜单
- **移动端**: 抽屉式侧边栏（Overlay）
- **状态持久化**: 使用 Cookie 保存用户偏好

#### 头部集成

**特性**:
- 基于滚动位置的粘性头部
- 可选的阴影效果
- 侧边栏触发按钮（移动端/折叠）
- 背景模糊效果

### 数据表格组件

**功能**:
- ✅ 服务端/客户端分页
- ✅ 列排序
- ✅ 列筛选
- ✅ 全局搜索
- ✅ 列显示/隐藏
- ✅ 行选择
- ✅ 响应式设计

**架构**:
```
src/components/data-table/
├── data-table.tsx          # 主组件
├── data-table-toolbar.tsx  # 工具栏（搜索、列选择）
├── data-table-pagination.tsx  # 分页控件
└── types.ts                # TypeScript 类型
```

**使用模式**:
```typescript
// 使用 URL 状态管理
import { useTableUrlState } from '@/hooks/use-table-url-state'

const { pagination, sorting, filters } = useTableUrlState()

// 服务器端查询
const { data } = useQuery({
  queryKey: ['users', pagination, sorting, filters],
  queryFn: () => fetchUsers({ pagination, sorting, filters }),
})
```

## 路由架构

### TanStack Router 文件路由

```
src/routes/
├── routeTree.gen.ts       # 自动生成的路由树
├── __root.tsx             # 根路由（布局、Providers）
├── (auth)/                # 认证路由组
│   ├── sign-in.tsx
│   └── sign-up.tsx
└── _authenticated/        # 受保护路由组
    ├── dashboard.tsx
    └── users/
        └── users.tsx
```

### 路由保护

**实现方式**:
```typescript
// _authenticated/__root.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location, context }) => {
    // 检查认证状态
    if (!isAuthenticated()) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
})
```

### 导航进度

**组件**: `NavigationProgress`

**功能**: 在路由转换期间显示加载进度条

**集成**:
```typescript
// __root.tsx
import { router } from './routeTree.gen'

router.subscribe('onBeforeLoad', () => {
  // 显示进度条
})

router.subscribe('onLoad', () => {
  // 隐藏进度条
})
```

## 状态管理

### Zustand Store

**示例**: Auth Store

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
```

### Context Providers

**使用的 Contexts**:
1. **ThemeProvider** - 主题管理（亮色/暗色）
2. **DirectionProvider** - 方向管理（LTR/RTL）
3. **LayoutProvider** - 布局配置
4. **SearchProvider** - 全局搜索
5. **FontProvider** - 字体配置

## 表单处理

### React Hook Form + Zod

**模式**:
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 1. 定义 Zod schema
const formSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  email: z.string().email('请输入有效的邮箱'),
  password: z.string().min(7, '密码长度至少为 7 个字符'),
})

// 2. 使用 useForm
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    username: '',
    email: '',
    password: '',
  },
})

// 3. 提交处理
const onSubmit = (data: z.infer<typeof formSchema>) => {
  console.log(data)
}
```

### 确认对话框

**自定义 Hook**: `useDialogState`

```typescript
export function useDialogState() {
  const [open, setOpen] = useState(false)

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  return {
    open,
    onOpenChange: setOpen,
    handleOpen,
    handleClose,
  }
}
```

## 样式系统

### Tailwind CSS v4

**配置**: `@tailwindcss/vite` 插件

**主题变量**:
```css
/* src/styles/theme.css */
@theme {
  --color-primary: *;
  --color-background: *;
  --color-foreground: *;
  /* ... 更多 CSS 变量 */
}
```

### cn() 工具函数

**用途**: 合并 Tailwind 类名（支持条件类）

```typescript
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

// 使用 CVA 定义变体
const buttonVariants = cva(
  'inline-flex items-center justify-center',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
      },
    },
  }
)

// 使用 cn() 合并类名
<button className={cn(buttonVariants({ variant, size }), className)}>
  {children}
</button>
```

## 数据获取

### TanStack Query

**模式**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// 查询
const { data, isLoading, error } = useQuery({
  queryKey: ['users', page],
  queryFn: () => fetchUsers(page),
  staleTime: 1000 * 60 * 5, // 5 分钟
})

// 变更
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  },
})
```

## 无障碍性

### 跳转到主内容

**组件**: `SkipToMain`

```typescript
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
>
  跳转到主内容
</a>
```

### ARIA 属性

所有交互组件都包含适当的 ARIA 属性：
- `aria-label`
- `aria-expanded`
- `aria-selected`
- `role` 属性

## RTL 支持

### 实现方式

1. **DirectionProvider**:
```typescript
<DirectionProvider direction={direction}>
  {children}
</DirectionProvider>
```

2. **CSS 逻辑属性**:
```css
/* 使用 margin-inline-start 而不是 margin-left */
.sidebar {
  margin-inline-start: 1rem;
}
```

3. **Radix UI 原生支持**:
   - 所有 Radix 组件都支持 RTL
   - 自动处理镜像布局

## 性能优化

### 代码分割

- TanStack Router 自动代码分割
- React.lazy() 用于大型组件
- 动态导入用于图表等重型库

### 容器查询

```css
@container (min-width: 640px) {
  /* 在容器宽度 >= 640px 时应用 */
}
```

### 图片优化

- 使用 WebP 格式
- 响应式图片
- 懒加载

## 类型安全

### TanStack Router 类型

```typescript
// 路由参数类型
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$userId')({
  component: UserDetail,
})

// 在组件中使用
const { userId } = Route.useParams()
// userId 自动推断为 string 类型
```

### 全局类型

```typescript
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## 最佳实践

### 1. 组件组织

```
✅ 推荐:
components/
  features/
    auth/
      sign-in-form.tsx
      sign-up-form.tsx

❌ 避免:
components/
  sign-in-form.tsx
  sign-up-form.tsx
```

### 2. Hooks 命名

```typescript
// ✅ 使用 use 前缀
useTableUrlState()
useDialogState()
useMediaQuery()

// ❌ 避免其他前缀
getTableUrlState()
getDialogState()
```

### 3. 类型导出

```typescript
// ✅ 导出类型
export type { User }
export interface { AuthContext }

// ✅ 类型命名
interface UserData { }  // 数据类型
type UserProps = { }     // Props 类型
```

### 4. 错误处理

```typescript
// ✅ 使用 Error Boundaries
import { ErrorBoundary } from 'react-error-bounding'

<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>

// ✅ TanStack Query 错误处理
const { error } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  retry: 1,
  onError: (error) => {
    toast.error('加载失败: ' + error.message)
  },
})
```

## 总结

Shadcn Admin 的架构展示了现代 React 应用的最佳实践：
- 📁 基于功能的目录结构
- 🎯 清晰的关注点分离
- 🔒 完整的类型安全
- ♿ 优秀的无障碍性
- 🌍 国际化和 RTL 支持
- ⚡ 性能优化（代码分割、容器查询）
- 🎨 可定制的主题系统
