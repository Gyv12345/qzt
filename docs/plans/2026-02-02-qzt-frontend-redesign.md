# 企账通前端重构设计方案

**创建日期**: 2026-02-02
**设计目标**: 使用 React + Tailwind + shadcn/ui 重新构建响应式前端

---

## 一、技术栈选型

### 核心框架
- **脚手架**: Vite (快速、现代)
- **路由**: React Router v6
- **状态管理**: Zustand (轻量、简单)
- **数据请求**: TanStack Query (自动缓存、同步)
- **UI 框架**: Tailwind CSS + shadcn/ui

### 辅助库
- **图标**: react-icons
- **图表**: recharts / tanstack charts
- **表单**: react-hook-form + zod
- **工具**: date-fns, clsx, tailwind-merge

### 开发工具
- **代码生成**: Orval (从 OpenAPI 生成 API 服务)
- **代码质量**: ESLint + Prettier
- **包管理**: pnpm

---

## 二、项目架构

### 2.1 目录结构

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/           # 通用组件
│   │   ├── ui/              # shadcn/ui 组件
│   │   ├── layout/          # 布局组件
│   │   │   ├── Sidebar.tsx      # PC侧边栏
│   │   │   ├── Header.tsx       # 顶部栏
│   │   │   ├── MobileTabBar.tsx # 移动端底部Tab
│   │   │   └── ResponsiveLayout.tsx
│   │   ├── common/          # 通用业务组件
│   │   │   ├── CustomerCard.tsx
│   │   │   ├── CustomerTable.tsx
│   │   │   ├── FollowTimeline.tsx
│   │   │   └── StatsCard.tsx
│   │   └── charts/          # 图表组件
│   ├── pages/               # 页面组件
│   │   ├── auth/           # 登录/注册
│   │   ├── dashboard/      # 首页工作台
│   │   ├── customer/       # 客户管理
│   │   ├── contract/       # 合同管理
│   │   ├── product/        # 产品管理
│   │   ├── automation/     # 自动化规则
│   │   └── system/         # 系统配置
│   ├── hooks/              # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   ├── useMediaQuery.ts
│   │   └── useCustomer.ts
│   ├── services/           # API 服务 (Orval 生成)
│   │   ├── customers.ts
│   │   ├── auth.ts
│   │   └── index.ts
│   ├── stores/             # Zustand 状态管理
│   │   ├── auth.store.ts
│   │   ├── ui.store.ts
│   │   └── notification.store.ts
│   ├── lib/                # 工具库
│   │   ├── utils.ts
│   │   ├── api-client.ts   # axios 配置
│   │   └── orval.ts
│   ├── types/              # TypeScript 类型
│   │   ├── api.d.ts        # Orval 生成的 API 类型
│   │   ├── models.d.ts     # 业务模型类型
│   │   └── index.ts
│   ├── styles/             # 全局样式
│   │   └── globals.css
│   ├── App.tsx             # 根组件
│   └── main.tsx            # 入口文件
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── orval.config.ts
└── package.json
```

### 2.2 数据流架构

```
UI组件 → TanStack Query → API服务 → 后端
                ↓
            缓存管理
                ↓
            Zustand Store (全局状态)
```

---

## 三、UI 设计系统

### 3.1 品牌色系（蓝色主题）

**浅色模式:**
```css
--primary: 219 83% 53%;        /* 蓝色主色 #2563EB */
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96%;
--accent: 210 40% 96%;
--muted: 210 40% 96%;
--border: 214 32% 91%;
--input: 214 32% 91%;
--ring: 219 83% 53%;
--background: 0 0% 100%;
--foreground: 222 47% 11%;
```

**深色模式:**
```css
.dark {
  --primary: 217 91% 60%;
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
}
```

### 3.2 响应式断点

**Tailwind 断点配置:**
```javascript
screens: {
  'mobile': '<768px',    // 移动端: 单列 + 底部Tab
  'tablet': '768px',     // 平板: 两列布局
  'desktop': '1280px',   // PC端: 三列 + 侧边栏
}
```

### 3.3 布局策略

**PC端布局 (≥1280px):**
```
┌─────────────────────────────────────────────────────┐
│  侧边栏     │    主内容区 (三列布局)                 │
│  ├─ 首页    │  ┌────────┬────────┬────────┐        │
│  ├─ 客户    │  │ 筛选区  │ 客户列表 │ 详情面板 │        │
│  ├─ 合同    │  │ (固定)  │(可滚动) │ (可滑出) │        │
│  ├─ 产品    │  └────────┴────────┴────────┘        │
│  ├─ 自动化  │                                        │
│  └─ 系统    │                                        │
└─────────────────────────────────────────────────────┘
```

**移动端布局 (<768px):**
```
┌─────────────────────────┐
│  顶部栏: 搜索 + 新建    │
├─────────────────────────┤
│  主内容区 (单列)         │
│  客户卡片列表            │
├─────────────────────────┤
│ 底部Tab: 🏠👥💰⚙️      │
└─────────────────────────┘
```

### 3.4 组件库

**shadcn/ui 基础组件:**
- Button, Input, Select, Card
- Table, Dialog, Dropdown
- Form, Label, Toast
- Tabs, Badge, Avatar

**自定义业务组件:**
- CustomerCard - 客户卡片
- CustomerTable - 客户表格
- FollowTimeline - 跟进记录时间线
- StatsCard - 统计卡片
- ChartContainer - 图表容器

---

## 四、认证与权限

### 4.1 认证流程

```
登录 → JWT token → localStorage
  ↓
