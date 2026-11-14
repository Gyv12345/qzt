---
sidebar_label: CMS 部署
sidebar_position: 4
---

# CMS 官网部署（静态化）

CMS 官网与跨境独立站共用同一套 Next.js 代码（双主题：`(main)` 中文官网 + `(cross)/[locale]` 跨境站），以**静态导出**（`output: export`）构建为纯静态产物，由 nginx 直接 serve。**服务器上无常驻 Node 进程**，pm2 已全部下线。

## 部署架构

```
Admin 后台「静态站发布」按钮
   │
   ▼
POST /deploy/static  {"target": "cms" | "storefront"}     （超管专用）
   │  单飞互斥：同一时刻仅一个重建任务；异步执行
   ▼
服务器执行 /opt/qzt-server/bin/rebuild_static.sh <target>
   │  npm install → next build（静态导出 out/）→ rsync 发布
   ▼
┌────────────────────────────────────────────────────┐
│  cms        → /opt/qzt-cms-static/      （主域名）  │
│  storefront → /opt/qzt-storefront-static/（独立域名）│
└────────────────────────────────────────────────────┘
   │
   ▼
nginx 直接 serve 新产物，构建完成即生效
```

## 服务信息

| 项 | 值 |
|----|----|
| 主题结构 | `(main)` 中文官网 + `(cross)/[locale]` 跨境站（en/zh） |
| cms 域名 | 主域名（官网） |
| storefront 域名 | storefront 独立子域名（跨境独立站前台） |
| 技术栈 | Next.js 静态导出（构建期预渲染） |
| 源码目录 | `/opt/qzt-cms/`、`/opt/qzt-storefront/` |
| 产物目录 | `/opt/qzt-cms-static/`、`/opt/qzt-storefront-static/` |
| 进程管理 | 无（nginx 纯静态 serve） |
| 日志 | `/opt/qzt-server/logs/rebuild_<target>_<时间戳>.log` |

## 日常发布：一键按钮

内容运营（文章、产品、站点信息）更新后的日常发布走 **Admin 后台**：

1. 「系统管理 → 站点信息」页找到「静态站发布」卡片；
2. 选择目标（官网 / 独立站）点击发布；
3. 后端触发服务器端重建脚本（异步），页面轮询 `GET /deploy/status` 展示进度与日志尾（末 30 行）。

:::note 触发条件与权限
该入口为超管专用（Casbin 超管短路放行，普通角色无策略不可达）；进行中重复触发会被拒绝。构建期环境变量（API 基址、站点 URL）由脚本强制导出，与后端进程环境无关。
:::

## 静态导出的三个关键适配

Next.js 静态导出对运行时能力有硬性限制，项目内已做适配：

| 限制 | 适配方式 |
|------|---------|
| middleware 与 API 代理 route 不支持导出 | 多语言 `/` 重定向改由 nginx 301 处理；表单改同源 `/prod-api`（nginx 反代剥前缀到后端 9000） |
| sitemap / robots / llms 等元文件 | 显式声明 `dynamic = "force-static"`，构建期生成 |
| `generateStaticParams` 返回空数组即构建失败 | 列表页与详情页的构建参数全部依赖后端可达（构建期从 API 拉数据） |

## 手动重建（服务器侧）

需要 SSH 操作时（如脚本版本迭代、排查构建失败），可在服务器直接执行：

```bash
# 与一键按钮等效（target: cms / storefront）
/opt/qzt-server/bin/rebuild_static.sh cms

# 查看最近一次构建日志
ls -t /opt/qzt-server/logs/rebuild_*.log | head -1
tail -50 /opt/qzt-server/logs/rebuild_cms_<时间戳>.log
```

脚本内建单飞互斥（锁文件），不会与后台触发的任务并发冲突。

## 源码更新

站点代码变更的发布流程：

```bash
# 本地 rsync 源码到服务器（排除依赖与构建产物、服务器特有 env）
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude out \
  --exclude .git --exclude '.env*' --exclude '._*' \
  -e "ssh -i <key>" ./ root@服务器IP:/opt/qzt-cms/
```

:::warning 不要覆盖服务器 `.env`
`/opt/qzt-cms/.env.local` 是服务器特有的（API 基址指向内网 9000），rsync 必须排除 `.env*`。一旦被本地文件覆盖，构建产物会内联错误地址，页面取不到数据；修复方式是恢复正确的 `.env.local` 后删除 `.next` 重新构建。
:::

源码同步后点「静态站发布」按钮（或手动跑脚本）完成发布。

## 部署后验证

```bash
# 官网与独立站首页
curl -sI https://你的域名/ | head -1        # 200
curl -sI https://storefront.你的域名/ | head -1   # 200

# 主域 API 反代（留言表单同源直连）
curl -s https://你的域名/prod-api/system/version | head -c 200
```
