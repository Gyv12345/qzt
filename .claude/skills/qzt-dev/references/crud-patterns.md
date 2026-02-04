# QZT CRUD 功能实现模式

客户管理模块提供了完整的 CRUD 功能实现参考。

## 文件结构

```
frontend/src/features/customers/
├── index.tsx                          # 主页面组件
├── types/
│   └── customer.ts                    # 类型定义（Zod schema）
├── hooks/
│   └── use-customers.ts               # API hooks (TanStack Query)
└── components/
    ├── customers-table.tsx            # 数据表格
    ├── customers-columns.tsx          # 表格列定义
    ├── customers-primary-buttons.tsx  # 主按钮（新建等）
    ├── customers-dialogs.tsx          # 对话框容器（Context API）
    ├── customer-form-dialog.tsx       # 表单对话框
    └── data-table-row-actions.tsx     # 行操作菜单
```

## 对话框状态管理（Context API 模式）

使用 Context API 管理对话框状态，避免 props 层层传递：

```typescript
// customers-dialogs.tsx
import { useState, createContext, useContext } from 'react'

interface CustomersDialogsContextValue {
  openCreateDialog: () => void
  openEditDialog: (customer: Customer) => void
}

const CustomersDialogsContext = createContext<CustomersDialogsContextValue | null>(null)

export function CustomersDialogs({ children, onRefresh }: CustomersDialogsProps) {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const openCreateDialog = () => setIsCreateDialogOpen(true)
  const openEditDialog = (customer: Customer) => setEditingCustomer(customer)

  return (
    <CustomersDialogsContext.Provider value={{ openCreateDialog, openEditDialog }}>
      {children}
      {/* 对话框组件 */}
    </CustomersDialogsContext.Provider>
  )
}

export function useCustomersDialogs() {
  const context = useContext(CustomersDialogsContext)
  if (!context) {
    throw new Error('useCustomersDialogs must be used within CustomersDialogs')
  }
  return context
}
```

**使用方式**:
```typescript
// 在任何子组件中触发对话框
import { useCustomersDialogs } from './components/customers-dialogs'

function CustomersContent() {
  const { openCreateDialog, openEditDialog } = useCustomersDialogs()

  return (
    <>
      <Button onClick={openCreateDialog}>新建客户</Button>
      <Table onEdit={openEditDialog} />
    </>
  )
}
```

## 表单验证（React Hook Form + Zod）

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 定义 Zod schema
const customerFormSchema = z.object({
  name: z.string().min(1, '公司名称不能为空'),
  customerLevel: z.coerce.number().min(0).max(3),
  industry: z.string().optional(),
  // ... 更多字段
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

// 使用 useForm
export function CustomerFormDialog({ customer, onSuccess }: Props) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customer ? { /* 编辑模式 */ } : { /* 新建模式 */ }
  })

  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()

  const onSubmit = async (values: CustomerFormValues) => {
    if (customer) {
      await updateMutation.mutateAsync({ id: customer.id, data: values })
    } else {
      await createMutation.mutateAsync(values)
    }
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>公司名称</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* ... 更多字段 */}
      </form>
    </Form>
  )
}
```

## 数据表格（TanStack Table）

### 关键要点

1. **使用 useMemo 优化列定义**
```typescript
const columns = useMemo(() => {
  return customersColumns.map((col) => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: (props: any) => (
          <DataTableRowActions
            row={props.row}
            onEdit={onEdit}
            onDelete={handleDelete}
          />
        )
      }
    }
    return col
  })
}, [onEdit, handleDelete])
```

2. **使用 useCallback 稳定回调函数**
```typescript
const handleDelete = useCallback(async (customer: Customer) => {
  if (window.confirm(`确定要删除客户"${customer.name}"吗？`)) {
    await deleteMutation.mutateAsync(customer.id)
    onRefresh()
  }
}, [deleteMutation, onRefresh])
```

3. **避免在 cell 渲染器中使用 require()**
```typescript
// ❌ 错误
cell: (props: any) => {
  const { DataTableRowActions } = require('./data-table-row-actions')  // 浏览器不支持
  return <DataTableRowActions {...props} />
}

// ✅ 正确 - 在文件顶部导入
import { DataTableRowActions } from './data-table-row-actions'

cell: (props: any) => (
  <DataTableRowActions {...props} />
)
```

## API Hooks 模式

```typescript
// hooks/use-customers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'

// 查询
export function useCustomers(params?: QueryParams) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      return await getScrmApi().customerControllerFindAll(params)
    },
  })
}

// 创建
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCustomerDto) => {
      return await getScrmApi().customerControllerCreate(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('客户创建成功')
    },
    onError: (error: any) => {
      toast.error(error.message || '创建失败')
    },
  })
}

// 更新、删除类似...
```

**重要**: 直接返回 API 调用结果，不要访问 `.data`：
```typescript
// ✅ 正确
queryFn: async () => {
  return await getScrmApi().customerControllerFindAll(params)
}

// ❌ 错误
queryFn: async () => {
  const response = await getScrmApi().customerControllerFindAll(params)
  return response.data  // undefined!
}
```

## 路由集成

```typescript
// routes/_authenticated/customers/route.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Customers } from '@/features/customers'

export const Route = createFileRoute('/_authenticated/customers')({
  component: Customers,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page ?? 1),
    pageSize: Number(search.pageSize ?? 10),
    name: String(search.name ?? ''),
    customerLevel: search.customerLevel
      ? String(search.customerLevel).split(',')
      : [],
  }),
})
```

**关键点**:
- 路由路径不要带末尾斜杠: `/_authenticated/customers` 而非 `/_authenticated/customers/`
- 使用 `validateSearch` 验证 URL 搜索参数
- 使用 `useTableUrlState` hook 同步 URL 和表格状态

## 组件通信模式

### 主组件 → 子组件

```typescript
// index.tsx
function Customers() {
  const { openCreateDialog } = useCustomersDialogs()

  return (
    <>
      <CustomersPrimaryButtons onCreate={openCreateDialog} />
      <CustomersTable onEdit={openEditDialog} />
    </>
  )
}
```

### 表格 → 行操作

```typescript
// customers-table.tsx
const columns = useMemo(() => {
  return customersColumns.map((col) => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: (props: any) => (
          <DataTableRowActions
            row={props.row}
            onEdit={onEdit}
            onDelete={handleDelete}
          />
        )
      }
    }
    return col
  })
}, [onEdit, handleDelete])
```

### 对话框 → 数据刷新

```typescript
// customer-form-dialog.tsx
const onSubmit = async (values: CustomerFormValues) => {
  if (customer) {
    await updateMutation.mutateAsync({ id: customer.id, data: values })
  } else {
    await createMutation.mutateAsync(values)
  }
  onSuccess()  // 触发数据刷新
}
```

## 性能优化模式

### useMemo - 缓存列定义

```typescript
const columns = useMemo(() => {
  return customersColumns.map((col) => {
    // 修改列定义
    return modifiedCol
  })
}, [onEdit, handleDelete])  // 依赖项
```

### useCallback - 稳定函数引用

```typescript
const handleDelete = useCallback(async (customer: Customer) => {
  // 删除逻辑
}, [deleteMutation, onRefresh])  // 依赖项
```

### TanStack Query - 自动缓存

```typescript
// 自动缓存和重新获取
const { data } = useQuery({
  queryKey: ['customers', params],
  queryFn: () => getScrmApi().customerControllerFindAll(params),
  staleTime: 1000 * 60 * 5,  // 5分钟
})

// 手动失效缓存
queryClient.invalidateQueries({ queryKey: ['customers'] })
```
