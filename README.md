# qzt 工作区

企智通——企业级业务管理平台（CRM / 进销存 / 财务 / HRM / OA / 审批 / 官网 / 商城），单仓多项目。

**本仓库是单一 git 仓库**：根目录即 git 根，所有子项目都在这一个仓库里（子目录无独立 `.git`）。git 操作在根目录进行；`make` / `pnpm` / `npm` 等构建命令需 `cd` 到对应子项目执行。

## 架构总览

```
                    ┌──────────────┐
                    │ qzt-go-server │  唯一数据源（Go + Gin + GORM + Casbin + Redis，:9000）
                    └──────┬───────┘
        ┌──────────┬────────┼──────────┬──────────┬─────────┐
        │          │        │          │          │         │
   qzt-go-admin  cms   qzt-go-mobile  qzt-go-mall qzt-ios qzt-android
   （后台 SPA） （官网）  （员工 H5）  （公开商城）（原生 iOS）（原生 Android）
```

所有前端消费方统一走 `/prod-api` 前缀访问后端 API，响应统一信封 `{code, msg, data, timestamp}`（`code === 0` 为成功）。

## 子项目

| 子项目 | 角色 | 技术栈 | 本地端口 | 包管理 | 文档 |
| --- | --- | --- | --- | --- | --- |
| `qzt-go-server/` | 后端 API（全平台唯一数据源） | Go 1.25 + Gin + GORM + Casbin + Redis | 9000 | go mod | [README](qzt-go-server/README.md) · [AGENTS.md](qzt-go-server/AGENTS.md) |
| `qzt-go-admin/` | 后台管理 SPA | Vite 7 + React 19 + antd 5 / ProComponents + Zustand | 5173 | pnpm | [README](qzt-go-admin/README.md) · [CLAUDE.md](qzt-go-admin/CLAUDE.md) |
| `qzt-go-cms/` | 企业官网（公开站） | Next.js 15 (App Router) + React 19 + Tailwind 3 | 3000 | npm | [README](qzt-go-cms/README.md) |
| `qzt-go-mobile/` | 移动端 H5（员工端） | Vite 7 + React 19 + antd-mobile + Zustand | 5174 | pnpm | [README](qzt-go-mobile/README.md) |
| `qzt-go-mall/` | 独立公开商城站（免登录） | Vite 7 + React 19 + antd-mobile + Zustand | 5175 | pnpm | [README](qzt-go-mall/README.md) |
| `qzt-ios/` | iOS 原生 App（SwiftUI） | SwiftUI + @Observable，iOS 17+ | — | Xcode | [README](qzt-ios/README.md) |
| `qzt-android/` | Android 原生 App（Kotlin + Compose） | Kotlin 2.0 + Compose + Navigation | — | Gradle wrapper | [README](qzt-android/README.md) |
| `qzt-docs/` | 文档站 | Docusaurus 3 + MDX | 3000 | npm | [README](qzt-docs/README.md) |

移动端（qzt-go-mobile）没有独立指南文件，关键约定见 [AGENTS.md](AGENTS.md)「移动端关键约定」一节。

## 快速开始

```bash
# 1. 启动后端（qzt-go-server/，依赖 .env 与 config/config.dev.yaml，建表/种子走 docs/sql/）
cd qzt-go-server && make run

# 2. 启动任意前端（各开一个终端）
cd qzt-go-admin  && pnpm install && pnpm dev   # :5173
cd qzt-go-mobile && pnpm install && pnpm dev   # :5174
cd qzt-go-mall   && pnpm install && pnpm dev   # :5175
cd qzt-go-cms    && npm install && npm run dev # :3000
```

后端端口固定 **9000**（8000 被本机占用，勿改回）。种子默认管理员 `admin / admin123`。

## 关键约定（速览）

- **建表与种子数据一律走 SQL**（`qzt-go-server/docs/sql/`），Go 代码不 AutoMigrate、不写种子。
- **前端 API 统一 `/prod-api` 单前缀**：请求层 baseURL 带 `/prod-api`，Vite proxy 转发到 `localhost:9000` 并 rewrite 掉前缀；页面路由与后端 API 路径天然不冲突，新增业务模块无需改 vite 配置。
- **后端模块 URL 前缀由模块 `Name()` 决定**：在 `cmd/server/main.go` 注册 `server.Module` 即自动挂 `/<name>`。
- **admin 路由由后端菜单树驱动**：页面文件路径必须与 `sys_menu.component` 对应。
- **私有化部署约束**：任何域名 / 地址不写死在代码里，一律走配置（`sys_site_config` / `.env` / 服务器地址可配置）。
- 敏感配置只放 gitignored 的 `.env`，不入库。

完整工作区指南见 [AGENTS.md](AGENTS.md)；生产部署流程（编译 / rsync / systemd / pm2 / nginx）也以 AGENTS.md 为准。

## 版本与发布

全平台统一**三段式语义化版本** `MAJOR.MINOR.PATCH`，当前版本 **v1.0.0**（2026-08-27 首次定版）。

- **主版本 +1**：破坏性变更（表结构不兼容、API 移除）；**次版本 +1**：每次对外发布新功能（即一次部署）；**修订号 +1**：纯缺陷修复。
- **发版流程**：提交后打 tag（`git tag vX.Y.Z && git push --tags`）→ 后端 `qzt-go-server/` 下 `make build` 自动把 tag 注入二进制（未打 tag 时显示 `最近tag+N-g<hash>` 形式），交叉编译用 `make build-prod`；各前端项目 `package.json` 的 `version` 同步改为 `X.Y.Z`。
- **查看运行版本**：接口 `GET /system/version`（免鉴权，返回版本号/Git 提交/构建时间/Go 版本）、命令行 `./qzt-server -version`、admin 右上角头像菜单「关于系统」弹窗。

## 版权与商业服务

**© 2026 河南爱编程网络科技有限公司** · 本项目以 [MIT 协议](LICENSE) 开源。

| 场景 | 费用 |
| --- | --- |
| 自己部署 / 使用 / 修改 | **免费**（MIT 授权，随意使用） |
| 官方部署服务（由我们代为部署上线） | **500 元 / 次** |
| 二次开发 / 定制需求 | 面谈 |

商务联系：[官网联系表单](https://devlovecode.com/contact)

