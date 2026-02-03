# 前端架构重构设计方案

**项目**: 企账通 (QZT) SCRM 系统
**日期**: 2026-02-03
**版本**: v2.0
**状态**: 🎯 设计确认

---

## 📋 目录

1. [整体架构](#1-整体架构)
2. [布局系统](#2-布局系统)
3. [DataTable 组件](#3-datatable-组件-优先级-1)
4. [Sidebar 导航](#4-sidebar-导航-优先级-2)
5. [Form 表单组件](#5-form-表单组件-优先级-3)
6. [Dashboard 仪表盘](#6-dashboard-仪表盘-优先级-4)
7. [Command Menu 全局搜索](#7-command-menu-全局搜索-优先级-5)
8. [Sheet Drawer 设计](#8-sheet-drawer-设计)
9. [i18n 多语言支持](#9-i18n-多语言支持)
10. [实施计划](#10-实施计划)

---

## 1. 整体架构

### 1.1 技术栈选型

#### 核心框架
```json
{
  "dependencies": {
    "@tanstack/react-router": "^1.141.2",
    "@tanstack/react-table": "^8.21.3",
    "react-hook-form": "^7.68.0",
    "@hookform/resolvers": "^5.2.2",
    "zod": "^4.2.0",
    "cmdk": "^1.1.1",
    "react-top-loading-bar": "^3.0.2",
    "sonner": "^2.0.0",
    "react-i18next": "^15.0.0",
    "i18next": "^24.0.0"
  }
}
```

#### 保持不变
- React 19.2.4
- TypeScript ~5.9.3
- Tailwind CSS 4.x
- Shadcn UI (@radix-ui/*)
- Zustand (状态管理)
- TanStack Query v5
- Lucide React (图标)

### 1.2 设计原则

#### 核心原则
1. **类型安全优先** - 所有路由参数、搜索参数、表单数据全部类型化
2. **URL 即状态** - 表格筛选、排序、分页自动同步到 URL
3. **组件复用** - 抽取通用组件，减少重复代码
4. **性能优化** - 代码分割、数据预加载、智能缓存
5. **渐进增强** - 分阶段实施，每阶段可独立交付

#### 架构决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| **路由系统** | TanStack Router | 文件路由、类型安全、深度集成 Query |
| **表格组件** | TanStack Table | 灵活、高性能、无头设计 |
| **表单验证** | React Hook Form + Zod | 类型安全、性能优秀、DX 佳 |
| **UI 组件** | shadcn/ui | 可定制、基于 Radix、可复制代码 |
| **状态管理** | Zustand + Query | 简单、类型安全、服务端状态优化 |
| **样式方案** | Tailwind CSS | 快速开发、一致性、小体积 |

### 1.3 项目结构

```
frontend/
├── src/
│   ├── routes/                    # 文件路由系统
│   │   ├── __root.tsx             # 根布局
│   │   ├── routeTree.gen.ts       # 自动生成
│   │   ├── (auth)/                # 认证路由组
│   │   │   └── login.tsx
│   │   └── _authenticated/        # 已认证路由组
│   │       ├── __root.tsx         # 认证布局
│   │       ├── index.tsx          # 重定向到 dashboard
│   │       ├── dashboard.tsx
│   │       ├── customers.tsx
│   │       ├── customers.$id.tsx
│   │       ├── contacts.tsx
│   │       ├── contacts.$id.tsx
│   │       ├── contracts.tsx
│   │       ├── contracts.$id.tsx
│   │       ├── invoices.tsx
│   │       ├── products.tsx
│   │       ├── products.$id.tsx
│   │       ├── follow-records.tsx
│   │       ├── statistics.tsx
│   │       └── system.tsx
│   ├── features/                  # 功能模块
│   │   ├── customer/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── schemas/
│   │   │   └── types.ts
│   │   ├── contact/
│   │   ├── contract/
│   │   ├── invoice/
│   │   ├── product/
│   │   ├── follow-record/
│   │   ├── statistics/
│   │   ├── dashboard/
│   │   ├── auth/
│   │   └── system/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui 组件
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── sheet.tsx
│   │   │   └── ...
│   │   ├── layout/                # 布局组件
│   │   │   ├── authenticated-layout.tsx
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── main.tsx
│   │   │   └── data/
│   │   │       └── sidebar-data.ts
│   │   ├── data-table/            # 数据表格组件
│   │   │   ├── data-table.tsx
│   │   │   ├── data-table-toolbar.tsx
│   │   │   ├── data-table-pagination.tsx
│   │   │   ├── data-table-faceted-filter.tsx
│   │   │   └── data-table-column-header.tsx
│   │   ├── form/                  # 表单组件
│   │   │   ├── form-field.tsx
│   │   │   ├── form-item.tsx
│   │   │   ├── form-label.tsx
│   │   │   ├── form-control.tsx
│   │   │   └── form-message.tsx
│   │   ├── command-menu/          # 全局搜索
│   │   │   ├── command-menu.tsx
│   │   │   └── command-menu-trigger.tsx
│   │   ├── theme-provider.tsx     # 主题提供者
│   │   ├── theme-switch.tsx       # 主题切换
│   │   ├── language-switch.tsx    # 语言切换
│   │   └── errors/                # 错误页面
│   │       ├── not-found-error.tsx
│   │       ├── unauthorized-error.tsx
│   │       └── general-error.tsx
│   ├── hooks/                     # 自定义 Hooks
│   │   ├── use-table-url-state.ts
│   │   ├── use-mobile.ts
│   │   ├── use-breakpoint.ts
│   │   └── use-toast.ts
│   ├── lib/                       # 工具库
│   │   ├── api-client.ts          # API 客户端
│   │   ├── utils.ts               # 工具函数
│   │   └── i18n.ts                # i18n 配置
│   ├── stores/                    # Zustand stores
│   ├── services/                  # API 服务 (Orval 生成)
│   ├── models/                    # TypeScript 类型
│   └── locales/                   # 多语言文件
│       ├── zh-CN.json
│       ├── zh-TW.json
│       └── en-US.json
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 2. 布局系统

### 2.1 组件层次结构

```
__root.tsx (根布局)
├── RouterProvider (TanStack Router)
├── QueryClientProvider (TanStack Query)
├── ThemeProvider (主题)
├── I18nextProvider (多语言)
├── Toaster (通知)
└── Outlet
    └── _authenticated/__root.tsx (认证布局)
        ├── AppSidebar (侧边栏)
        ├── Header (顶部栏)
        └── Main (内容区)
            └── LoadingBar (顶部进度条)
            └── Outlet (页面内容)
```

### 2.2 根布局实现

```typescript
// routes/__root.tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme-provider'
import { I18nextProvider } from 'react-i18next'
import { Toaster } from 'sonner'
import { i18n } from '@/lib/i18n'
import { queryClient } from '@/lib/api-client'

interface RouterContext {
  isAuthenticated: boolean
  user: User | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: GeneralError,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="qzt-theme">
        <I18nextProvider i18n={i18n}>
          <Outlet />
          <Toaster position="top-right" richColors />
        </I18nextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

### 2.3 认证布局实现

```typescript
// routes/_authenticated/__root.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <Main />
      </div>
    </div>
  )
}
```

### 2.4 Header 组件

```typescript
// components/layout/header.tsx
import { Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { CommandMenuTrigger } from '@/components/command-menu/command-menu-trigger'
import { useAuth } from '@/features/auth/hooks/use-auth'

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* 搜索触发器 */}
      <div className="flex items-center space-x-4">
        <CommandMenuTrigger>
          <Button variant="outline" size="sm" className="w-64 justify-start text-muted-foreground">
            <Search className="mr-2 h-4 w-4" />
            搜索... (⌘K)
          </Button>
        </CommandMenuTrigger>
      </div>

      {/* 右侧操作 */}
      <div className="flex items-center space-x-2">
        <ThemeSwitch />
        <LanguageSwitch />
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-2 pl-2">
          <div className="h-8 w-8 rounded-full bg-primary" />
          <span className="text-sm font-medium">{user?.name}</span>
        </div>
      </div>
    </header>
  )
}
```

### 2.5 Main 组件

```typescript
// components/layout/main.tsx
import { Outlet } from '@tanstack/react-router'
import { useLoadingBar } from '@/hooks/use-loading-bar'

export function Main() {
  const loadingBar = useLoadingBar()

  return (
    <main className="flex-1 overflow-auto p-6">
      <loadingBar.LoadingBar />
      <Outlet />
    </main>
  )
}
```

### 2.6 响应式断点

```css
/* Tailwind 断点配置 */
{
  screens: {
    'xs': '475px',
    'sm': '640px',
    'md': '768px',
    'lg': '1024px',
    'xl': '1280px',
    '2xl': '1536px',
  }
}
```

#### 侧边栏响应式行为

| 屏幕尺寸 | 侧边栏状态 | 折叠方式 |
|----------|-----------|----------|
| `xs` - `md` | 完全隐藏 | 抽屉式滑入 |
| `md` - `lg` | 默认折叠 | 图标模式 |
| `lg`+ | 默认展开 | 可手动折叠 |

### 2.7 从 shadcn-admin 复制的组件

#### 需要复制的文件

```
shadcn-admin/src/
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx          → app-sidebar.tsx
│   │   ├── sidebar-header.tsx   → 保留
│   │   ├── sidebar-footer.tsx   → 保留
│   │   ├── collapsible.tsx      → 保留
│   │   └── data/
│   │       └── sidebar-data.ts  → 保留
│   ├── command-menu.tsx         → command-menu/
│   ├── data-table/
│   │   ├── data-table.tsx       → 保留
│   │   ├── data-table-toolbar.tsx
│   │   ├── data-table-pagination.tsx
│   │   └── data-table-faceted-filter.tsx
│   └── theme-provider.tsx       → 保留
└── lib/
    └── utils.ts                 → 合并到现有 utils
```

---

## 3. DataTable 组件 (优先级 1)

### 3.1 功能特性

#### 核心功能
- ✅ **排序** - 多列排序、排序状态持久化到 URL
- ✅ **筛选** - 列筛选、多选筛选、日期范围筛选
- ✅ **分页** - 客户端/服务端分页、页面大小可配置
- ✅ **选择** - 单选/多选、全选、跨页选择
- ✅ **列显示/隐藏** - 用户自定义列可见性
- ✅ **导出** - 导出当前页/全部数据为 CSV/Excel

#### 高级功能
- ✅ **虚拟滚动** - 大数据集性能优化
- ✅ **行展开** - 嵌套详情行
- ✅ **行操作** - 自定义操作按钮
- ✅ **批量操作** - 批量删除、批量导出
- ✅ **记忆功能** - 记住用户的列配置

### 3.2 文件结构

```
components/data-table/
├── data-table.tsx                    # 主组件
├── data-table-toolbar.tsx            # 工具栏
├── data-table-pagination.tsx         # 分页
├── data-table-faceted-filter.tsx     # 多选筛选
├── data-table-column-header.tsx      # 列头（含排序）
└── data-table-view-options.tsx       # 列显示选项
```

### 3.3 主组件实现

```typescript
// components/data-table/data-table.tsx
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import { DataTableToolbar } from './data-table-toolbar'
import { DataTablePagination } from './data-table-pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  total?: number
  pageSize?: number
  enablePagination?: boolean
  enableSorting?: boolean
  enableFiltering?: boolean
  enableRowSelection?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  total,
  pageSize = 10,
  enablePagination = true,
  enableSorting = true,
  enableFiltering = true,
  enableRowSelection = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      pagination,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
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
                      : <DataTableColumnHeader header={header} />
                    }
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
      {enablePagination && <DataTablePagination table={table} total={total} />}
    </div>
  )
}
```

### 3.4 列头组件

```typescript
// components/data-table/data-table-column-header.tsx
import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff } from 'lucide-react'
import { Column } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            升序
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            降序
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            隐藏
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

### 3.5 工具栏组件

```typescript
// components/data-table/data-table-toolbar.tsx
import { Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from './data-table-faceted-filter'
import { DataTableViewOptions } from './data-table-view-options'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="搜索..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="h-9 w-[150px] lg:w-[250px]"
        />
        {table.getColumn('status') && (
          <DataTableFacetedFilter
            column={table.getColumn('status')}
            title="状态"
            options={[
              { label: '活跃', value: 'active' },
              { label: '禁用', value: 'inactive' },
            ]}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            重置
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
```

### 3.6 分页组件

```typescript
// components/data-table/data-table-pagination.tsx
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  total?: number
}

export function DataTablePagination<TData>({
  table,
  total,
}: DataTablePaginationProps<TData>) {
  const pageSizeOptions = [10, 20, 30, 50, 100]

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        共 {total ?? table.getFilteredRowModel().rows.length} 条记录
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">每页行数</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          第 {table.getState().pagination.pageIndex + 1} /{' '}
          {table.getPageCount()} 页
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {'>'}
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {'>>'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 3.7 客户列表使用示例

```typescript
// features/customer/components/customer-list.tsx
import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'
import { z } from 'zod'

const customerSearchSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
  keyword: z.string().optional(),
  customerLevel: z.array(z.string()).optional(),
  sortField: z.enum(['name', 'createdAt', 'customerLevel']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const Route = createFileRoute('/_authenticated/customers')({
  validateSearch: (search) => customerSearchSchema.parse(search),
  component: CustomerListPage,
})

const columns: ColumnDef<Customer>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="全选"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="选择行"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          公司名称
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'customerLevel',
    header: '客户等级',
    cell: ({ row }) => {
      const level = row.getValue('customerLevel')
      return <div>{level === 'VIP' ? 'VIP' : '普通'}</div>
    },
  },
  {
    accessorKey: 'contact',
    header: '联系人',
  },
  {
    accessorKey: 'phone',
    header: '联系电话',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const customer = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">打开菜单</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(customer.id)}
            >
              复制 ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>查看详情</DropdownMenuItem>
            <DropdownMenuItem>编辑</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function CustomerListPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // 使用 Query 获取数据
  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => getScrmApi().customerControllerFindAll({
      page: search.page - 1,
      pageSize: search.pageSize,
      keyword: search.keyword,
      customerLevel: search.customerLevel,
    }),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <Button onClick={() => navigate({ to: '/customers/new' })}>
          新增客户
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total}
        pageSize={search.pageSize}
      />
    </div>
  )
}
```

---

## 4. Sidebar 导航 (优先级 2)

### 4.1 导航分组

#### 导航结构

```typescript
// components/layout/data/sidebar-data.ts
import type { NavItem } from './types'

export const sidebarData: NavItem[] = [
  {
    title: '业务管理',
    items: [
      {
        title: '首页',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: '客户管理',
        url: '/customers',
        icon: Building2,
      },
      {
        title: '联系人',
        url: '/contacts',
        icon: Book,
      },
      {
        title: '跟进记录',
        url: '/follow-records',
        icon: MessageSquare,
      },
    ],
  },
  {
    title: '商务管理',
    items: [
      {
        title: '合同管理',
        url: '/contracts',
        icon: FileText,
      },
      {
        title: '发票管理',
        url: '/invoices',
        icon: Receipt,
      },
      {
        title: '产品管理',
        url: '/products',
        icon: Package,
      },
    ],
  },
  {
    title: '数据分析',
    items: [
      {
        title: '统计分析',
        url: '/statistics',
        icon: BarChart3,
      },
    ],
  },
  {
    title: '系统设置',
    items: [
      {
        title: '系统管理',
        url: '/system',
        icon: Settings,
      },
    ],
  },
]
```

### 4.2 折叠状态

#### 三种状态
1. **展开模式** (`width: 260px`) - 显示完整菜单
2. **折叠模式** (`width: 70px`) - 仅显示图标
3. **移动模式** (`width: 0`) - 完全隐藏，抽屉式

```typescript
// components/layout/app-sidebar.tsx
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Link, useRouter } from '@tanstack/react-router'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useMobile } from '@/hooks/use-mobile'
import { sidebarData } from './data/sidebar-data'

