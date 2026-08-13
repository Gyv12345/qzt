# qzt-go-cms 质量测试清单（QA Checklist）

> 适用范围：`qzt-go-cms`（Next.js 15 App Router + React 19 + Tailwind 3 企业官网）。
> 数据源：后端 `qzt-go-server`（公开接口，无鉴权）。所有 GET 经 `src/lib/api.ts` 的 `request()` 走 `fetch(..., { cache: "no-store" })` 实时拉取，页面层 `revalidate = 300`。
> 质量关口：`npm run build`（含 `tsc` 类型检查）+ `npm run lint`。**本仓库不引入测试框架**，回归以本清单的手工/截图验证为准。

## 0. 测试环境与前置准备

执行前先确认环境，避免因环境差异误判（典型坑：`.env.local` 的 `NEXT_PUBLIC_API_BASE` 在本地默认 `localhost:8000`，与实际后端 `9000` 不一致）。

- [ ] 确认 `.env.local` 的 `NEXT_PUBLIC_API_BASE` 指向可用的后端（本地 dev 用 `http://127.0.0.1:9000/prod-api`，**不要用 `localhost:8000`**）。
- [ ] 确认 `NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_SITE_URL` 已设置（影响 metadata / sitemap）。
- [ ] 后端 `qzt-go-server` 已启动（`curl -s http://127.0.0.1:9000/system/site-config` 返回 `code===0`）。
- [ ] 后端公开端点有数据可测（产品 ≥1、文章 ≥1、合作方 ≥1、团队 ≥1、至少 1 个 `link_type=page` 的 CMS 单页）。
- [ ] 选定测试目标：本地 `pnpm dev`（或 `npm run dev`）回归 / 生产 `https://devlovecode.com` 冒烟。

## 1. 构建与静态检查（自动化关口）

- [ ] `npm run lint` 通过（ESLint `next/core-web-vitals`，0 error / 0 warning）。
- [ ] `npm run build` 通过（`tsc -b && next build` 无类型错误，无构建期 fetch 失败导致的中断）。
- [ ] `next build` 产物里每个路由标注了正确的渲染模式（SSG / ISR `revalidate=300`），详情页有 `generateStaticParams` 预渲染条目。
- [ ] 生产部署流程（rsync 源码 → 服务器 `npx next build` → `pm2 restart qzt-cms`）未被 `.env.local` 覆盖（rsync `--exclude .env*`）。

## 2. 页面渲染回归（逐路由）

固定导航 6 项：`/`（首页）、`/products`、`/partners`、`/team`、`/news`、`/contact`；外加 `/about`、`/p/:slug`、详情页、404。

### 2.1 首页 `/`（`src/app/page.tsx`）
- [ ] Hero 区：badge / title / subtitle 来自站点配置（`hero_title`/`hero_subtitle`/`hero_badge`，留空则降级为站名/描述）。
- [ ] 产品 / 合作方 / 团队 三大板块按 `homepage-config.{section}.enabled` 显隐；`enabled:false` 的板块整块消失。
- [ ] 板块有数据时渲染卡片网格，点击卡片跳转正确（产品→`/products/:id`，文章→`/news/:slug`）。
- [ ] 板块无数据时渲染 `EmptyState`（空盒图标 + 文案），不报错。
- [ ] 新闻板块显示最多 4 条最新文章。
- [ ] 列表底部"查看全部"链接指向 `/products` / `/news`。

### 2.2 产品 `/products` + `/products/:id`
- [ ] `/products` 卡片网格一次性展示最多 24 条，无翻页/搜索/筛选 UI（符合现状）。
- [ ] `/products/:id`：面包屑（首页 / 产品 / 名称）、分类徽章、价格、主图、Markdown 描述（GFM 表格/列表/代码块渲染正确）。
- [ ] 价格方案表格字段（名称/价格/说明）渲染正确。
- [ ] 不存在的 id → 触发 `notFound()` → 跳全局 404 页。
- [ ] `generateStaticParams` 预渲染的 id 与"按需 ISR"的新 id 均可访问。

