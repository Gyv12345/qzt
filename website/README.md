# QZT Website

企智通官方网站 - Next.js 15 营销网站

[English](./README.en.md)

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | ^15.1.6 | React 框架 |
| React | ^19.2.4 | UI 库 |
| Tailwind CSS | ^4.1.18 | 原子化 CSS |
| shadcn/ui | - | 组件库 |
| Framer Motion | ^12.33.0 | 动画库 |

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
pnpm dev

# 访问: http://localhost:5180
```

## 项目结构

```
website/
├── app/              # Next.js App Router
│   ├── articles/     # 文章页面
│   ├── cases/        # 案例页面
│   ├── globals.css   # 全局样式
│   ├── layout.tsx    # 根布局
│   └── page.tsx      # 首页
├── components/       # React 组件
│   ├── layout/       # 布局组件
│   ├── sections/     # 页面区块
│   └── ui/           # UI 组件
└── lib/              # 工具函数
```

## 功能特性

- **首页**: 产品介绍、特性展示
- **文章**: 技术博客、产品更新
- **案例**: 客户案例、成功故事
- **响应式设计**: 支持移动端和桌面端

## 开发命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint
```

## 许可证

MIT
