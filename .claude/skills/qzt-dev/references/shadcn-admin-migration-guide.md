# Shadcn Admin 迁移指南

> 将 Shadcn Admin 组件集成到 QZT 项目

## 核心差异对比

### 技术栈对比

| 特性 | Shadcn Admin | QZT 项目 | 兼容性 |
|------|-------------|---------|--------|
| 构建工具 | Vite 7.3.0 | Vite 7.2.4 | ✅ 兼容 |
| React | 19.2.3 | 19.2.4 | ✅ 兼容 |
| TypeScript | 5.9.3 | 5.9.3 | ✅ 兼容 |
| 路由 | TanStack Router 1.141.2 | TanStack Router 1.141.2 | ✅ 完全相同 |
| 状态管理 | Zustand 5.0.9 | Zustand 5.0.11 | ✅ 兼容 |
| 数据获取 | TanStack Query 5.90.12 | TanStack Query 5.90.20 | ✅ 兼容 |
| 表单 | React Hook Form 7.68.0 | React Hook Form 7.68.0 | ✅ 兼容 |
| 验证 | Zod 4.2.0 | Zod 4.2.0 | ✅ 兼容 |
| UI 组件 | Shadcn UI + Tailwind CSS 4.1.18 | Shadcn UI + Tailwind CSS 3.4.19 | ⚠️ Tailwind 版本不同 |
| HTTP | Axios 1.13.2 | Axios 1.13.4 | ✅ 兼容 |

### 关键差异

#### 1. Tailwind CSS 版本

**Shadcn Admin**: Tailwind CSS 4.x（使用 `@tailwindcss/vite` 插件）
**QZT 项目**: Tailwind CSS 3.x（传统 PostCSS 配置）

**影响**:
- Tailwind 4.x 使用新的配置方式（通过 CSS 变量）
- Tailwind 3.x 使用 `tailwind.config.js`

**迁移策略**:
- **选项 A**: 升级 QZT 到 Tailwind 4.x（推荐，Shadcn Admin 已验证）
- **选项 B**: 降级 Shadcn Admin 组件到 Tailwind 3.x（不推荐）

#### 2. API 客户端

**Shadcn Admin**: 直接使用 Axios
**QZT 项目**: 使用 Orval 生成的 API 客户端

**影响**:
- Shadcn Admin 的数据表格组件直接调用 Axios
- QZT 需要适配 Orval 生成的类型和函数

**解决方案**:
```typescript
// 创建适配器层
// src/lib/api-adapter.ts
import { getScrmApi } from '@/services/api'

export const apiAdapter = {
  getUsers: (params) => getScrmApi().userControllerFindAll(params),
  // ...
}
```

#### 3. 认证系统

**Shadcn Admin**: Clerk（第三方认证服务）
**QZT 项目**: 自定义 JWT 认证

**影响**:
- 需要替换 Clerk 相关的认证逻辑
- 保留布局组件，替换认证实现

## 可迁移的组件

### ✅ 可以直接迁移的组件

以下组件不依赖特定业务逻辑，可以直接迁移：

#### 基础 UI 组件
- `components/ui/` - 所有 Shadcn UI 组件（已包含在 QZT）
- `password-input.tsx` - 密码输入框（带显示/隐藏）
- `long-text.tsx` - 长文本展示（带展开/收起）
- `navigation-progress.tsx` - 导航进度条

#### 布局组件
- `components/layout/app-sidebar.tsx` - 应用侧边栏
- `components/layout/header.tsx` - 顶部导航栏
- `components/layout/authenticated-layout.tsx` - 认证布局
- `components/layout/nav-group.tsx` - 导航分组
- `components/layout/nav.tsx` - 导航项

#### 功能组件
- `components/command-menu.tsx` - 全局命令面板
- `components/search.tsx` - 搜索组件
- `components/theme-switch.tsx` - 主题切换
- `components/profile-dropdown.tsx` - 用户资料下拉

#### 数据表格（需适配）
- `components/data-table/` - 完整的数据表格组件
  - 需要适配 API 调用（Orval → Axios）
  - 需要适配数据类型

#### 对话框组件
- `components/confirm-dialog.tsx` - 确认对话框
- `components/sign-out-dialog.tsx` - 退出登录对话框

### ⚠️ 需要适配的组件

#### 表单组件
- `features/auth/sign-in/components/user-auth-form.tsx`
- `features/auth/sign-up/components/sign-up-form.tsx`

**适配点**:
- 替换 Clerk 认证逻辑为 QZT JWT
- 保留 Zod 验证 schema
- 保留 React Hook Form 逻辑

#### 数据表格
- `components/data-table/data-table.tsx`

**适配点**:
- 使用 QZT 的 Orval API
- 适配分页、排序、筛选接口

### ❌ 不建议迁移的组件

以下组件与 Shadcn Admin 的特定业务逻辑紧密耦合：