### 2.3 合作伙伴 `/partners`
- [ ] 卡片网格（最多 48 条），徽标缺失时用首字母圆形占位。
- [ ] 无 hover 跳转（合作方卡片非链接）。

### 2.4 团队 `/team`
- [ ] 卡片网格（最多 48 条），头像缺失用内置 SVG fallback。
- [ ] 姓名/职位/简介展示完整。

### 2.5 新闻 `/news` + `/news/:slug`
- [ ] `/news` 卡片网格（最多 24 条），含分类徽章 + 日期 + 摘要，无搜索/分页/分类筛选 UI（符合现状）。
- [ ] `/news/:slug`：面包屑、分类/日期/阅读数、封面图、Markdown 正文渲染正确（含 GFM）。
- [ ] 不存在的 slug → `notFound()` → 全局 404。

### 2.6 关于 `/about`
- [ ] `getPage("about")` 成功 → 渲染后台 Markdown 内容。
- [ ] `getPage("about")` 失败 → 降级为内置默认文案（不报错、不空白）。

### 2.7 联系我们 `/contact`
- [ ] 页面壳静态渲染正常。
- [ ] 表单交互见 §4（专项）。

### 2.8 CMS 单页 `/p/:slug`
- [ ] 存在的 slug → 渲染 `getPage(slug)` 的 Markdown 内容。
- [ ] **不存在的 slug → 不跳全局 404**，而是内联渲染"页面未找到"文案（与详情页 404 行为不同，需专项验证）。

### 2.9 404
- [ ] 访问不存在的静态路径（如 `/nope`）→ 渲染 `not-found.tsx`（渐变 404 + 返回首页链接）。
- [ ] `/products/:id`、`/news/:slug` 失败也走同一 404 页。

## 3. 数据获取与降级（容错）

- [ ] **后端正常**：所有页面数据正确加载，无控制台 fetch 报错。
- [ ] **后端宕机/超时**：`/products` `/partners` `/team` `/news` 首页各板块均不崩页，展示 `EmptyState` 或默认文案（`.catch()` 降级生效）。
- [ ] 后端返回 `code !== 0`：`request()` 抛错被页面 `.catch` 兜住，同上降级。
- [ ] 首页三大板块在 `enabled` 未配置（接口返回空）时的默认显隐行为符合预期。
- [ ] Header 的动态单页/外链接口失败时，导航仍显示固定 6 项（降级）。
- [ ] Footer 的站点配置失败时，联系方式/备案仍显示静态常量兜底。

## 4. 联系表单（`/contact` → `ContactForm`，唯一交互）

字段：姓名（必填）、电话（必填 `tel`）、邮箱（选填 `email`）、公司（选填）、留言（必填）。提交目标 `POST {API_BASE}/crm/public/contact`，成功返回 `{lead_no}` 并在 CRM 生成线索（见 memory `cms-contact-to-lead`）。

- [ ] 空表单提交 → 浏览器原生必填校验拦截（不发起请求）。
- [ ] 仅填必填项 → 成功提交，后端落库生成线索（去 admin/CRM 核对 `lead_no`）。
- [ ] 邮箱字段填非法格式 → 提交时校验拦截（`type=email`）。
- [ ] 提交中 → 按钮禁用 + 文案"提交中..."，防重复提交。
- [ ] 成功 → 绿色成功卡片渲染；约 5 秒后自动重置回空表单。
- [ ] 失败（后端非 0 / 网络错误）→ 红色错误条显示后端 `msg`。
- [ ] 后端不可用 → 降级为错误态（不白屏、不卡 loading）。
- [ ] 提交后到 admin 后台「CRM 线索公海」确认线索 + 管理员收到推送通知（端到端）。

## 5. 导航与布局（Header / Footer）

