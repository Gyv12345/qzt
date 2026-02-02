# 企账通前端

基于 React + Vite + Tailwind CSS + shadcn/ui 构建的响应式前端应用。

## 技术栈

- **框架**: React 19 + TypeScript 5
- **构建工具**: Vite 7
- **路由**: React Router v7
- **状态管理**: Zustand
- **数据请求**: TanStack Query
- **UI 框架**: Tailwind CSS + shadcn/ui
- **图标**: lucide-react
- **图表**: recharts
- **API 生成**: Orval

## 开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3456

### 生成 API 服务

```bash
pnpm generate:api
```

### 构建

```bash
pnpm build
```

### 代码检查

```bash
pnpm lint
pnpm format
```

## 目录结构

```
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
└── layouts/         # 布局组件
```

## 响应式断点

- **Mobile**: < 768px (单列 + 底部Tab)
- **Tablet**: 768px - 1279px (两列)
- **Desktop**: ≥ 1280px (三列 + 侧边栏)