export function AppSidebar() {
  const router = useRouter()
  const isMobile = useMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const currentPath = router.state.location.pathname

  const SidebarContent = () => (
    <div className="flex h-full w-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="text-lg font-bold">企账通</span>
          )}
        </div>
      </div>

      {/* 菜单 */}
      <ScrollArea className="flex-1 px-3 py-4">
        {sidebarData.map((group) => (
          <div key={group.title} className="mb-6">
            {!collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                {group.title}
              </h3>
            )}
            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = currentPath === item.url

                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    className={cn(
                      'flex items-center rounded-lg px-3 py-2 transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    onClick={() => isMobile && setIsOpen(false)}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="ml-3">{item.title}</span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </ScrollArea>

      {/* 折叠按钮 */}
      {!isMobile && (
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ArrowLeft className="h-5 w-5" />
            {!collapsed && (
              <span className="ml-3">{collapsed ? '展开' : '折叠'}</span>
            )}
          </Button>
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent />
    </aside>
  )
}
```

### 4.3 活跃项高亮

```typescript
// 自动高亮当前路由
const isActive = currentPath === item.url ||
                 currentPath.startsWith(item.url + '/')

className={cn(
  'flex items-center rounded-lg px-3 py-2 transition-colors',
  isActive
    ? 'bg-primary text-primary-foreground'
    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
)}
```

### 4.4 键盘快捷键

```typescript
// 快捷键配置
const keyboardShortcuts = {
  'Cmd+K': '打开全局搜索',
  'Cmd+B': '切换侧边栏',
  'Cmd+Shift+D': '跳转到首页',
  'Cmd+Shift+C': '跳转到客户列表',
  'Cmd+Shift+I': '跳转到发票列表',
}

// 实现
import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K - 全局搜索
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandMenuOpen(true)
      }

      // Cmd+B - 切换侧边栏
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setCollapsed((prev) => !prev)
      }

      // Cmd+Shift+D - 首页
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
        e.preventDefault()
        router.navigate({ to: '/dashboard' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])
}
```

---

## 5. Form 表单组件 (优先级 3)

### 5.1 React Hook Form + Zod 集成

#### 基础设置

```typescript
// features/customer/schemas/customer-schema.ts
import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(1, '公司名称不能为空'),
  customerLevel: z.enum(['VIP', '普通'], {
    required_error: '请选择客户等级',
  }),
  industry: z.string().optional(),
  contact: z.string().min(1, '联系人不能为空'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
})

