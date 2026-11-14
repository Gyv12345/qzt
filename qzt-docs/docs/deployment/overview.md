---
sidebar_label: 部署概述
sidebar_position: 1
---

# 部署概述

行简平台采用**前后端分离 + 多端独立部署**的架构。生产环境部署在一台云服务器上：后端以 systemd 托管 Go 二进制（端口 9000，唯一数据源），其余站点全部为**纯静态产物由 nginx 直接 serve**——管理后台、官网、跨境独立站、商城、移动端、文档站。全部域名走同一张 Let's Encrypt 通配符 HTTPS 证书。

## 服务清单

| 服务 | 域名 | 形态 | 部署方式 |
|------|------|------|---------|
| **server** | （经各域 `/prod-api` 反代） | Go 二进制，监听 9000 | 本地交叉编译 → scp → systemd |
| **admin** | admin.你的域名 | 纯静态 dist | 本地 `pnpm build` → rsync |
| **cms（官网 + 跨境双主题）** | 你的域名 / storefront.你的域名 | Next.js 静态导出 | 服务器侧一键重建脚本 |
| **storefront 前台** | storefront.你的域名 | 同 cms 双主题的跨境路由 | 同上（target=storefront） |
| **mall** | mall.你的域名 | 纯静态 dist | 本地 `pnpm build` → rsync |
| **mobile** | m.你的域名 | 纯静态 dist | 本地 `pnpm build` → rsync |
| **docs** | docs.你的域名 | Docusaurus 静态 build | 本地 `npm run build` → rsync |
| **desktop / iOS / Android** | ——（装在用户终端） | 原生客户端 | 本地打包分发，服务器零新增负担 |

:::info pm2 已下线
官网与独立站为 **Next.js 静态导出**（构建期预渲染，SEO 能力不降），由 nginx 直接 serve 纯静态产物。服务器侧不再有任何常驻 Node 进程，pm2 已全部下线。
:::

## 服务架构

```
                    ┌──────────────────────────────────────────┐
                    │            你的服务器                     │
                    │                                          │
   用户 ──── 443 ──▶│  Nginx (SSL 终止 + 静态 serve + 反代)     │
                    │   ├─ admin 域名  ──────▶ /opt/qzt-admin/（静态）
                    │   ├─ 主域名      ──────▶ /opt/qzt-cms-static/（静态）
                    │   ├─ storefront  ──────▶ /opt/qzt-storefront-static/（静态）
                    │   ├─ mall 域名   ──────▶ /opt/qzt-mall/（静态）
                    │   ├─ m 域名      ──────▶ /opt/qzt-mobile/（静态）
                    │   ├─ docs 域名   ──────▶ /opt/qzt-docs/（静态）
                    │   └─ /prod-api/* ──────▶ qzt-server :9000（systemd）
                    │            （另挂 /mcp：MCP Server，API Key 认证）
                    │                                          │
                    │  redis-server :6379（本机）              │
                    └──────────────────────────────────────────┘
                                     │ TCP 3306
                                     ▼
                              阿里云 RDS MySQL
```

要点：

- **前端统一走 `/prod-api` 前缀**：各静态站点的 API 请求统一带 `/prod-api`，由 nginx 反代到 9000 并剥掉前缀；后端模块路由（`/system/*`、`/crm/*` 等）与页面路由天然不冲突；
- **MCP**：后端同进程挂载 `/mcp`（Streamable HTTP），供 AI 客户端经 API Key 调用全部业务工具；
- **文件存储**：图片/附件走可配置存储（local / 阿里云 OSS / S3 兼容），公共素材经 CDN 域名访问。

## server（后端 API）

- **技术栈**：Go 编译为单一二进制；端口 9000，由 nginx 反向代理转发；
- **进程管理**：systemd 托管，开机自启、崩溃自动重启；
- **部署方式**：本地 `make build-prod` 交叉编译 linux/amd64（自带版本 ldflags）→ scp 上传 → systemd 重启；
- 详见 [后端部署](/deployment/server)。

## admin / mall / mobile / docs（纯静态）

- 本地构建出静态产物（admin/mobile/mall 为 `dist/`，docs 为 `build/`）；
- rsync 同步到服务器对应目录，nginx 直接 serve，无需任何进程管理；
- 部署即生效，回滚即重新 rsync 旧产物。

## cms / storefront（静态站 + 一键发布）

- 源码常驻服务器 `/opt/qzt-cms/`、`/opt/qzt-storefront/`；
- 发布路径：**Admin 后台「站点信息」页「静态站发布」按钮** → `POST /deploy/static` → 服务器执行 `rebuild_static.sh`（npm install → next build 静态导出 → rsync 到 `/opt/qzt-cms-static/`、`/opt/qzt-storefront-static/`）→ nginx 即刻 serve 新产物；
- 同一时刻仅允许一个重建任务（单飞互斥），进度与日志经 `GET /deploy/status` 轮询；
- 详见 [静态站发布](/modules/deploy)。

## SSL 证书

一张 **Let's Encrypt 通配符证书**覆盖主域名及其全部子域名（`*.你的域名`）：新增子域名无需重新签发；通过 DNS-01 验证签发，定时自动续期。

## 部署流程总览

| 服务 | 本地操作 | 服务器操作 | 生效方式 |
|------|---------|-----------|---------|
| **server** | `make build-prod` | scp 上传 + systemd 重启 | systemd 重启即生效 |
| **admin / mobile / mall** | `pnpm build` | rsync dist | 即时（nginx 读静态文件） |
| **docs** | `npm run build` | rsync build | 即时 |
| **cms / storefront** | Admin 后台点按钮 | `rebuild_static.sh` 自动执行 | 构建完成即生效 |

具体命令与详细步骤见各服务部署文档。
