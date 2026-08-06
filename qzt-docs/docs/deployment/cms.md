---
sidebar_label: CMS 部署
sidebar_position: 4
---

# CMS 官网部署

CMS 官网采用 Next.js（React SSR）技术栈，由于需要服务端渲染（SSR）以支持 SEO，必须以 Node.js 进程运行，而非纯静态部署。部署流程为：rsync 同步源码到服务器 → 服务器执行 `npm install` + `next build` → PM2 重启 Node 进程。

## 部署架构

```
┌──────────────────┐   rsync 源码  ┌──────────────────┐   npm install  ┌──────────────────┐
│  本地开发机       │ ────────────▶ │  服务器源码目录   │ ────────────▶│  服务器构建        │
│  CMS 源码         │              │                  │   next build  │  .next 产物       │
└──────────────────┘              └──────────────────┘              └────────┬─────────┘
                                                                            │
                                                                            │ pm2 restart
                                                                            ▼
                                                                   ┌──────────────────┐
                                                                   │  PM2 托管         │
                                                                   │  监听 :3000      │
                                                                   │  Nginx 反向代理   │
                                                                   └──────────────────┘
```

## 服务信息

| 项 | 值 |
|----|----|
| 域名 | `你的域名` |
| 端口 | `3000`（PM2 Node 进程） |
| 技术栈 | Next.js（React SSR） |
| 进程管理 | PM2 |
| 源码目录 | `/opt/qzt-cms/` |
| 应用名 | `qzt-cms` |

:::info 为什么 CMS 不打静态包
Next.js 虽然支持 `next export` 导出纯静态，但官网使用了 SSR（服务端渲染）、API Routes、动态数据获取等能力，导出为纯静态会丢失这些功能。因此 CMS 必须以 Node.js 进程运行，通过 PM2 保持常驻，Nginx 反向代理转发请求。
:::

## 本地同步源码

与 Admin/Mobile 不同，CMS 部署的是**源码**而非构建产物，因为需要在服务器执行 `next build`（服务器环境与运行环境一致，避免环境差异）。

```bash
# 进入 CMS 项目根目录
cd /path/to/qzt-cms

# rsync 同步源码到服务器（排除 node_modules 和 .next）
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  ./ user@你的服务器IP:/opt/qzt-cms/
```

### 排除项说明

| 排除目录 | 原因 |
|---------|------|
| `node_modules` | 平台相关（macOS 与 Linux 二进制不兼容），需在服务器重新安装 |
| `.next` | 构建产物，需在服务器重新构建 |
| `.git` | 版本历史无需上传 |

## 服务器构建

源码同步后，在服务器执行依赖安装与构建：

```bash
# SSH 登录服务器
ssh user@你的服务器IP

# 进入源码目录
cd /opt/qzt-cms

# 安装依赖
npm install
# 或 npm ci（按 lockfile 精确安装，推荐生产环境）

# 构建
npm run build
# 即 next build，产物输出到 .next/ 目录
```

:::tip npm ci vs npm install
生产环境推荐使用 `npm ci`：它严格按 `package-lock.json` 安装，速度更快、结果可复现，不会修改 lockfile。前提是项目中有 `package-lock.json`。
:::

### 环境变量

构建前确认环境变量配置，Next.js 通过 `.env.production` 或环境变量读取：

```bash
# /opt/qzt-cms/.env.production
NEXT_PUBLIC_API_BASE_URL=https://api.你的域名
NEXT_PUBLIC_SITE_NAME=企智通
```

部分环境变量（非 `NEXT_PUBLIC_` 前缀）仅在服务端可用，不会暴露给浏览器。

## PM2 进程管理

CMS 通过 PM2 托管 Node 进程，保证常驻运行、崩溃自动重启。

### 启动配置

PM2 配置文件 `ecosystem.config.js`（或通过命令行启动）：

```javascript
// /opt/qzt-cms/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'qzt-cms',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    cwd: '/opt/qzt-cms',
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 常用 PM2 命令

```bash
# 首次启动
cd /opt/qzt-cms
pm2 start ecosystem.config.js

# 重启（部署后）
pm2 restart qzt-cms

# 优雅重载（零停机，推荐）
pm2 reload qzt-cms

# 查看状态
pm2 status
pm2 show qzt-cms

# 查看日志
pm2 logs qzt-cms --lines 100

# 设置开机自启
pm2 save
pm2 startup
```

### 优雅重载 vs 重启

| 方式 | 说明 |
|------|------|
| `pm2 restart` | 杀掉旧进程再启动新进程，有短暂中断 |
| `pm2 reload` | 优雅重载，先启动新进程再停旧进程，零停机（推荐生产） |

## Nginx 反向代理

CMS 监听 3000 端口，通过 Nginx 反向代理对外提供 443 HTTPS 服务：

```nginx
server {
    listen 443 ssl http2;
    server_name 你的域名;

    ssl_certificate     /etc/letsencrypt/live/你的域名/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名/privkey.pem;

    # 反向代理到 Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Next.js HMR / WebSocket 支持（生产可选）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Next.js 静态资源缓存
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 部署后验证

```bash
# 检查 PM2 进程状态
ssh user@你的服务器IP pm2 status

# 检查端口监听
ssh user@你的服务器IP ss -tlnp | grep 3000

# 本地健康检查
ssh user@你的服务器IP curl -I http://127.0.0.1:3000

# 通过域名访问
curl -I https://你的域名
```

## 一键部署脚本

```bash
#!/bin/bash
# deploy-cms.sh
set -e

SERVER=user@你的服务器IP
REMOTE_PATH=/opt/qzt-cms/

echo "==> 同步源码到服务器..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  ./ $SERVER:$REMOTE_PATH

echo "==> 服务器构建..."
ssh $SERVER << 'EOF'
  cd /opt/qzt-cms
  npm ci
  npm run build
  pm2 reload qzt-cms
  sleep 2
  pm2 status qzt-cms
EOF

echo "==> 部署完成：https://你的域名"
```

## 回滚

```bash
# 方式一：git 回滚后重新部署
git checkout HEAD~1
./deploy-cms.sh

# 方式二：服务器源码备份回滚
ssh user@你的服务器IP
cp -r /opt/qzt-cms.bak.YYYYMMDD /opt/qzt-cms
cd /opt/qzt-cms && npm run build && pm2 restart qzt-cms
```
