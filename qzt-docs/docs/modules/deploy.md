---
sidebar_label: 静态站发布
sidebar_position: 16
---

# 静态站发布（deploy）

deploy 是平台运维辅助模块，提供**静态站一键发布**能力：在 Admin 后台「系统管理 → 站点信息」页点击「静态站发布」按钮，由后端在服务器上异步执行静态站重建脚本（依赖安装 + 构建 + 发布），并提供状态轮询接口查看进度与日志。

## 设计要点

- **脚本路径与参数全部为服务端常量**：目标（target）经服务端白名单校验后才传入重建脚本，绝不使用客户端输入构造命令（安全红线）；
- **单飞互斥**：进程内互斥锁保证同一时刻仅允许一个重建任务，进行中重复触发直接拒绝（不排队）；
- **异步执行**：接口立即返回，构建在后台进行，前端通过 `GET /deploy/status` 轮询进度与日志尾；
- **超管专用语义**：路由走 JWT + 操作日志 + Casbin RBAC，超管内存短路放行；未绑定菜单/按钮，普通角色无策略天然不可达。

## 支持的目标（target）

| target | 说明 | 工作目录 | 产物目录 |
|--------|------|---------|---------|
| `cms` | 官网 + 跨境独立站双主题（单构建双主题发布） | `/opt/qzt-cms` | `/opt/qzt-cms-static/` |

唯一的构建目标对应 [CMS 内容管理](/modules/cms) 项目——2026-11-13 起[跨境独立站](/modules/storefront)已并入 CMS 成为第二主题，一次 `next build` 同时产出官网与独立站页面，由 nginx 双域名同根 serve 纯静态产物（`output: export`）。

## 接口清单

| 接口 | 方法 | 说明 |
|------|------|------|
| `/deploy/static` | POST | 一键重新生成并发布静态站（body：`{"target": "cms"}`） |
| `/deploy/status` | GET | 查询是否有任务在执行，以及最近一次重建的状态与日志尾 |

### POST /deploy/static

- 请求体仅一个字段 `target`，当前仅接受 `cms`（官网 + 跨境双主题一次发布），未知目标直接拒绝；
- 已有任务在执行时返回失败，提示当前正在执行的 target；
- 触发成功后接口立即返回，不等构建结束。

### GET /deploy/status

返回结构：

| 字段 | 说明 |
|------|------|
| `running` | 空串 = 空闲；否则为正在执行的 target |
| `last_per_target` | 各 target 最近一次重建状态：`status`（running / success / failed）、起止时间、日志文件路径、`log_tail`（末 30 行日志） |

:::note
`storefront` 目标已于 2026-11-13 随独立站并入 CMS 而移除：独立站与官网共用一次 cms 构建，不再单独发布。
:::

## 执行流程

```
Admin 点击「静态站发布」
   │
   ▼
POST /deploy/static（校验 target 白名单 + 单飞互斥）
   │
   ▼
后台 goroutine 执行 /opt/qzt-server/bin/rebuild_static.sh <target>
   │  （脚本内容：npm install → next build（静态导出）→ rsync 到静态目录）
   │
   ├── stdout/stderr 同时写入日志文件与内存环形缓冲（供 log_tail 展示）
   │      日志路径：/opt/qzt-server/logs/rebuild_<target>_<时间戳>.log
   ▼
脚本退出 → 落终态 success / failed → 释放互斥锁
```

:::tip 构建期环境变量
构建所需的 `API_BASE`、`SITE_URL` 等环境变量由服务器侧 `rebuild_static.sh` 脚本强制导出，与后端进程环境无关，避免构建产物内联错误的 API 地址。
:::

## 与其他模块的联动

| 联动模块 | 联动场景 |
|---------|---------|
| [CMS 内容管理](/modules/cms) | 官网内容更新后发布 cms 站点（官网 + 跨境双主题一次发布） |
| [系统管理](/modules/system) | 站点信息（Logo/SEO 等）修改后需重新发布静态站生效 |
