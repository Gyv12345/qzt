---
sidebar_position: 3
sidebar_label: 前端架构
---

# 前端架构

企智通有三套前端，分别面向**后台管理**（admin）、**公众内容**（cms）、**移动办公**（mobile）。它们技术栈各异，但都是后端 RESTful API 的消费方，共享同一套 API 契约与设计语言。本文介绍三套前端各自的架构设计。

## 三套前端对比

| 维度 | admin | cms | mobile |
| --- | --- | --- | --- |
| 定位 | 后台管理 / 运营 | 官网 / 博客 / SEO | 外勤 / 移动办公 |
| 框架 | React 19 | Next.js 15 (App Router) | React 19 |
| 构建 | Vite 7 | Next.js 内置 | Vite 7 |
| UI | antd 5 + ProComponents | Tailwind CSS | antd-mobile 5 |
| 渲染 | CSR（客户端渲染） | SSR / ISR | CSR |
| 鉴权 | JWT（强登录态） | 公开为主，少量接口 | JWT |
| 部署 | 静态资源 + nginx | Node.js 或静态导出 | 静态资源 + nginx |

## admin · 管理后台

后台管理系统是企智通功能最完整的前端，承载 CRM、审批、HRM、进销存、财务、系统管理等全部模块。它的核心设计目标是：**用最小的代码量完成密集的表单 CRUD**。

### 动态路由（后端菜单驱动）

admin 不在前端硬编码路由，而是**由后端菜单驱动**。流程如下：

```
用户登录
   │
   ▼
调用 GET /api/v1/system/menus (返回当前用户可见的菜单树)
   │
   ▼
前端将菜单扁平化为路由表
   │
   ▼
React Router 动态生成 <Route>
   │
   ▼
渲染 ProLayout 侧边栏（菜单树）
```

这样做的好处：

- 菜单与权限**一处配置、处处生效**：后端给某角色分配菜单，前端立即出现对应入口
- 新增页面只需在后端注册菜单 + 前端写页面组件，无需改路由配置
- 支持菜单排序、隐藏、外链、按钮级权限码

### 状态管理（Zustand）

admin 使用 **Zustand** 管理全局状态，相比 Redux 极简，无样板代码：

```ts
// 典型 store
export const useUserStore = create<UserState>((set) => ({
  user: null,
  permissions: [],
  setUser: (user) => set({ user }),
  fetchProfile: async () => {
    const { data } = await getProfile();
    set({ user: data.user, permissions: data.permissions });
  },
}));
```

典型 store 包括：`useUserStore`（用户与权限）、`useAppStore`（站点配置、主题）、`useDictStore`（字典缓存）。

### axios 请求封装

所有 HTTP 请求经过统一封装的 axios 实例，实现：

- **自动携带 Token**：请求拦截器注入 `Authorization: Bearer <access_token>`
- **自动解包信封**：响应拦截器剥离 `{code, msg, data}`，直接返回 `data`，业务层无需关心信封
- **自动刷新令牌**：access_token 过期（401）时，自动用 refresh_token 换取新令牌，重放原请求，用户无感知
- **统一错误提示**：非 0 code 自动弹出 message.error(msg)
- **loading 收敛**：可选配置，自动显示全局 loading

```ts
// 业务代码只需这样写
const customer = await request.get('/crm/customers/1');
// customer 已经是 data 字段，无需 .data.data
```

### ProTable CRUD 模式

后台 80% 的工作是列表 + 表单的 CRUD。admin 使用 **ProTable + ProForm** 组合，将一个完整 CRUD 页面的代码量压缩到几十行：

- `ProTable`：自带分页、搜索表单、列设置、导出、行编辑
- `ModalForm` / `DrawerForm`：新增 / 编辑弹窗
- `SchemaForm`：基于 schema 的表单渲染，配合后端字段元数据

一个典型的「客户列表 + 新增」页面，核心代码不超过 100 行。

### 主题与权限

