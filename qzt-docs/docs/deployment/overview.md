---
sidebar_label: 部署概述
sidebar_position: 1
---

# 部署概述

企智通平台采用**前后端分离 + 多端独立部署**的架构，生产环境部署在一台云服务器上，通过 Nginx 反向代理与端口转发将四个服务（后端 API、Admin 后台、CMS 官网、Mobile 移动端）统一对外提供，对外域名均通过 Let's Encrypt 通配符证书启用 HTTPS。

## 生产服务器

| 项 | 值 |
|----|----|
| 服务器 IP | `你的服务器IP` |
| 主域名 | `你的域名` |
| 操作系统 | Linux（amd64） |
| SSL 证书 | Let's Encrypt 通配符证书（`*.你的域名`） |

## 四个服务

平台共部署四个独立服务，各服务职责清晰、独立部署、独立重启：

| 服务 | 域名 | 端口 | 技术栈 | 部署方式 |
|------|------|------|--------|---------|
| **server** | api.你的域名（或直接 IP） | 9000 | Go | 二进制 + systemd |
| **admin** | admin.你的域名 | 443（Nginx） | React + Vite | 静态文件 + Nginx |
| **cms** | 你的域名 | 3000（PM2） | Next.js | Node.js + PM2 |
| **mobile** | m.你的域名 | 443（Nginx） | React + Vite | 静态文件 + Nginx |

### 服务架构图

```
                    ┌─────────────────────────────────┐
                    │      你的服务器IP              │
                    │      你的域名            │
                    │                                 │
   用户 ──── 443 ──▶│  Nginx (反向代理 + SSL 终止)     │
                    │   │   │   │   │                 │
                    │   │   │   │   └─ /m/* ─────────▶ Mobile (静态) /opt/qzt-mobile
                    │   │   │   └───── /   ─────────▶ CMS (Next.js) :3000 (PM2)
                    │   │   └────────── /admin/* ───▶ Admin (静态) /opt/qzt-admin
                    │   └───────────── /api/* ──────▶ Server (Go) :9000 (systemd)
                    │                                 │
                    └─────────────────────────────────┘
```

### server（后端 API）

- **技术栈**：Go 语言编写，编译为单一二进制；
- **端口**：9000，仅监听本机或内网，由 Nginx 反向代理 `/api/*` 转发；
- **进程管理**：通过 systemd 托管，开机自启、崩溃自动重启；
- **配置**：通过配置文件与环境变量管理数据库、Redis、OSS 等；
- **部署方式**：本地交叉编译为 Linux amd64 二进制，scp 上传后 systemd 重启；
- 详见 [后端部署](./server)。

### admin（管理后台）

- **技术栈**：React + Vite + Ant Design，编译为纯静态文件（HTML/CSS/JS）；
- **域名**：`admin.你的域名`；
- **端口**：由 Nginx 直接提供 443（HTTPS）服务；
- **静态目录**：`/opt/qzt-admin/`；
- **部署方式**：本地 `pnpm build` 生成 dist，rsync 同步到服务器静态目录；
- **前端路由**：采用 History 模式，Nginx 配置 `try_files` 兜底到 index.html；
- 详见 [Admin 部署](./admin)。

### cms（企业官网）

- **技术栈**：Next.js（React SSR），需要 Node.js 运行时；
- **域名**：`你的域名`（主域名）；
- **端口**：3000，由 Nginx 反向代理转发；
- **进程管理**：通过 PM2 托管，保持 Node 进程常驻；
- **部署方式**：rsync 同步源码到服务器，在服务器执行 `npm install` + `next build`，PM2 重启；
- **为何不打包静态**：官网需要 SSR（服务端渲染）以保证 SEO，必须以 Node 进程运行；
- 详见 [CMS 部署](./cms)。

### mobile（移动端）

- **技术栈**：React + Vite，编译为纯静态文件；
- **域名**：`m.你的域名`；
- **端口**：由 Nginx 直接提供 443（HTTPS）服务；
- **静态目录**：`/opt/qzt-mobile/`；
- **部署方式**：本地 `pnpm build` 生成 dist，rsync 同步到服务器静态目录；
- 与 admin 部署方式一致，区别在于静态目录与域名不同；
- 详见 [Mobile 部署](./mobile)。

## SSL 证书

生产环境使用 **Let's Encrypt 通配符证书**，一张证书覆盖 `你的域名` 及其所有子域名（`*.你的域名`）：

| 域名 | 证书覆盖 | 用途 |
|------|---------|------|
| `你的域名` | ✓ | CMS 官网 |
| `admin.你的域名` | ✓ | Admin 后台 |
| `m.你的域名` | ✓ | Mobile 移动端 |
| `api.你的域名` | ✓ | 后端 API（可选） |

通配符证书的优势：

- 一张证书覆盖所有子域名，无需逐个申请；
- 新增子域名无需重新签发证书；
- 通过 DNS-01 验证方式签发，不依赖 80 端口可用性；
- 通过 certbot + cron 定时自动续期（证书有效期 90 天）。

## Nginx 配置要点

Nginx 作为统一入口，承担三个职责：SSL 终止、反向代理、静态文件服务。

```nginx
# SSL 终止 + 反向代理示例
server {
    listen 443 ssl http2;
    server_name 你的域名;

    ssl_certificate     /etc/letsencrypt/live/你的域名/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名/privkey.pem;

    # CMS 官网 (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.你的域名;

    ssl_certificate     /etc/letsencrypt/live/你的域名/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名/privkey.pem;

    # Admin 后台 (静态文件)
    root /opt/qzt-admin;
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 443 ssl http2;
    server_name m.你的域名;

    ssl_certificate     /etc/letsencrypt/live/你的域名/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名/privkey.pem;

    # Mobile (静态文件)
    root /opt/qzt-mobile;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

:::note 配置示例
以上为简化配置示例，实际生产环境还需配置 HTTP/80 强制跳转 HTTPS、Gzip 压缩、缓存策略、安全头（HSTS、X-Frame-Options）等。
:::

## 部署流程总览

各服务的部署流程对照如下：

| 服务 | 本地操作 | 服务器操作 | 重启方式 |
|------|---------|-----------|---------|
| **server** | 交叉编译二进制 | scp 上传 | `systemctl restart qzt-server` |
| **admin** | `pnpm build` | rsync dist | 无需重启（Nginx 直接读静态文件） |
| **cms** | rsync 源码 | `npm install` + `next build` | `pm2 restart qzt-cms` |
| **mobile** | `pnpm build` | rsync dist | 无需重启 |

具体命令与详细步骤见各服务部署文档。
