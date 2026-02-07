# 企账通 Website 开发记录

## 概述

创建了独立的 Next.js 15 公司网站（`website/` 目录），用于展示 CMS 公开内容。

## 端口配置

| 项目 | 端口 | 说明 |
|------|------|------|
| frontend | 3456 | 管理后台 |
| backend | 7890 | API 服务 |
| website | 5180 | 公司网站（"我要帮"）|

## 技术栈

- **框架**: Next.js 15 (App Router) + TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui
- **动画**: Framer Motion（带 prefers-reduced-motion 支持）
- **部署**: Docker standalone 模式

## 项目结构

```
website/
├── app/
│   ├── articles/
│   │   ├── page.tsx          # 文章列表页
│   │   └── [slug]/page.tsx   # 文章详情页（SSG + ISR）
│   ├── cases/
│   │   ├── page.tsx          # 案例列表页
│   │   └── [slug]/page.tsx   # 案例详情页
│   ├── globals.css           # 全局样式（Tailwind v4）
│   ├── layout.tsx            # 根布局（Poppins + Open Sans 字体）
│   └── page.tsx              # 首页
├── components/
│   ├── layout/
│   │   ├── header.tsx        # 响应式导航栏
│   │   └── footer.tsx        # 页脚
│   ├── sections/
│   │   ├── hero.tsx          # 英雄区（渐变 + 动画）
│   │   ├── features.tsx      # 功能展示
│   │   ├── stats.tsx         # 数据统计
│   │   └── cta.tsx           # 行动召唤
│   └── ui/                   # shadcn/ui 组件
├── lib/
│   ├── api.ts                # CMS API 客户端
│   └── utils.ts              # 工具函数
└── Dockerfile                # Docker 配置
```

## CMS API 集成

网站通过以下公开 API 从后端获取内容：

| 端点 | 用途 |
|------|------|
| GET /public/cms/contents | 获取已发布内容列表 |
| GET /public/cms/contents/:slug | 根据 slug 获取内容 |
| GET /public/cms/articles | 获取文章 |
| GET /public/cms/cases | 获取案例 |
| GET /public/cms/tags | 获取所有标签 |

## 代码审查修复记录

### 发现并修复的问题

1. **未定义变量 setTagsManagerOpen** (frontend/src/features/cms/index.tsx:140)
   - 修复: 使用传递的 `onManageTags` 回调

2. **重复渲染 CmsDrawers 和 CmsTagsManager** (frontend/src/features/cms/index.tsx:254-260)
   - 修复: 移除 `CmsContentManager` 内部的重复包裹

3. **缺少 onSuccess 属性** (frontend/src/features/cms/index.tsx:80-83)
   - 修复: 添加 `onSuccess={handleRefresh}`

## 启动命令

```bash
# 开发环境
cd website && pnpm dev

# 生产构建
cd website && pnpm build

# Docker 部署
docker compose -f docker/docker-compose.prod.yml up website
```

## 环境变量

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:7890
PORT=5180
```

## 后续优化建议

1. **图片优化**: 使用 Next.js Image 组件替代 img 标签
2. **类型安全**: 为 CmsContentManagerProps 添加精确类型，移除 `any`
3. **SEO**: 添加 metadata 和 sitemap 生成
4. **国际化**: 考虑使用 next-intl 支持多语言

## 更新日期

2025-02-07
