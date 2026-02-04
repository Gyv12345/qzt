# Shadcn Admin 项目概览

> 来源: https://github.com/satnaing/shadcn-admin
> 版本: 2.2.1

## 项目简介

Shadcn Admin 是一个基于 Shadcn UI 和 Vite 构建的响应式管理后台 UI，专注于响应式设计和可访问性。

## 核心特性

- ✅ 亮色/暗色模式支持
- ✅ 完全响应式设计
- ✅ 可访问性优化
- ✅ 内置侧边栏组件
- ✅ 全局搜索命令
- ✅ 10+ 预制页面
- ✅ 额外的自定义组件
- ✅ RTL（从右到左）支持

## 技术栈

### 核心框架
- **React 19.2.3** - UI 框架
- **TypeScript 5.9.3** - 类型系统
- **Vite 7.3.0** - 构建工具

### 路由和状态管理
- **TanStack Router 1.141.2** - 文件路由系统
- **TanStack Query 5.90.12** - 数据获取和状态管理
- **Zustand 5.0.9** - 轻量级状态管理

### UI 组件
- **Shadcn UI** - UI 组件库（基于 Radix UI + Tailwind CSS）
- **Tailwind CSS 4.1.18** - CSS 框架
- **Radix UI** - 无障碍组件原语
- **Lucide React** - 图标库
- **Sonner** - Toast 通知
- **Recharts** - 图表库

### 表单和验证
- **React Hook Form 7.68.0** - 表单管理
- **Zod 4.2.0** - 数据验证
- **@hookform/resolvers** - 表单验证集成

### 其他工具
- **Axios 1.13.2** - HTTP 客户端
- **date-fns 4.1.0** - 日期处理
- **cmdk 1.1.1** - 命令面板
- **react-top-loading-bar 3.0.2** - 页面加载进度条

### 认证（部分）
- **Clerk 5.58.1** - 身份认证和用户管理

## 项目结构

```
src/
├── assets/              # 静态资源（品牌图标、logo）
├── components/          # 可复用组件
│   ├── data-table/     # 数据表格组件
│   ├── layout/         # 布局组件（侧边栏、头部）
│   └── ui/             # Shadcn UI 组件
├── config/             # 配置文件
├── context/            # Context Providers
├── features/           # 功能模块（按业务划分）
│   ├── auth/           # 认证功能
│   ├── dashboard/      # 仪表板
│   └── settings/       # 设置页面
├── hooks/              # 自定义 Hooks
├── routes/             # 路由文件（TanStack Router）
├── stores/             # Zustand 状态管理
└── styles/             # 全局样式
```

## 关键组件说明

### 布局系统
- **AuthenticatedLayout** - 已认证用户的布局容器
- **AppSidebar** - 应用侧边栏（支持折叠、响应式）
- **Header** - 顶部导航栏
- **NavGroup** - 导航分组组件

### 自定义组件
- **DataTable** - 功能完整的数据表格（支持排序、筛选、分页）
- **CommandMenu** - 全局命令面板（Cmd+K）
- **ConfirmDialog** - 确认对话框
- **DatePicker** - 日期选择器
- **PasswordInput** - 密码输入（带显示/隐藏切换）
- **Search** - 搜索组件
- **ThemeSwitch** - 主题切换器
- **ProfileDropdown** - 用户资料下拉菜单

## 已修改的组件

以下组件已针对 RTL 支持或其他改进进行了修改：

### Modified Components（通用修改）
- scroll-area
- sonner
- separator

### RTL Updated Components（RTL 特定修改）
- alert-dialog
- calendar
- command
- dialog
- dropdown-menu
- select
- table
- sheet
- sidebar
- switch

> **注意**: 使用 Shadcn CLI 更新这些组件时需手动合并更改，以保留项目的 RTL 支持和其他定制。

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build

# 代码检查
pnpm run lint

# 代码格式化
pnpm run format

# 检查未使用的文件
pnpm run knip
```

## Vite 配置要点

```typescript
export default defineConfig({
  plugins: [
    tanStackRouter({
      target: 'react',
      autoCodeSplitting: true,  // 自动代码分割
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

## 路径别名

- `@/` → `src/`
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`

## 特性亮点

### 1. 文件路由系统
使用 TanStack Router 的文件路由，支持：
- 类型安全的路由参数
- 自动代码分割
- 布局嵌套
- 路由保护

### 2. 响应式布局
- 移动端自适应
- 侧边栏折叠/展开
- 容器查询（Container Queries）

### 3. 主题系统
- 亮色/暗色模式
- CSS 变量驱动的主题
- 持久化用户偏好

### 4. 数据表格
- 服务端/客户端分页
- 排序和筛选
- 列显示/隐藏
- 全局搜索
- 行选择

### 5. 全局搜索
- 命令面板（Cmd+K）
- 跨页面搜索
- 快速导航

## 适用场景

Shadcn Admin 非常适合：
- 企业级管理后台
- SaaS 应用管理界面
- 数据展示和分析平台
- 需要 RTL 支持的多语言应用

## 许可证

MIT License

## 作者

[@satnaing](https://github.com/satnaing)