- `features/` 中的业务功能模块（dashboard, tasks, users 等）
- Clerk 相关的认证组件
- 特定的主题和字体配置（可选择性采用）

## 迁移步骤

### 步骤 1: 升级 Tailwind CSS（推荐）

```bash
# 1. 卸载 Tailwind CSS 3.x
cd frontend
pnpm remove tailwindcss postcss autoprefixer

# 2. 安装 Tailwind CSS 4.x
pnpm add tailwindcss@latest @tailwindcss/vite@latest

# 3. 更新 vite.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    // ... 其他插件
    tailwindcss(),
  ],
})

# 4. 删除旧配置文件
rm postcss.config.js
rm tailwind.config.js

# 5. 更新 src/index.css
# 使用 Tailwind 4.x 新语法
@import "tailwindcss";

@theme {
  /* 添加自定义 CSS 变量 */
  --color-primary: oklch(0.5 0.15 250);
  /* ... 更多变量 */
}
```

### 步骤 2: 复制布局组件

```bash
# 复制侧边栏和布局组件
cp -r path/to/shadcn-admin/src/components/layout frontend/src/components/

# 复制必要的 UI 组件（如果缺失）
cp path/to/shadcn-admin/src/components/ui/sidebar.tsx frontend/src/components/ui/
cp path/to/shadcn-admin/src/components/ui/collapsible.tsx frontend/src/components/ui/
```

### 步骤 3: 复制 Context Providers

```bash
# 复制 Context
cp path/to/shadcn-admin/src/context/layout-provider.tsx frontend/src/context/
cp path/to/shadcn-admin/src/context/search-provider.tsx frontend/src/context/
cp path/to/shadcn-admin/src/context/theme-provider.tsx frontend/src/context/ # 如果需要
```

### 步骤 4: 创建 API 适配器

```typescript
// frontend/src/lib/api-adapter.ts
import { getScrmApi } from '@/services/api'
import type {
  CustomerControllerFindAllParams,
  CustomerControllerFindAllResult,
} from '@/services/api'

export const qztApi = {
  // 客户相关
  getCustomers: (params: CustomerControllerFindAllParams) =>
    getScrmApi().customerControllerFindAll(params),
  getCustomer: (id: string) =>
    getScrmApi().customerControllerFindOne({ id }),
  createCustomer: (data: CreateCustomerDto) =>
    getScrmApi().customerControllerCreate(data),
  updateCustomer: (id: string, data: UpdateCustomerDto) =>
    getScrmApi().customerControllerUpdate({ id, updateCustomerDto: data }),
  deleteCustomer: (id: string) =>
    getScrmApi().customerControllerRemove({ id }),

  // 产品相关
  getProducts: (params?: ProductControllerFindAllParams) =>
    getScrmApi().productControllerFindAll(params),
  getProduct: (id: string) =>
    getScrmApi().productControllerFindOne({ id }),
  createProduct: (data: CreateProductDto) =>
    getScrmApi().productControllerCreate(data),
  updateProduct: (id: string, data: UpdateProductDto) =>
    getScrmApi().productControllerUpdate({ id, updateProductDto: data }),
  deleteProduct: (id: string) =>
    getScrmApi().productControllerRemove({ id }),

  // 合同相关
  getContracts: (params?: ContractControllerFindAllParams) =>
    getScrmApi().contractControllerFindAll(params),
  getContract: (id: string) =>
    getScrmApi().contractControllerFindOne({ id }),
  createContract: (data: CreateContractDto) =>
    getScrmApi().contractControllerCreate(data),
  updateContract: (id: string, data: UpdateContractDto) =>
    getScrmApi().contractControllerUpdate({ id, updateContractDto: data }),
  deleteContract: (id: string) =>
    getScrmApi().contractControllerRemove({ id }),

  // ... 更多 API
}
```

### 步骤 5: 适配数据表格

```typescript
// frontend/src/components/data-table/qzt-data-table.tsx
import { qztApi } from '@/lib/api-adapter'
import { useQuery } from '@tanstack/react-query'

export function QztDataTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers', pagination, sorting, filters],
    queryFn: () => qztApi.getCustomers({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      // ... 其他参数
    }),
  })

  // 使用 Shadcn Admin 的 DataTable 组件
  return <DataTable data={data?.data || []} columns={columns} />
}
```

### 步骤 6: 更新路由结构

```typescript
// frontend/src/routes/_authenticated/__root.tsx
import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  beforeLoad: () => {
    // 检查 QZT 认证状态
    const token = localStorage.getItem('token')
    if (!token) {
      throw redirect({ to: '/login' })
    }
  },
})
```

### 步骤 7: 创建导航配置

