---
sidebar_position: 3
sidebar_label: 技术栈
---

# 技术栈

行简精选现代化、生产验证过的技术栈，兼顾开发效率、运行性能与长期可维护性。

## 后端

后端 `qzt-go-server` 采用 Go 语言，追求**编译即部署、单二进制、低资源占用**。

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 语言 | **Go 1.25** | 最新稳定版，泛型、性能与生态完备 |
| Web 框架 | **Gin** | 高性能 HTTP 框架，中间件生态丰富 |
| ORM | **GORM** | 支持 MySQL / PostgreSQL / SQLite，软删除、钩子、预加载 |
| 权限 | **Casbin** | RBAC / ABAC 策略引擎，支撑角色、菜单、API、数据权限 |
| 缓存 | **Redis** | 会话、令牌、热点数据缓存、分布式锁 |
| 数据库 | **MySQL 8** | 主存储，utf8mb4 字符集，支持 JSON 字段 |
| 对象存储 | **本地 / 阿里云 OSS / S3 兼容** | 文件三驱动可配置（S3 兼容走 minio-go，适配七牛 / MinIO / RustFS / COS），管理端热切换 |
| 配置 | Viper | 多源配置（文件 / 环境变量），热更新 |
| 日志 | Zap | 结构化日志，分级输出 |
| 认证 | JWT | 双令牌（access + refresh） |
| 文档 | OpenAPI / Swagger | 自动生成接口文档 |

## 前端（admin · 管理后台）

面向企业内部用户的后台管理系统，强调表单密集型 CRUD 的开发效率。

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | **React 19** | 最新版，并发特性、Actions |
| 语言 | **TypeScript 5** | 全量类型覆盖 |
| 构建 | **Vite 7** | 极速冷启动与 HMR |
| UI 库 | **antd 5** | 企业级组件库 |
| 高级组件 | **ProComponents** | ProTable / ProForm / ProLayout，开箱即用 CRUD |
| 状态管理 | **Zustand** | 轻量、无样板代码 |
| 请求库 | **axios** | 封装统一拦截、自动解包、刷新令牌 |
| 图表 | **ECharts** | 数据可视化 |
| 路由 | React Router v6 | 动态路由，菜单驱动 |
| 样式 | CSS Modules + Less | 配合 antd 主题定制 |

## 前端（cms · 内容站点）

面向公众的内容门户，追求 SEO、性能与首屏速度。

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | **Next.js 15** | App Router、RSC、Streaming |
| 语言 | **React 19 + TypeScript** | 同 admin |
| 样式 | **Tailwind CSS** | 原子化 CSS，设计系统一致 |
| 渲染 | **ISR（增量静态再生）** | 兼顾性能与时效 |
| SEO | Metadata API、JSON-LD、sitemap.xml | 结构化数据、OG 协议 |
| 部署 | **静态导出（output: export）** | nginx 纯静态托管，双域名同根发布；SEO 靠构建期预渲染 |
| GEO | llms.txt / Markdown 镜像 / AI 爬虫放行 | 面向生成式引擎的内容优化 |
| 国际化 | 双主题路由 `(main)` + `(cross)/[locale]` | 中文官网与跨境独立站（en/zh）单代码库共存 |

## 前端（mall · 独立商城）

免登录公开商城，与移动端同栈。

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | **React 19 + Vite 7** | 与 mobile 同栈 |
| UI 库 | **antd-mobile 5** | 移动端购物体验 |
| 端口 | Vite dev 5175 | 商品复用 CRM 产品库，下单直通 PSI |

## 前端（mobile · 移动端）

面向外勤销售、移动办公的 移动端应用，可嵌入企业微信 / 钉钉。

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | **React 19** | 同 admin 技术栈 |
| 构建 | **Vite 7** | 移动端 HMR |
| UI 库 | **antd-mobile 5** | 移动端组件库 |
| 适配 | postcss-px-to-viewport | 响应式适配 |
| 交互 | Vant Touch | 手势、下拉刷新 |

## 桌面端（desktop · Tauri）

以原生窗口 + 系统托盘形态交付的桌面客户端，前端复用 admin 全部业务代码。

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 桌面壳 | **Tauri 2（Rust）** | 壳体积小、内存占用低，系统 WebView 渲染 |
| 前端 | React 19 + TS + antd 5 | 整体 fork 自 admin，业务零重写 |
| 构建 | Vite 7 + Cargo | `pnpm tauri build` 出 .app / .dmg |
| 端口 | Vite dev 5176 | 与 admin(5173) / mobile(5174) / mall(5175) 错开 |
| API 基址 | `VITE_API_BASE` 可配置 | 默认直连生产；联调走 Vite proxy |
| 首发平台 | macOS | Windows 打包与自动更新在路线图中 |

## 原生 App（iOS · Android）

与后台全模块对齐的移动原生客户端，复用同一套后端 API。

| 类别 | iOS | Android |
| --- | --- | --- |
| 语言 / UI | **Swift + SwiftUI**（@Observable） | **Kotlin + Jetpack Compose** |
| 网络 | URLSession + JWT | Retrofit 风格 + Gson |
| 覆盖 | 登录 / 工作台 / 消息 / 客户 / 审批 / 打卡等模块 | 与 iOS 全模块对齐 |
| 最低版本 | iOS 17+ | minSdk 26 |

## 基础设施

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 容器 | **Docker（可选）** | 标准化镜像，跨环境一致 |
| 编排 | **Docker Compose** | 一键拉起后端 + DB + 缓存 |
| 反向代理 | **nginx** | HTTPS 终止、静态资源、负载均衡 |
| 进程管理 | **systemd** | 后端守护进程、开机自启（静态前端由 nginx 直接 serve，无常驻 Node 进程） |
| HTTPS | **Let's Encrypt** | 自动签发与续期，acme.sh 工具链 |
| 监控 | 可选 Prometheus + Grafana | 指标采集与告警 |

## AI 能力

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 工具协议 | **MCP（Model Context Protocol）** | 全部业务功能以约 340 个 MCP 工具（16 个工具集）开放，Streamable HTTP 传输 |
| AI 客户端 | **Claude Desktop、Cursor、Cline、Continue** | 任一支持 MCP 的 AI 工具均可直连操作系统 |
| 认证 | **API Key（`qzt_` 前缀）** | 个人中心自助创建，按工具集裁剪开放范围 |
| 权限 | **Casbin RBAC** | MCP 工具调用与 HTTP 接口共享同一份操作级权限策略 |

## 版本要求速查

部署前请确认环境满足以下最低版本：

```
Go         >= 1.25
Node.js    >= 20
MySQL      >= 8.0
Redis      >= 6.0
```

详细的部署步骤请见[部署章节](/deployment/overview)。