- **主题定制**：通过 antd 的 ConfigProvider + CSS Variables，支持亮色 / 暗色 + 品牌色定制
- **按钮级权限**：`<Access code="crm:customer:create">` 组件包裹按钮，无权限自动隐藏
- **数据范围**：列表查询参数由后端根据角色 data_scope 自动过滤，前端不感知

## cms · 内容站点

cms 是面向公众的内容门户（官网、博客、帮助中心）。它的设计目标是**极致的首屏速度与 SEO 表现**，因此选择 Next.js 而非纯 SPA。

### App Router 与 RSC

cms 使用 Next.js 15 的 **App Router**，默认采用 **React Server Components（RSC）**：

- 内容页面在服务端渲染为 HTML，搜索引擎可完整抓取
- 客户端 JS 体积小，首屏 LCP 优秀
- 数据获取在 Server Component 中直接 `await fetch`，无需 getServerSideProps

### ISR（增量静态再生）

对于文章、分类等更新频率低的内容，采用 **ISR**：

- 首次请求生成静态 HTML 并缓存
- 后续请求直接命中缓存（毫秒级响应）
- 内容更新后通过 revalidate 或按需触发重新生成

这比纯 SSR 更省资源，又比纯 SSG 更灵活。

### SEO 与 GEO 优化

cms 针对搜索引擎与 AI 抓取做了深度优化：

- **Metadata API**：每篇文章 / 页面自动生成 `<title>`、`<meta description>`、OG 协议
- **JSON-LD 结构化数据**：文章标记为 `Article`、组织标记为 `Organization`，搜索引擎与 AI 可解析
- **sitemap.xml + robots.txt**：自动生成，覆盖全部公开内容
- **MD 版本**：每篇文章同时提供 Markdown 原始版本（如 `/posts/xxx.md`），便于 AI 抓取与转载
- **语义化 HTML**：正确使用 `<article>`、`<nav>`、`<header>` 等标签

### 内容获取

cms 不直接连业务数据库，而是通过后端公开 API（无需登录的接口）获取已发布内容：

```
GET /api/v1/cms/articles         // 文章列表
GET /api/v1/cms/articles/:id     // 文章详情
GET /api/v1/cms/categories       // 分类
GET /api/v1/cms/site-config       // 站点信息
```

敏感接口（草稿、后台管理）由 admin 负责。

## mobile · 移动端

mobile 面向外勤销售与移动办公场景，是一套 移动端 SPA，可独立部署，也可嵌入企业微信 / 钉钉工作台。

### 技术选型

- **React 19 + Vite 7**：与 admin 保持技术栈一致，便于复用业务逻辑与类型定义
- **antd-mobile 5**：针对移动端交互优化的组件库（TabBar、PullRefresh、DatePicker 等）
- **postcss-px-to-viewport**：将 px 自动转为 vw，适配不同屏幕尺寸

### 功能聚焦

mobile 不做 admin 的全量功能，而是聚焦**移动场景**：

- CRM：客户查看、商机跟进、签到打卡、语音转跟进记录
- 审批：待办处理（同意 / 拒绝 / 退回）
- 考勤：GPS + WiFi 打卡
- 消息：通知中心

### 部署形态

mobile 编译为静态资源，通过 nginx 部署。可：

- 独立子域名（如 `m.example.com`）
- 嵌入企业微信 / 钉钉作为工作台应用
- 打包为 Hybrid App（套壳 WebView）

## 共享与复用

三套前端虽然是独立工程，但通过以下方式共享代码：

- **API 契约共享**：后端 OpenAPI 文档生成 TypeScript 类型，三端共用
- **业务常量共享**：错误码、字典枚举、状态机定义抽取为独立 npm 包
- **设计 token 共享**：品牌色、间距规范通过共享的 design tokens 对齐

## 扩展阅读

- [整体架构](./overview)：系统全景
- [后端架构](./backend)：API 与中间件
- [部署章节](../deployment/overview)：三套前端的构建与部署
