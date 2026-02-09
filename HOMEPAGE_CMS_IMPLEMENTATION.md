# 首页管理功能实施完成

## 功能概述

已成功实现 CMS 首页管理功能，允许通过后台管理界面配置 Website 首页的内容。

## 实施内容

### 1. 数据模型（后端）

**文件**: `backend/prisma/schema.prisma`

- `CmsContent` 添加 `contractId` 字段：用于案例关联合同
- `CmsPage` 新模型：页面主表
- `CmsPageElement` 新模型：页面元素表，支持多种区域和元素类型

### 2. 后端 API

**新增文件**:
- `backend/src/modules/cms/dto/create-cms-page.dto.ts`
- `backend/src/modules/cms/dto/update-cms-page.dto.ts`
- `backend/src/modules/cms/dto/query-cms-page.dto.ts`

**更新文件**:
- `backend/src/modules/cms/cms.service.ts`：添加页面管理方法
- `backend/src/modules/cms/cms.controller.ts`：添加页面管理端点
- `backend/src/modules/cms/cms-public.controller.ts`：添加公共端点

**API 端点**:
- `POST /cms/pages` - 创建页面
- `GET /cms/pages` - 获取页面列表
- `GET /cms/pages/:id` - 获取页面详情
- `PATCH /cms/pages/:id` - 更新页面
- `DELETE /cms/pages/:id` - 删除页面
- `POST /cms/pages/:id/publish` - 发布页面
- `POST /cms/pages/:id/unpublish` - 取消发布
- `GET /public/cms/pages/:slug` - 获取已发布页面（Website 使用）

### 3. 前端管理界面

**新增文件**:
- `frontend/src/features/cms/hooks/use-cms-pages.ts` - 页面管理 Hooks
- `frontend/src/features/cms/components/cms-page-form-drawer.tsx` - 表单抽屉
- `frontend/src/features/cms/components/cms-pages-table.tsx` - 页面表格
- `frontend/src/features/cms/components/page-preview-dialog.tsx` - 预览对话框
- `frontend/src/features/cms/pages-page.tsx` - 主页面
- `frontend/src/routes/_authenticated/cms/pages/route.tsx` - 路由
- `frontend/src/components/ui/drawer.tsx` - Drawer 组件

**更新文件**:
- `frontend/src/components/layout/data/sidebar-data.ts` - 添加"页面管理"菜单

### 4. Website 集成

**更新文件**:
- `website/lib/api.ts` - 添加 `getPageBySlug` 函数和类型定义
- `website/app/page.tsx` - 使用新的页面 API
- `website/components/sections/hero.tsx` - 支持页面数据
- `website/components/sections/stats.tsx` - 支持页面数据
- `website/components/sections/features.tsx` - 支持页面数据
- `website/components/sections/cta.tsx` - 支持页面数据

### 5. 初始化脚本

**文件**: `backend/src/scripts/init-homepage.ts`

创建示例首页数据，包含：
- HERO 区域：5 个元素（2 个标题、1 个描述、2 个按钮）
- STATS 区域：4 个统计数字
- FEATURES 区域：6 个功能卡片
- CTA 区域：4 个优势文本 + 1 个按钮

运行方式：
```bash
cd backend && npx ts-node src/scripts/init-homepage.ts
```

## 数据结构说明

### 页面元素类型

**区域类型 (sectionType)**:
- `HERO` - 首屏区域
- `STATS` - 数据统计
- `FEATURES` - 功能特点
- `CTA` - 行动号召
- `TESTIMONIALS` - 用户评价
- `PARTNERS` - 合作伙伴
- `CONTACT` - 联系方式

**元素类型 (elementType)**:
- `heading` - 标题
- `text` - 文本
- `button` - 按钮
- `image` - 图片
- `card` - 卡片
- `list` - 列表
- `statistic` - 统计数字
- `testimonial` - 评价

### Content 字段格式

每个元素的 `content` 字段存储 JSON 数据，格式示例：

```json
// heading 元素
{ "text": "企业客户管理" }

// text 元素
{ "text": "描述文字" }

// button 元素
{ "text": "免费试用", "url": "/signup", "isPrimary": true }

// statistic 元素
{ "label": "服务企业", "value": 10000, "suffix": "+", "color": "from-blue-500 to-cyan-500", "bgColor": "bg-blue-50" }

// card 元素
{ "title": "快速部署", "description": "5分钟即可完成部署", "gradient": "from-blue-400 to-cyan-500" }
```

## 使用说明

1. 访问前端管理系统，进入"内容管理" → "页面管理"
2. 点击"新建页面"或编辑现有页面
3. 配置页面元素：
   - 选择区域类型（首屏、统计、功能等）
   - 选择元素类型（标题、按钮、卡片等）
   - 填写内容 JSON
   - 设置排序和可见性
4. 点击"保存"
5. 点击"发布"使页面在 Website 上生效

## Website 渲染逻辑

Website 首页按以下优先级获取数据：
1. 首先尝试从 `/public/cms/pages/homepage` 获取新的页面配置
2. 如果没有配置，回退到旧的 `PAGE_ELEMENT` 方式
3. 如果都没有，使用默认硬编码内容

这种设计确保了向后兼容性。

## 服务地址

- 后端 API: http://localhost:7890
- 前端管理: http://localhost:3456 (页面管理: /cms/pages)
- Website: http://localhost:5180