export type CustomerFormData = z.infer<typeof customerSchema>
```

### 5.2 表单组件封装

```typescript
// components/form/form-field.tsx
import { useFormContext } from 'react-hook-form'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

export const FormFieldWrapper = ({
  name,
  label,
  description,
  children,
  ...props
}) => {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>{children({ field })}</FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
      {...props}
    />
  )
}
```

### 5.3 Sheet Drawer 模式

#### 实现 (基于 shadcn-admin tasks-mutate-drawer)

```typescript
// features/customer/components/customer-drawer.tsx
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { customerSchema, type CustomerFormData } from '../schemas/customer-schema'
import { getScrmApi } from '@/services/api'

interface CustomerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId?: string
}

export function CustomerDrawer({
  open,
  onOpenChange,
  customerId,
}: CustomerDrawerProps) {
  const router = useRouter()

  // 表单设置
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      customerLevel: '普通',
      contact: '',
      phone: '',
      email: '',
      industry: '',
      address: '',
    },
  })

  // 加载编辑数据
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getScrmApi().customerControllerFindOne({ id: customerId! }),
    enabled: !!customerId && open,
    onSuccess: (data) => {
      // 回填表单
      form.reset(data)
    },
  })

  // 创建/更新 mutation
  const mutation = useMutation({
    mutationFn: (data: CustomerFormData) => {
      if (customerId) {
        return getScrmApi().customerControllerUpdate({
          id: customerId,
          requestBody: data,
        })
      }
      return getScrmApi().customerControllerCreate({ requestBody: data })
    },
    onSuccess: () => {
      // 刷新列表
      router.invalidate()
      // 关闭抽屉
      onOpenChange(false)
      // 重置表单
      form.reset()
    },
  })

  const onSubmit = (data: CustomerFormData) => {
    mutation.mutate(data)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {customerId ? '编辑客户' : '新增客户'}
          </SheetTitle>
          <SheetDescription>
            填写客户信息，带 * 号为必填项
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="flex-1 overflow-auto py-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormFieldWrapper
                control={form.control}
                name="name"
                label="公司名称 *"
              >
                {({ field }) => (
                  <Input placeholder="请输入公司名称" {...field} />
                )}
              </FormFieldWrapper>

              <FormFieldWrapper
                control={form.control}
                name="customerLevel"
                label="客户等级 *"
              >
                {({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择客户等级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="普通">普通</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormFieldWrapper>

              <FormFieldWrapper
                control={form.control}
                name="contact"
                label="联系人 *"
              >
                {({ field }) => (
                  <Input placeholder="请输入联系人姓名" {...field} />
                )}
              </FormFieldWrapper>

              <FormFieldWrapper
                control={form.control}
                name="phone"
                label="联系电话 *"
              >
                {({ field }) => (
                  <Input placeholder="请输入手机号" {...field} />
                )}
              </FormFieldWrapper>

              <FormFieldWrapper
                control={form.control}
                name="email"
                label="邮箱"
              >
                {({ field }) => (
                  <Input placeholder="请输入邮箱" {...field} />
                )}
              </FormFieldWrapper>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? '保存中...' : '保存'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

### 5.4 通用表单模式

#### 1. 简单输入表单

```typescript
<FormFieldWrapper name="name" label="名称">
  {({ field }) => <Input {...field} />}
</FormFieldWrapper>
```

#### 2. 选择表单

```typescript
<FormFieldWrapper name="status" label="状态">
  {({ field }) => (
    <Select onValueChange={field.onChange} defaultValue={field.value}>
      <SelectTrigger>
        <SelectValue placeholder="选择状态" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">活跃</SelectItem>
        <SelectItem value="inactive">禁用</SelectItem>
      </SelectContent>
    </Select>
  )}
</FormFieldWrapper>
```

#### 3. 日期选择表单

```typescript
<FormFieldWrapper name="createdAt" label="创建日期">
  {({ field }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {field.value ? format(field.value, 'yyyy-MM-dd') : '选择日期'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={field.value}
          onSelect={field.onChange}
        />
      </PopoverContent>
    </Popover>
  )}
</FormFieldWrapper>
```

#### 4. 多选表单

```typescript
<FormFieldWrapper name="tags" label="标签">
  {({ field }) => (
    <MultiSelect
      options={tagOptions}
      selected={field.value}
      onChange={field.onChange}
    />
  )}
</FormFieldWrapper>
```

### 5.5 表单布局最佳实践

#### 两列表单

```typescript
<div className="grid grid-cols-2 gap-4">
  <FormFieldWrapper name="firstName" label="名">
    {({ field }) => <Input {...field} />}
  </FormFieldWrapper>

  <FormFieldWrapper name="lastName" label="姓">
    {({ field }) => <Input {...field} />}
  </FormFieldWrapper>
</div>
```

#### 响应式表单

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <FormFieldWrapper name="field1" label="字段1">
    {({ field }) => <Input {...field} />}
  </FormFieldWrapper>

  <FormFieldWrapper name="field2" label="字段2">
    {({ field }) => <Input {...field} />}
  </FormFieldWrapper>

  <FormFieldWrapper name="field3" label="字段3">
    {({ field }) => <Input {...field} />}
  </FormFieldWrapper>
</div>
```

#### 分组表单

```typescript
<Accordion type="multiple">
  <AccordionItem value="basic">
    <AccordionTrigger>基本信息</AccordionTrigger>
    <AccordionContent>
      <div className="space-y-4">
        <FormFieldWrapper name="name" label="名称">
          {({ field }) => <Input {...field} />}
        </FormFieldWrapper>
      </div>
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="advanced">
    <AccordionTrigger>高级信息</AccordionTrigger>
    <AccordionContent>
      <div className="space-y-4">
        <FormFieldWrapper name="metadata" label="元数据">
          {({ field }) => <Textarea {...field} />}
        </FormFieldWrapper>
      </div>
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

## 6. Dashboard 仪表盘 (优先级 4)

### 6.1 Tab 布局

```typescript
// features/dashboard/components/dashboard-tabs.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OverviewTab } from './overview-tab'
import { QuickActionsTab } from './quick-actions-tab'
import { RecentTab } from './recent-tab'

export function DashboardTabs() {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">概览</TabsTrigger>
        <TabsTrigger value="quick-actions">快捷操作</TabsTrigger>
        <TabsTrigger value="recent">最近活动</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab />
      </TabsContent>

      <TabsContent value="quick-actions">
        <QuickActionsTab />
      </TabsContent>

      <TabsContent value="recent">
        <RecentTab />
      </TabsContent>
    </Tabs>
  )
}
```

### 6.2 统计卡片

```typescript
// features/dashboard/components/stat-cards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, FileText, Receipt, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    isPositive: boolean
  }
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className={cn(
            'text-xs',
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}% 与上月相比
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="客户总数"
        value={128}
        description="活跃客户 96"
        icon={Building2}
        trend={{ value: 12, isPositive: true }}
      />
      <StatCard
        title="合同总数"
        value={45}
        description="本月新增 5"
        icon={FileText}
        trend={{ value: 8, isPositive: true }}
      />
      <StatCard
        title="本月开票"
        value="¥128,500"
        description="12 张发票"
        icon={Receipt}
        trend={{ value: 15, isPositive: false }}
      />
      <StatCard
        title="产品数"
        value={24}
        description="在售产品 18"
        icon={Package}
        trend={{ value: 3, isPositive: true }}
      />
    </div>
  )
}
```

### 6.3 图表组件 (Recharts)

```typescript
// features/dashboard/components/customer-growth-chart.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const data = [
  { month: '1月', customers: 65, newCustomers: 20 },
  { month: '2月', customers: 78, newCustomers: 13 },
  { month: '3月', customers: 90, newCustomers: 12 },
  { month: '4月', customers: 105, newCustomers: 15 },
  { month: '5月', customers: 118, newCustomers: 13 },
  { month: '6月', customers: 128, newCustomers: 10 },
]

export function CustomerGrowthChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>客户增长趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="customers"
              stroke="#8884d8"
              name="客户总数"
            />
            <Line
              type="monotone"
              dataKey="newCustomers"
              stroke="#82ca9d"
              name="新增客户"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

### 6.4 快捷操作卡片

```typescript
// features/dashboard/components/quick-action-cards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Book, FileText, Receipt, Plus } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'

const quickActions = [
  {
    title: '新增客户',
    description: '添加新的客户信息',
    icon: Building2,
    action: '/customers/new',
    color: 'bg-blue-500',
  },
  {
    title: '新增联系人',
    description: '添加新的联系人',
    icon: Book,
    action: '/contacts/new',
    color: 'bg-green-500',
  },
  {
    title: '创建合同',
    description: '创建新的合同',
    icon: FileText,
    action: '/contracts/new',
    color: 'bg-purple-500',
  },
  {
    title: '开具发票',
    description: '创建新的发票',
    icon: Receipt,
    action: '/invoices/new',
    color: 'bg-orange-500',
  },
]

export function QuickActionCards() {
  const router = useRouter()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {quickActions.map((action) => {
        const Icon = action.icon
        return (
          <Card
            key={action.title}
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => router.navigate({ to: action.action })}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {action.title}
              </CardTitle>
              <div className={`${action.color} p-2 rounded-lg`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {action.description}
              </p>
              <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
                <Plus className="mr-1 h-3 w-3" />
                立即操作
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

---

## 7. Command Menu 全局搜索 (优先级 5)

### 7.1 功能特性

- ✅ **Cmd+K 快捷键** - 全局打开
- ✅ **页面导航** - 搜索并跳转到页面
- ✅ **快捷操作** - 执行常用操作
- ✅ **数据搜索** - 搜索客户、联系人等
- ✅ **模糊匹配** - 支持拼音和缩写

### 7.2 实现

```typescript
// components/command-menu/command-menu.tsx
import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Building2, Book, FileText, Receipt, Search } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  keywords?: string[]
}

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // 页面导航项
  const pageItems: CommandItem[] = [
    {
      id: 'dashboard',
      label: '首页',
      icon: Search,
      action: () => router.navigate({ to: '/dashboard' }),
      keywords: ['home', '首页', '仪表盘'],
    },
    {
      id: 'customers',
      label: '客户管理',
      icon: Building2,
      action: () => router.navigate({ to: '/customers' }),
      keywords: ['customer', '客户', '公司'],
    },
    {
      id: 'contacts',
      label: '联系人',
      icon: Book,
      action: () => router.navigate({ to: '/contacts' }),
      keywords: ['contact', '联系人'],
    },
    {
      id: 'contracts',
      label: '合同管理',
      icon: FileText,
      action: () => router.navigate({ to: '/contracts' }),
      keywords: ['contract', '合同'],
    },
    {
      id: 'invoices',
      label: '发票管理',
      icon: Receipt,
      action: () => router.navigate({ to: '/invoices' }),
      keywords: ['invoice', '发票', '开票'],
    },
  ]

  // 快捷操作项
  const actionItems: CommandItem[] = [
    {
      id: 'new-customer',
      label: '新增客户',
      icon: Building2,
      action: () => router.navigate({ to: '/customers/new' }),
      keywords: ['add', 'new', 'create', '新增', '创建'],
    },
    {
      id: 'new-contact',
      label: '新增联系人',
      icon: Book,
      action: () => router.navigate({ to: '/contacts/new' }),
      keywords: ['add', 'new', 'create', '新增', '创建'],
    },
  ]

  // Cmd+K 快捷键
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="搜索页面、操作或数据..." />
      <CommandList>
        <CommandEmpty>没有找到结果</CommandEmpty>

        <CommandGroup heading="页面">
          {pageItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  item.action()
                  setOpen(false)
                }}
                keywords={item.keywords}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandGroup heading="快捷操作">
          {actionItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  item.action()
                  setOpen(false)
                }}
                keywords={item.keywords}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandGroup heading="数据搜索">
          <CommandItem
            onSelect={() => {
              // 实现客户搜索
              setOpen(false)
            }}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>搜索客户...</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
```

### 7.3 触发器组件

```typescript
// components/command-menu/command-menu-trigger.tsx
import { Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCommandMenu } from './use-command-menu'

export function CommandMenuTrigger({ children }: { children: React.ReactNode }) {
  const { setOpen } = useCommandMenu()

  return (
    <div onClick={() => setOpen(true)} className="cursor-pointer">
      {children}
    </div>
  )
}
```

---

## 8. Sheet Drawer 设计

### 8.1 实现模式 (来自 shadcn-admin tasks-mutate-drawer)

#### 核心特性
- ✅ **滚动优化** - 固定头部和底部，内容区滚动
- ✅ **表单验证** - React Hook Form + Zod
- ✅ **数据加载** - 编辑模式自动加载数据
- ✅ **响应式** - 移动端全屏，桌面端侧边抽屉

### 8.2 完整实现

```typescript
// components/sheet-drawer/sheet-drawer.tsx
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader } from '@/components/ui/loader'
import { useRouter } from '@tanstack/react-router'

interface SheetDrawerProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  entityId?: string
  schema: z.ZodSchema<T>
  queryKey: string[]
  queryFn: () => Promise<T>
  mutationFn: (data: T) => Promise<void>
  defaultValues: T
  renderForm: () => React.ReactNode
}

export function SheetDrawer<T>({
  open,
  onOpenChange,
  title,
  description,
  entityId,
  schema,
  queryKey,
  queryFn,
  mutationFn,
  defaultValues,
  renderForm,
}: SheetDrawerProps<T>) {
  const router = useRouter()

  // 表单设置
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  })

  // 加载编辑数据
  const { data: entity, isLoading } = useQuery({
    queryKey: [...queryKey, entityId],
    queryFn,
    enabled: !!entityId && open,
    onSuccess: (data) => {
      methods.reset(data)
    },
  })

  // 创建/更新 mutation
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      router.invalidate()
      onOpenChange(false)
      methods.reset()
    },
  })

  const onSubmit = (data: T) => {
    mutation.mutate(data)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6">
              <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  {renderForm()}
                </form>
              </FormProvider>
            </ScrollArea>

            <div className="border-t p-6">
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={mutation.isPending}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  onClick={methods.handleSubmit(onSubmit)}
                >
                  {mutation.isPending ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

### 8.3 使用示例

```typescript
// features/customer/components/customer-drawer.tsx
import { SheetDrawer } from '@/components/sheet-drawer/sheet-drawer'
import { customerSchema } from '../schemas/customer-schema'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { getScrmApi } from '@/services/api'

export function CustomerDrawer({
  open,
  onOpenChange,
  customerId,
}: CustomerDrawerProps) {
  return (
    <SheetDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={customerId ? '编辑客户' : '新增客户'}
      description="填写客户信息，带 * 号为必填项"
      entityId={customerId}
      schema={customerSchema}
      queryKey={['customer']}
      queryFn={() => getScrmApi().customerControllerFindOne({ id: customerId! })}
      mutationFn={(data) =>
        customerId
          ? getScrmApi().customerControllerUpdate({ id: customerId, requestBody: data })
          : getScrmApi().customerControllerCreate({ requestBody: data })
      }
      defaultValues={{
        name: '',
        customerLevel: '普通',
        contact: '',
        phone: '',
        email: '',
        industry: '',
        address: '',
      }}
      renderForm={() => (
        <>
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>公司名称 *</FormLabel>
                <FormControl>
                  <Input placeholder="请输入公司名称" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="customerLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>客户等级 *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择客户等级" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="普通">普通</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 更多表单字段... */}
        </>
      )}
    />
  )
}
```

---

## 9. i18n 多语言支持

### 9.1 配置

```typescript
// lib/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhCN from '../locales/zh-CN.json'
import zhTW from '../locales/zh-TW.json'
import enUS from '../locales/en-US.json'

const resources = {
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  'en-US': { translation: enUS },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    lng: localStorage.getItem('language') || 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
```

### 9.2 翻译文件结构

```json
// locales/zh-CN.json
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "create": "新增",
    "search": "搜索",
    "confirm": "确认",
    "loading": "加载中...",
    "noData": "暂无数据",
    "operation": "操作",
    "status": "状态",
    "actions": "操作"
  },
  "nav": {
    "dashboard": "首页",
    "customer": "客户管理",
    "contact": "联系人",
    "contract": "合同管理",
    "invoice": "发票管理",
    "product": "产品管理",
    "followRecord": "跟进记录",
    "statistics": "统计分析",
    "system": "系统管理"
  },
  "customer": {
    "title": "客户管理",
    "list": "客户列表",
    "detail": "客户详情",
    "create": "新增客户",
    "edit": "编辑客户",
    "delete": "删除客户",
    "deleteConfirm": "确定要删除该客户吗？",
    "name": "公司名称",
    "customerLevel": "客户等级",
    "contact": "联系人",
    "phone": "联系电话",
    "email": "邮箱",
    "industry": "行业",
    "address": "地址",
    "taxNumber": "税号",
    "bankName": "开户行",
    "bankAccount": "银行账号",
    "level": {
      "VIP": "VIP",
      "NORMAL": "普通"
    }
  },
  "validation": {
    "required": "该字段不能为空",
    "invalidEmail": "邮箱格式不正确",
    "invalidPhone": "手机号格式不正确",
    "minLength": "长度不能少于 {{min}} 个字符",
    "maxLength": "长度不能超过 {{max}} 个字符"
  }
}
```

```json
// locales/en-US.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "confirm": "Confirm",
    "loading": "Loading...",
    "noData": "No Data",
    "operation": "Operation",
    "status": "Status",
    "actions": "Actions"
  },
  "nav": {
    "dashboard": "Dashboard",
    "customer": "Customers",
    "contact": "Contacts",
    "contract": "Contracts",
    "invoice": "Invoices",
    "product": "Products",
    "followRecord": "Follow Records",
    "statistics": "Statistics",
    "system": "System"
  },
  "customer": {
    "title": "Customer Management",
    "list": "Customer List",
    "detail": "Customer Detail",
    "create": "Create Customer",
    "edit": "Edit Customer",
    "delete": "Delete Customer",
    "deleteConfirm": "Are you sure to delete this customer?",
    "name": "Company Name",
    "customerLevel": "Customer Level",
    "contact": "Contact",
    "phone": "Phone",
    "email": "Email",
    "industry": "Industry",
    "address": "Address",
    "taxNumber": "Tax Number",
    "bankName": "Bank Name",
    "bankAccount": "Bank Account",
    "level": {
      "VIP": "VIP",
      "NORMAL": "Normal"
    }
  },
  "validation": {
    "required": "This field is required",
    "invalidEmail": "Invalid email format",
    "invalidPhone": "Invalid phone format",
    "minLength": "Length must be at least {{min}} characters",
    "maxLength": "Length must not exceed {{max}} characters"
  }
}
```

### 9.3 语言切换组件

```typescript
// components/language-switch.tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Languages } from 'lucide-react'

const languages = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'en-US', name: 'English' },
]

export function LanguageSwitch() {
  const { i18n } = useTranslation()

  const currentLanguage = languages.find((lang) => lang.code === i18n.language)

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('language', code)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={lang.code === i18n.language ? 'bg-accent' : ''}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### 9.4 使用示例

```typescript
// 在组件中使用
import { useTranslation } from 'react-i18next'

function CustomerList() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('customer.title')}</h1>
      <Button>{t('customer.create')}</Button>
      <DataTable
        columns={[
          {
            header: t('customer.name'),
            accessorKey: 'name',
          },
          {
            header: t('customer.contact'),
            accessorKey: 'contact',
          },
        ]}
      />
    </div>
  )
}

// 在 Zod 验证中使用
const customerSchema = z.object({
  name: z.string().min(1, ({ t }) => t('validation.required')),
  email: z.string().email(t('validation.invalidEmail')),
  phone: z.string().regex(/^1[3-9]\d{9}$/, t('validation.invalidPhone')),
})
```

---

## 10. 实施计划

### 10.1 5 阶段实施

#### Phase 1: 基础设施 (2-3 天)

**目标**: 搭建核心框架和基础组件

**任务**:
- [ ] 安装依赖
  ```bash
  pnpm add @tanstack/react-router @tanstack/react-table
  pnpm add react-hook-form @hookform/resolvers zod
  pnpm add cmdk react-top-loading-bar
  pnpm add react-i18next i18next i18next-browser-languagedetector
  pnpm add sonner
  ```
- [ ] 配置 Vite (TanStack Router 插件)
- [ ] 配置 i18n
- [ ] 创建基础目录结构
- [ ] 配置 Tailwind CSS 主题
- [ ] 实现 `routes/__root.tsx` 根布局
- [ ] 实现 `routes/_authenticated/__root.tsx` 认证布局

**验收标准**:
- ✅ 应用可以正常启动
- ✅ 路由系统正常工作
- ✅ i18n 可以切换语言

#### Phase 2: 布局和导航 (2-3 天)

**目标**: 实现核心布局组件

**任务**:
- [ ] 实现 `AppSidebar` 组件
  - [ ] 导航菜单
  - [ ] 折叠状态
  - [ ] 响应式布局
- [ ] 实现 `Header` 组件
  - [ ] 搜索触发器
  - [ ] 主题切换
  - [ ] 语言切换
  - [ ] 用户菜单
- [ ] 实现 `Main` 组件
- [ ] 实现 `CommandMenu` 组件
- [ ] 实现键盘快捷键
- [ ] 迁移登录页面到 TanStack Router

**验收标准**:
- ✅ 侧边栏可以折叠/展开
- ✅ 移动端侧边栏正常工作
- ✅ Cmd+K 可以打开全局搜索
- ✅ 主题可以切换

#### Phase 3: DataTable 组件 (3-4 天)

**目标**: 实现高级数据表格组件

**任务**:
- [ ] 实现 `DataTable` 主组件
- [ ] 实现 `DataTableColumnHeader` (排序)
- [ ] 实现 `DataTableToolbar` (搜索和筛选)
- [ ] 实现 `DataTablePagination` (分页)
- [ ] 实现 `DataTableFacetedFilter` (多选筛选)
- [ ] 实现 `DataTableViewOptions` (列显示/隐藏)
- [ ] 迁移客户列表页面
  - [ ] 实现 URL 状态同步
  - [ ] 实现 Sheet Drawer 编辑
  - [ ] 实现批量操作

**验收标准**:
- ✅ 客户列表可以正常显示
- ✅ 排序、筛选、分页正常工作
- ✅ URL 状态同步正常
- ✅ Sheet Drawer 可以新增/编辑客户

#### Phase 4: 表单和页面迁移 (5-7 天)

**目标**: 迁移所有页面和表单

**任务**:

**Day 1: Dashboard**
- [ ] 实现 `StatCards` 组件
- [ ] 实现 `CustomerGrowthChart` 图表
- [ ] 实现 `QuickActionCards` 组件
- [ ] 实现 `DashboardTabs` 组件

**Day 2: Contact 模块**
- [ ] 迁移联系人列表
- [ ] 实现 Sheet Drawer
- [ ] 实现表单验证

**Day 3: Contract 和 Invoice**
- [ ] 迁移合同列表
- [ ] 迁移发票列表
- [ ] 实现相关表单

**Day 4: Product 和 FollowRecord**
- [ ] 迁移产品列表
- [ ] 迁移跟进记录

**Day 5: Statistics 和 System**
- [ ] 迁移统计分析页面
- [ ] 迁移系统管理页面
- [ ] 实现图表组件

**Day 6-7: 测试和优化**
- [ ] 全面回归测试
- [ ] 性能优化
- [ ] Bug 修复

**验收标准**:
- ✅ 所有页面迁移完成
- ✅ 所有表单使用 React Hook Form + Zod
- ✅ 所有列表使用 DataTable 组件
- ✅ 没有明显的 Bug

#### Phase 5: 测试和优化 (2-3 天)

**目标**: 全面测试和优化

**任务**:
- [ ] 单元测试
  - [ ] 关键组件测试
  - [ ] Hooks 测试
  - [ ] 工具函数测试
- [ ] E2E 测试
  - [ ] 登录流程
  - [ ] CRUD 操作
  - [ ] 导航和路由
- [ ] 性能优化
  - [ ] 代码分割优化
  - [ ] 数据预加载
  - [ ] 路由预加载
- [ ] 错误处理完善
- [ ] 文档编写

**验收标准**:
- ✅ 测试覆盖率 > 70%
- ✅ 首屏加载时间 < 2s
- ✅ 没有严重 Bug
- ✅ 文档完善

### 10.2 风险缓解策略

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **学习曲线** | 中 | - 预留学习时间<br>- 参考官方文档<br>- 代码审查 |
| **功能回归** | 高 | - 完善的测试覆盖<br>- 分模块验证<br>- Git 分支保护 |
| **性能问题** | 中 | - 使用 Loader 预加载<br>- 代码分割<br>- 性能监控 |
| **时间延期** | 中 | - 预留缓冲时间<br>- 分阶段交付<br>- 优先级管理 |

### 10.3 测试清单

#### 功能测试
- [ ] 登录/登出
- [ ] 页面导航
- [ ] 侧边栏折叠/展开
- [ ] 主题切换
- [ ] 语言切换
- [ ] 全局搜索 (Cmd+K)
- [ ] 客户 CRUD
- [ ] 联系人 CRUD
- [ ] 合同 CRUD
- [ ] 发票 CRUD
- [ ] 产品 CRUD
- [ ] 跟进记录 CRUD
- [ ] 统计图表
- [ ] 数据导出

#### 兼容性测试
- [ ] Chrome (最新版)
- [ ] Firefox (最新版)
- [ ] Safari (最新版)
- [ ] Edge (最新版)
- [ ] 移动端 (iOS Safari)
- [ ] 移动端 (Android Chrome)

#### 性能测试
- [ ] 首屏加载时间
- [ ] 路由切换时间
- [ ] 表格渲染性能 (1000+ 行)
- [ ] 表单提交性能
- [ ] 内存泄漏检测

### 10.4 回滚策略

#### Git 分支策略
```
main (生产环境)
├── develop (开发环境)
    ├── feature/router-migration
    ├── feature/data-table
    ├── feature/forms
    └── feature/dashboard
```

#### 回滚步骤
1. **代码回滚**
   ```bash
   git checkout main
   git merge --abort
   ```

2. **数据库回滚** (如有)
   - 恢复数据库备份
   - 执行回滚脚本

3. **依赖回滚**
   ```bash
   git checkout HEAD~1 package.json pnpm-lock.yaml
   pnpm install
   ```

4. **验证回滚**
   - 启动应用
   - 执行冒烟测试
   - 确认功能正常

### 10.5 时间线

```
Week 1 (Phase 1-2): 基础设施 + 布局
Week 2 (Phase 3): DataTable 组件
Week 3 (Phase 4): 表单和页面迁移
Week 4 (Phase 5): 测试和优化

总计: 4 周 (19 个工作日)
```

---

## 附录

### A. 参考资源

- [TanStack Router 文档](https://tanstack.com/router/latest)
- [TanStack Table 文档](https://tanstack.com/table/latest)
- [React Hook Form 文档](https://react-hook-form.com/)
- [Zod 文档](https://zod.dev/)
- [shadcn-admin 项目](https://github.com/satnaing/shadcn-admin)
- [shadcn/ui 组件库](https://ui.shadcn.com/)

### B. 关键决策记录

| 决策 | 日期 | 理由 |
|------|------|------|
| 选择 TanStack Router | 2026-02-03 | 文件路由、类型安全 |
| 选择 React Hook Form | 2026-02-03 | 性能、类型安全 |
| 选择 Zod | 2026-02-03 | TypeScript 优先 |
| 完全重构策略 | 2026-02-03 | 避免技术债务 |

### C. 术语表

| 术语 | 定义 |
|------|------|
| 文件路由 | 基于文件系统的路由配置 |
| URL 状态同步 | 将 UI 状态同步到 URL 参数 |
| Sheet Drawer | 侧边抽屉式表单 |
| Faceted Filter | 多选筛选器 |
| Command Menu | 命令面板全局搜索 |

---

**文档版本**: v2.0
**创建日期**: 2026-02-03
**最后更新**: 2026-02-03
**作者**: AI Assistant
**状态**: ✅ 设计确认