每次请求携带 Authorization header
  ↓
Token 过期 → 自动跳转登录页
```

### 4.2 权限架构

**前端权限控制:**
- 基于角色的菜单显示/隐藏
- 基于权限按钮的禁用/隐藏
- 路由守卫验证访问权限

**后端权限验证:**
- JWT Guard 验证 token
- RBAC Guard 验证角色权限
- 接口级别的权限装饰器

### 4.3 Zustand Store 设计

**auth.store.ts:**
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  permissions: string[];

  // Actions
  login: (credentials) => Promise<void>;
  logout: () => void;
  updateUser: (user) => void;
  hasPermission: (permission) => boolean;
}
```

---

## 五、API 服务生成

### 5.1 Orval 配置

**orval.config.ts:**
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
};
```

### 5.2 生成命令

```bash
pnpm generate:api  # 自动生成所有服务和类型
```

### 5.3 使用方式

```typescript
// 自动生成的 hooks
const { data, isLoading, error } = useCustomers({
  page: 1,
  pageSize: 20,
  keyword: '搜索词'
});

// 自动重新验证
// 自动缓存管理
// 自动错误处理
```

### 5.4 缓存策略

- 客户列表: 5分钟缓存
- 客户详情: 10分钟缓存
- 统计数据: 1分钟缓存

---

## 六、开发工作流

### 6.1 开发命令

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext ts,tsx",
  "generate:api": "orval",
  "format": "prettier --write ."
}
```

### 6.2 Git 工作流

**分支策略:**
- `main` - 生产环境
- `dev` - 开发环境
- `feat/*` - 功能分支
- `fix/*` - 修复分支

**提交规范:**
```
feat: 新功能
fix: 修复bug
refactor: 重构
docs: 文档
style: 样式
test: 测试
chore: 构建/工具
```

### 6.3 代码质量工具

**ESLint + Prettier:**
- TypeScript 严格模式
- React Hooks 规则
- import 排序
- 统一代码风格

---

## 七、开发顺序

### 阶段一:基础搭建 (1-2天)

1. ✅ Vite 项目初始化
2. ✅ Tailwind + shadcn/ui 配置
3. ✅ 响应式布局框架
4. ✅ 认证模块 (登录/登出)

### 阶段二:核心功能 (3-5天)

5. ✅ Orval 生成 API 服务
6. ✅ 客户管理模块
   - 客户列表 (PC + Mobile)
   - 客户详情
   - 客户表单
7. ✅ 跟进记录模块
   - 时间线组件
   - 添加/编辑记录
8. ✅ 权限系统完善

### 阶段三:扩展功能 (按需)

9. ⏳ 合同管理
10. ⏳ 产品管理
11. ⏳ 自动化规则
12. ⏳ 系统配置

---

## 八、技术亮点

1. **类型安全**: 完整的 TypeScript 类型系统
2. **自动生成**: Orval 从 OpenAPI 自动生成 API 服务
3. **响应式设计**: 完美适配 PC/平板/移动端
4. **性能优化**: TanStack Query 自动缓存管理
5. **开发体验**: Vite 极速启动，HMR 毫秒级
6. **UI 一致性**: shadcn/ui 设计系统
7. **状态管理**: Zustand 轻量简单
8. **主题系统**: 自动跟随系统浅色/深色模式

---

## 九、技术选型对比

### 为什么选择 Vite 而不是 Next.js?

✅ **更快**: Vite 启动速度是 Next.js 的 10 倍
✅ **更简单**: 不需要 SSR/SSG，纯 SPA 足够
✅ **更灵活**: 完全控制路由和配置

### 为什么选择 Zustand 而不是 Redux Toolkit?

✅ **更轻量**: Bundle 体积更小
✅ **更简单**: API 更简洁，学习曲线平缓
✅ **同样强大**: 满足所有状态管理需求

### 为什么选择 shadcn/ui 而不是 Ant Design?

✅ **完全控制**: 组件代码在项目中，可随意修改
✅ **更现代**: 基于 Tailwind CSS，设计更现代
✅ **更灵活**: 不是黑盒，完全可定制
✅ **类型安全**: 完整的 TypeScript 支持

---

## 十、后续优化

1. **性能优化**:
   - 路由懒加载
   - 图片懒加载
   - Bundle 分割

2. **测试**:
   - 单元测试 (Vitest)
   - 组件测试 (Testing Library)
   - E2E 测试 (Playwright)

3. **部署**:
   - Docker 容器化
   - CI/CD 自动化
   - CDN 加速

---

**设计完成时间**: 2026-02-02
**设计者**: Claude + 人工协作
**状态**: 待审批实施
