---
sidebar_label: Admin 部署
sidebar_position: 3
---

# Admin 后台部署

Admin 后台采用 React + Vite + Ant Design 技术栈，构建产物为纯静态文件（HTML / CSS / JS），部署到服务器的 `/opt/qzt-admin/` 目录，由 Nginx 直接提供 HTTPS 静态服务。无需 Node.js 运行时，无需进程管理，部署简单、性能优异。

## 部署架构

```
┌──────────────────┐   pnpm build  ┌──────────────────┐   rsync 同步  ┌──────────────────┐
│  本地开发机       │ ────────────▶ │  本地 dist 目录  │ ────────────▶│  服务器           │
│  Admin 源码       │              │  静态文件         │              │  /opt/qzt-admin/  │
└──────────────────┘              └──────────────────┘              └────────┬─────────┘
                                                                            │
                                                                            │ Nginx 直接提供
                                                                            ▼
                                                                   ┌──────────────────┐
                                                                   │  admin.devlove   │
                                                                   │  code.com:443    │
                                                                   └──────────────────┘
```

## 服务信息

| 项 | 值 |
|----|----|
| 域名 | `admin.你的域名` |
| 端口 | 443（Nginx HTTPS） |
| 静态目录 | `/opt/qzt-admin/` |
| 技术栈 | React + Vite + Ant Design |
| 进程管理 | 无需（Nginx 直接服务静态文件） |

## 本地构建

### 环境要求

- Node.js 18+（推荐 20 LTS）
- pnpm（包管理器）

### 构建步骤

```bash
# 进入 admin 项目根目录
cd /path/to/qzt-admin

# 安装依赖（首次或依赖变更时）
pnpm install

# 生产构建
pnpm build
```

构建完成后，产物位于 `dist/` 目录：

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

:::tip 环境变量
构建前确认环境变量配置正确，尤其是后端 API 地址。通常通过 `.env.production` 文件配置：
```
VITE_API_BASE_URL=https://api.你的域名
```
:::

## 同步到服务器

使用 rsync 将 dist 目录同步到服务器静态目录：

```bash
# rsync 同步（删除旧文件，保持目录一致）
rsync -avz --delete dist/ user@你的服务器IP:/opt/qzt-admin/
```

### rsync 参数说明

| 参数 | 说明 |
|------|------|
| `-a` | 归档模式，保留权限、时间戳等 |
| `-v` | 详细输出 |
| `-z` | 传输时压缩 |
| `--delete` | 删除目标目录中源目录已不存在的文件 |
| 末尾 `/` | `dist/` 的 `/` 表示同步目录内容而非目录本身 |

:::tip 为什么用 rsync 而非 scp
rsync 采用增量同步，只传输变化的文件，比 scp 全量传输快得多，尤其适合后续迭代部署。`--delete` 参数确保服务器上不会残留旧版本的静态资源（带 hash 的文件名会随构建变化）。
:::

## Nginx 配置

Admin 静态目录由 Nginx 直接服务，关键配置如下：

```nginx
server {
    listen 443 ssl http2;
    server_name admin.你的域名;

    ssl_certificate     /etc/letsencrypt/live/你的域名/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名/privkey.pem;

    root /opt/qzt-admin;
    index index.html;

    # SPA 前端路由兜底：所有未匹配的路径返回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存（带 hash 的文件名可长期缓存）
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

### SPA 路由兜底

Admin 采用 React Router 的 History 模式，刷新非根路径（如 `/system/user`）时，Nginx 必须将请求兜底到 `index.html`，否则会返回 404：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 静态资源缓存

Vite 构建的 JS/CSS 文件名带内容 hash（如 `index-a1b2c3.js`），内容变化时 hash 变化，因此可设置长期缓存，提升加载性能：

```nginx
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 部署后验证

```bash
# 检查静态目录
ssh user@你的服务器IP ls /opt/qzt-admin/

# 检查页面可访问
curl -I https://admin.你的域名

# 浏览器访问
# https://admin.你的域名
```

由于是纯静态部署，rsync 同步完成后立即生效，无需重启任何服务。

## 一键部署脚本

```bash
#!/bin/bash
# deploy-admin.sh
set -e

SERVER=user@你的服务器IP
REMOTE_PATH=/opt/qzt-admin/

echo "==> 安装依赖..."
pnpm install

echo "==> 生产构建..."
pnpm build

echo "==> 同步到服务器..."
rsync -avz --delete dist/ $SERVER:$REMOTE_PATH

echo "==> 部署完成：https://admin.你的域名"
```

## 回滚

Admin 的回滚依赖版本控制或备份：

```bash
# 方式一：重新构建上一个 git commit
git checkout HEAD~1
pnpm build
rsync -avz --delete dist/ user@你的服务器IP:/opt/qzt-admin/

# 方式二：部署前备份当前版本（推荐）
# 部署前在服务器备份
ssh user@你的服务器IP "cp -r /opt/qzt-admin /opt/qzt-admin.bak.$(date +%Y%m%d%H%M%S)"
```
