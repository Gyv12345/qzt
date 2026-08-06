---
sidebar_label: Mobile 部署
sidebar_position: 5
---

# Mobile 移动端部署

Mobile 移动端采用 React + Vite 技术栈，构建产物为纯静态文件，部署到服务器的 `/opt/qzt-mobile/` 目录，由 Nginx 直接提供 HTTPS 静态服务。部署方式与 Admin 后台完全一致，区别仅在于静态目录与域名不同。

## 部署架构

```
┌──────────────────┐   pnpm build  ┌──────────────────┐   rsync 同步  ┌──────────────────┐
│  本地开发机       │ ────────────▶ │  本地 dist 目录  │ ────────────▶│  服务器           │
│  Mobile 源码      │              │  静态文件         │              │  /opt/qzt-mobile/ │
└──────────────────┘              └──────────────────┘              └────────┬─────────┘
                                                                            │
                                                                            │ Nginx 直接提供
                                                                            ▼
                                                                   ┌──────────────────┐
                                                                   │  m.devlove       │
                                                                   │  code.com:443    │
                                                                   └──────────────────┘
```

## 服务信息

| 项 | 值 |
|----|----|
| 域名 | `m.你的域名` |
| 端口 | 443（Nginx HTTPS） |
| 静态目录 | `/opt/qzt-mobile/` |
| 技术栈 | React + Vite |
| 进程管理 | 无需（Nginx 直接服务静态文件） |

## 本地构建

### 环境要求

- Node.js 18+（推荐 20 LTS）
- pnpm（包管理器）

### 构建步骤

```bash
# 进入 mobile 项目根目录
cd /path/to/qzt-mobile

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

:::tip 移动端适配
构建前确认移动端适配配置正确，包括 viewport、rem/vw 适配方案、移动端 UI 组件库（如 Ant Design Mobile）等。环境变量（如 API 地址）通过 `.env.production` 配置：
```
VITE_API_BASE_URL=https://api.你的域名
```
:::

## 同步到服务器

使用 rsync 将 dist 目录同步到服务器静态目录：

```bash
# rsync 同步（删除旧文件，保持目录一致）
rsync -avz --delete dist/ user@你的服务器IP:/opt/qzt-mobile/
```

### rsync 参数说明

| 参数 | 说明 |
|------|------|
| `-a` | 归档模式，保留权限、时间戳等 |
| `-v` | 详细输出 |
| `-z` | 传输时压缩 |
| `--delete` | 删除目标目录中源目录已不存在的文件 |
| 末尾 `/` | `dist/` 的 `/` 表示同步目录内容而非目录本身 |

:::tip 与 Admin 共用部署模式
Mobile 与 Admin 的部署方式完全相同，仅静态目录（`/opt/qzt-mobile/` vs `/opt/qzt-admin/`）与域名（`m.你的域名` vs `admin.你的域名`）不同。可复用同一套部署脚本，通过变量区分。
:::

## Nginx 配置

Mobile 静态目录由 Nginx 直接服务，关键配置如下：

```nginx
server {
    listen 443 ssl http2;
    server_name m.你的域名;

    ssl_certificate     /etc/letsencrypt/live/你的域名/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名/privkey.pem;

    root /opt/qzt-mobile;
    index index.html;

    # SPA 前端路由兜底
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
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

Mobile 采用 React Router 的 History 模式，刷新非根路径时需要 Nginx 兜底到 `index.html`：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 静态资源缓存

Vite 构建的 JS/CSS 文件名带内容 hash，可设置长期缓存：

```nginx
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 部署后验证

```bash
# 检查静态目录
ssh user@你的服务器IP ls /opt/qzt-mobile/

# 检查页面可访问
curl -I https://m.你的域名

# 浏览器或手机访问
# https://m.你的域名
```

由于是纯静态部署，rsync 同步完成后立即生效，无需重启任何服务。

## 一键部署脚本

```bash
#!/bin/bash
# deploy-mobile.sh
set -e

SERVER=user@你的服务器IP
REMOTE_PATH=/opt/qzt-mobile/

echo "==> 安装依赖..."
pnpm install

echo "==> 生产构建..."
pnpm build

echo "==> 同步到服务器..."
rsync -avz --delete dist/ $SERVER:$REMOTE_PATH

echo "==> 部署完成：https://m.你的域名"
```

## 通用前后端部署脚本（Admin + Mobile 合并）

由于 Admin 与 Mobile 部署方式一致，可整合为一个通用脚本：

```bash
#!/bin/bash
# deploy-static.sh <app-name>
# 用法: ./deploy-static.sh admin  或  ./deploy-static.sh mobile
set -e

APP=$1
SERVER=user@你的服务器IP

case $APP in
  admin)  REMOTE_PATH=/opt/qzt-admin/  ;;
  mobile) REMOTE_PATH=/opt/qzt-mobile/ ;;
  *) echo "Usage: $0 <admin|mobile>"; exit 1 ;;
esac

echo "==> 构建 $APP..."
pnpm install
pnpm build

echo "==> 同步到 $REMOTE_PATH..."
rsync -avz --delete dist/ $SERVER:$REMOTE_PATH

echo "==> 部署完成"
```

## 回滚

```bash
# 方式一：重新构建上一个 git commit
git checkout HEAD~1
pnpm build
rsync -avz --delete dist/ user@你的服务器IP:/opt/qzt-mobile/

# 方式二：部署前备份当前版本
ssh user@你的服务器IP "cp -r /opt/qzt-mobile /opt/qzt-mobile.bak.$(date +%Y%m%d%H%M%S)"
```
