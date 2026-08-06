---
sidebar_position: 3
sidebar_label: 技术栈
---

# 技术栈

企智通精选现代化、生产验证过的技术栈，兼顾开发效率、运行性能与长期可维护性。

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
| 对象存储 | **Aliyun OSS** / 本地存储 | 文件、图片、附件；支持自定义域名 |
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
| 部署 | Node.js 服务或静态导出 | 灵活适配多种托管 |

## 前端（mobile · 移动端）

面向外勤销售、移动办公的 移动端应用，可嵌入企业微信 / 钉钉。

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | **React 19** | 同 admin 技术栈 |
| 构建 | **Vite 7** | 移动端 HMR |
| UI 库 | **antd-mobile 5** | 移动端组件库 |
| 适配 | postcss-px-to-viewport | 响应式适配 |
| 交互 | Vant Touch | 手势、下拉刷新 |

## 基础设施

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 容器 | **Docker（可选）** | 标准化镜像，跨环境一致 |
| 编排 | **Docker Compose** | 一键拉起后端 + DB + 缓存 |
| 反向代理 | **nginx** | HTTPS 终止、静态资源、负载均衡 |
| 进程管理 | **pm2 / systemd** | 守护进程、开机自启、日志轮转 |
| HTTPS | **Let's Encrypt** | 自动签发与续期，acme.sh 工具链 |
| 监控 | 可选 Prometheus + Grafana | 指标采集与告警 |

## AI 能力

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 模型接口 | **OpenAI 兼容协议** | 一套接口对接多家模型 |
| 支持模型 | **DeepSeek、通义千问、GPT、Claude** | 按场景选择 |
| 流式输出 | SSE | 实时打字机效果 |
| 向量检索 | 可选 pgvector / Milvus | RAG 知识库检索 |
| 工具协议 | **MCP（Model Context Protocol）** | 标准化 AI 工具调用，对接 Claude / Cursor |

## 版本要求速查

部署前请确认环境满足以下最低版本：

```
Go         >= 1.25
Node.js    >= 20
MySQL      >= 8.0
Redis      >= 6.0
```

详细的部署步骤请见[部署章节](../deployment/overview)。