```typescript
// frontend/src/components/layout/data/sidebar-data.ts
import { type SidebarData } from '@/components/layout/types'

export const sidebarData: SidebarData = {
  title: 'QZT SCRM',
  items: [
    {
      title: '仪表板',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: '客户管理',
      href: '/customers',
      icon: Users,
      badge: 'New',
    },
    {
      title: '产品管理',
      href: '/products',
      icon: Package,
    },
    {
      title: '合同管理',
      href: '/contracts',
      icon: FileText,
    },
    // ... 更多导航项
  ],
}
```

## 最佳实践

### 1. 渐进式迁移

不要一次性迁移所有组件。优先级：

1. **高优先级**:
   - 布局系统（侧边栏、头部）
   - 数据表格（核心功能）
   - 命令面板（提升 UX）

2. **中优先级**:
   - 主题切换
   - 搜索组件
   - 确认对话框

3. **低优先级**:
   - 其他辅助组件
   - 样式优化

### 2. 保持 API 调用一致

始终使用 Orval 生成的 API，不要在组件中直接使用 Axios：

```typescript
// ✅ 正确
import { qztApi } from '@/lib/api-adapter'
const { data } = useQuery({
  queryKey: ['customers'],
  queryFn: () => qztApi.getCustomers(),
})

// ❌ 错误
import axios from 'axios'
const { data } = useQuery({
  queryKey: ['customers'],
  queryFn: () => axios.get('/api/customers'),
})
```

### 3. 类型安全

确保所有 API 调用都有正确的类型：

```typescript
import type {
  Customer,
  CustomerControllerFindAllParams,
} from '@/services/api'

const fetchCustomers = async (
  params: CustomerControllerFindAllParams
): Promise<Customer[]> => {
  const result = await qztApi.getCustomers(params)
  return result.data // 类型安全
}
```

### 4. 保持现有认证逻辑

不要替换 QZT 的 JWT 认证系统，只需适配布局：

```typescript
// 保留 QZT 认证
const { isAuthenticated, user } = useAuthStore()

// 使用 Shadcn Admin 布局
<AuthenticatedLayout>
  <Header>
    <ProfileDropdown user={user} />
  </Header>
</AuthenticatedLayout>
```

## 潜在问题和解决方案

### 问题 1: Tailwind CSS 版本冲突

**症状**: 样式不生效，编译错误

**解决方案**: 升级到 Tailwind 4.x（见步骤 1）

### 问题 2: 侧边栏状态不持久

**症状**: 刷新页面后侧边栏状态丢失

**解决方案**: 检查 Cookie 设置，确保 QZT 也使用相同的 Cookie key

```typescript
// src/lib/cookies.ts
export const getSidebarState = () => {
  return getCookie('sidebar_state') !== 'false'
}
```

### 问题 3: 数据表格排序不工作

**症状**: 点击列头不排序

**解决方案**: 检查 API 参数映射

```typescript
// QZT API 可能使用不同的参数名
const sortingParams = {
  sortBy: sorting[0]?.id,
  sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
}
```

### 问题 4: 主题切换不生效

**症状**: 切换主题后样式不变

**解决方案**: 确保 ThemeProvider 正确集成

```typescript
// frontend/src/main.tsx
import { ThemeProvider } from '@/components/theme-provider'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <ThemeProvider defaultTheme="light" storageKey="qzt-theme">
    <RouterProvider router={router} />
  </ThemeProvider>
)
```

## 验证清单

迁移完成后，检查以下项目：

- [ ] 侧边栏正常工作（展开/折叠、响应式）
- [ ] 路由导航正常（类型安全、参数传递）
- [ ] 数据表格功能完整（分页、排序、筛选）
- [ ] 主题切换正常（亮色/暗色）
- [ ] 命令面板可打开（Cmd+K）
- [ ] 认证流程正常（登录、登出）
- [ ] API 调用类型安全（无 any 类型）
- [ ] 无控制台错误
- [ ] 响应式设计正常（移动端、平板、桌面）
- [ ] 无障碍功能正常（键盘导航、屏幕阅读器）

## 下一步

完成迁移后，可以考虑：

1. **添加更多 Shadcn UI 组件**
   ```bash
   npx shadcn@latest add [component-name]
   ```

2. **自定义主题**
   - 修改 `src/styles/theme.css`
   - 调整品牌颜色

3. **添加自定义组件**
   - 参考 Shadcn Admin 的组件模式
   - 创建 QZT 特定的业务组件

4. **性能优化**
   - 启用 TanStack Router 的自动代码分割
   - 使用 React.lazy() 懒加载组件

5. **国际化**
   - 使用现有的 i18next 配置
   - 添加 Shadcn Admin 组件的翻译

## 参考资源

- [Shadcn Admin GitHub](https://github.com/satnaing/shadcn-admin)
- [Shadcn UI 文档](https://ui.shadcn.com)
- [TanStack Router 文档](https://tanstack.com/router/latest)
- [Tailwind CSS 4.x 文档](https://tailwindcss.com/docs/v4-beta)