- [ ] Header sticky 滚动吸顶。
- [ ] Logo + 站名来自站点配置（缺失有兜底）。
- [ ] 固定 6 项导航全部可达，当前页无高亮亦可接受（确认是否需要高亮）。
- [ ] 后端动态单页：`link_type:"page"` → 导航项指向 `/p/:slug`；`link_type:"link"` → 外链 `target="_blank" rel` 打开。
- [ ] Footer：logo / 联系方式（电话/邮箱/地址） / ICP 备案（链接 `beian.miit.gov.cn`） / 公安备案（链接配置 URL 或 `mps.gov.cn`） / 版权年份。
- [ ] Footer 在站点配置缺失时展示静态常量兜底，不报错。

## 6. SEO / GEO（机器可读输出）

### 6.1 metadata 与结构化数据
- [ ] 根 `layout.tsx` 的 `<title>` / `<meta description>` / `<meta keywords>` / Open Graph / canonical 来自站点配置。
- [ ] 首页含 Organization JSON-LD。
- [ ] `/products/:id` 含 Product JSON-LD（名称/价格/图片）。
- [ ] `/news/:slug` 含 Article JSON-LD（标题/日期/作者）。
- [ ] 用 [Schema Markup Validator](https://validator.schema.org/) 校验上述 JSON-LD 无解析错误。

### 6.2 HTML ↔ Markdown alternate（GEO）
- [ ] `/products` `<link rel="alternate" type="text/markdown" href="/md/products">`。
- [ ] `/products/:id` alternate → `/md/products/:id`。
- [ ] `/news` alternate → `/md/news`；`/news/:slug` alternate → `/md/news/:slug`。
- [ ] `/partners` → `/md/partners`；`/team` → `/md/team`；`/about` → `/md/about`。

### 6.3 Markdown / llms.txt 路由（`Content-Type: text/markdown`）
- [ ] `GET /md` → 板块索引（列出全部 md 链接）。
- [ ] `GET /md/products` → 产品表格 + 详情链接（拉 200 条）。
- [ ] `GET /md/products/:id` → 单产品 MD（含价格表 frontmatter）；不存在 → 404。
- [ ] `GET /md/news`、`/md/news/:slug`、`/md/partners`、`/md/team`、`/md/about` 各自内容正确。
- [ ] `GET /llms.txt` → llms.txt 标准站点总览。
- [ ] `GET /llms-full.txt` → 全站合集（含所有产品详情），`Cache-Control` 含 `maxAge`。
- [ ] 所有 md 响应头含 `X-Content-Type-Options: nosniff` 与 `s-maxage=300, stale-while-revalidate=600`。

### 6.4 爬虫文件
- [ ] `/robots.txt`（`src/app/robots.ts`）允许全站、指向 sitemap。
- [ ] `/sitemap.xml`（`src/app/sitemap.ts`）含静态页 + 动态产品/文章 + md 入口链接，`lastmod` 合理。
- [ ] `public/ByteDanceVerify.html` 可访问（字节站点验证 token 正确）。

## 7. 响应式与移动端

- [ ] 桌面（≥1024px）：各页面布局正常，卡片网格列数合理。
- [ ] 平板（768–1024px）：布局自适应，无横向溢出。
- [ ] 移动端（≤375px）：
  - [ ] **Header 导航无汉堡菜单**（现状），确认 nav 在窄屏是否溢出/换行/遮挡——记录为已知缺陷或回归基线（参考 `gui-test-screenshots/t8_mobile`）。
  - [ ] 卡片单列，文字不溢出。
  - [ ] 联系表单字段全宽可填可提交。
  - [ ] Footer 多列在窄屏堆叠为单列。
- [ ] 所有页面无横向滚动条（除代码块/宽表格的预期滚动）。

## 8. 边界与容错

- [ ] **404 行为差异**已分别验证（§2.8 vs §2.9）：详情页走全局 404，`/p/:slug` 走内联文案。
- [ ] 产品/文章列表为空 → `EmptyState`，非报错。
- [ ] Markdown 内容含 GFM（表格/任务列表/删除线/代码块）→ 渲染正确，无原始 `***`/`|` 泄漏。
- [ ] 超长标题/简介 → 文本截断或不破坏布局。
- [ ] 产品主图 / 文章封面缺失 → 降级占位（分类渐变块 / 头像 SVG），无破图图标。
- [ ] 后端返回 HTML 错误页（非 JSON）→ `request()` 解析失败被 `.catch` 兜住，不白屏。
- [ ] 邮箱/电话等含特殊字符的留言 → 提交与存储正常。

## 9. 数据时效性（缓存行为）

- [ ] fetch 层 `cache:"no-store"`：后台改产品/文章后，刷新页面（绕过 CDN）应立即反映。
- [ ] 页面层 `revalidate=300`：ISR 缓存最长 5 分钟（生产经 CDN/边缘可能有额外延迟，见 memory `cms-homepage-config-isr-delay`）。
- [ ] md 路由 `s-maxage=300`：5 分钟内复用，之后 stale-while-revalidate。
- [ ] 后台改站点配置（站名/Logo/Hero/备案）后，Header/Footer/首页在缓存窗口内或刷新后更新。

## 10. 已知缺陷 / 反向验证点（记录现状，勿误判为新 bug）

- [ ] **无搜索框**：`api.ts` 支持 `keyword`/`category`/`industry`，但页面 UI 未接入。
- [ ] **无分页 UI**：列表页一次性拉 24/48 条。
- [ ] **无分类/行业筛选 UI**。
- [ ] **无暗色模式 / 主题切换**（Tailwind 无 `darkMode`）。
- [ ] **无移动端汉堡菜单**（Header nav 可能溢出）。
- [ ] **无登录/鉴权**（全站公开）。
- [ ] 死代码（不影响功能）：`getCategories()`、`getPublicConfig()` 在 `api.ts` 定义但未被调用。

## 11. 回归用例（建议截图存档）

复用 `gui-test-screenshots/` 命名约定，每次回归重录对比：

- [ ] `t1_home` 首页（含三大板块 + 新闻）
- [ ] `t2_products` 产品列表 / 详情
- [ ] `t3_news` 新闻列表 / 详情
- [ ] `t4_partners` 合作伙伴
- [ ] `t5_team` 团队
- [ ] `t6_contact` 联系表单（含成功态）
- [ ] `t7_404` 404 页（含 `/p/:slug` 内联文案）
- [ ] `t8_mobile` 移动端首页（含 Header nav 现状）
- [ ] `t9_md` `/md` + `/llms.txt` + `/llms-full.txt` 内容
- [ ] `t10_seo` sitemap.xml / robots.txt / JSON-LD 校验截图

---

## 附：公开后端端点速查

| 端点 | 方法 | 用途 |
| --- | --- | --- |
| `/crm/public/products` | GET | 产品列表 |
| `/crm/public/products/:id` | GET | 产品详情 |
| `/crm/public/partners` | GET | 合作方列表 |
| `/system/public/team` | GET | 团队列表 |
| `/cms/public/articles` | GET | 文章列表 |
| `/cms/public/articles/slug/:slug` | GET | 文章详情（by slug） |
| `/cms/public/pages` | GET | 单页列表（导航） |
| `/cms/public/pages/:slug` | GET | 单条单页 |
| `/system/public/homepage-config` | GET | 首页板块配置 |
| `/system/site-config` | GET | 站点配置 |
| `/crm/public/contact` | POST | 留言 → CRM 线索 |

> 排障提示：所有公开端点经 `request()` 要求返回 `{code,msg,data}` 且 `code===0`；任一缺失/错误都会触发降级。生产端点探测请走 `https://admin.devlovecode.com/prod-api/...`（官网主域 `devlovecode.com` 的 `/prod-api` **不**转发到后端）。
