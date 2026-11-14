---
sidebar_label: 开放平台
sidebar_position: 10
---

# 开放平台（open）

open 模块是行简的**开放集成地基**，提供两组能力：

1. **出站 Webhook**：平台业务事件（审批通过、回款登记、销售出库……）实时推送到你登记的回调地址，带 HMAC 签名可验真；
2. **开放 API（`/open/v1/*`）**：供外部系统（如自建 OA、数据仓库）拉取事件目录与组织树，支持 JWT 或 `qzt_` API Key 双源认证。

```
xevent 进程内事件总线
   │  审批/回款/出库等业务点发布事件
   ▼
事件监听器（映射为事件码）──▶ outbox 落库（open_webhook_event）
                                    │
                                    ▼
                          投递 job（每分钟扫描）
                                    │  签名 + POST → 成功 / 指数退避重试 / 死信
                                    ▼
                          webhook_events 日志（可查、可重试）
```

## Webhook 端点管理

### 配置项

| 字段 | 说明 |
|------|------|
| 名称 / URL | 自定义名称；回调地址必须是合法 `http/https` |
| 事件订阅 | 逗号分隔的事件码；**留空 = 订阅全部事件** |
| 签名密钥 secret | 创建时服务端生成 32 位 hex，**仅创建响应展示一次**，之后不可再查看 |
| 状态 | 启用 / 停用 |

### 接口清单（管理组，JWT + Casbin）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/open/webhooks` | GET / POST | 端点分页列表 / 创建（返回明文 secret 一次） |
| `/open/webhooks/:id` | GET / PUT / DELETE | 详情（secret 脱敏）/ 编辑 / 删除 |
| `/open/webhooks/:id/status` | PUT | 启用 / 停用 |
| `/open/webhook-events` | GET | 投递日志分页（状态、请求/响应摘要） |
| `/open/webhook-events/:id/retry` | POST | 手动重试一条失败投递 |

## 事件目录

| 事件码 | 名称 | 触发时机 |
|--------|------|---------|
| `approval.passed` | 审批通过 | 审批实例全部通过 |
| `approval.rejected` | 审批驳回 | 审批实例被驳回 |
| `approval.revoked` | 审批撤回 | 发起人撤回审批实例 |
| `crm.payment.created` | 回款登记 | 合同回款记录创建 |
| `psi.sales_order.stock_out` | 销售出库 | 销售订单执行出库 |

事件来源是进程内 `xevent` 事件总线，新业务事件在总线上发布后登记目录即可被 Webhook 转发，目录同时通过开放 API 供外部系统查询。

## 投递与签名

### 请求格式

投递为 `POST` JSON，固定携带四个请求头：

| 请求头 | 说明 |
|--------|------|
| `X-QZT-Signature` | `sha256=<hex>`；HMAC-SHA256(secret, `<时间戳>.<原始报文>`)，Stripe 风格 |
| `X-QZT-Event` | 事件码 |
| `X-QZT-Timestamp` | Unix 秒级时间戳 |
| `X-QZT-Delivery` | 投递记录 ID |

接收方验签示例（与签名算法严格一致、恒时比较）：

```go
expected := "sha256=" + hex(hmac_sha256(secret, timestamp + "." + rawBody))
hmac.Equal([]byte(expected), []byte(header))
```

### 重试与清理

- 投递 job 每分钟扫描到期任务，逐条抢占投递（10 秒超时）；
- 失败自动重试，退避序列：**1 分钟 → 5 分钟 → 30 分钟 → 2 小时**；超出退避表进入死信（可在日志中手动重试）；
- 清理 job 定期硬删 30 天前的成功投递日志，控制日志表膨胀。

## 开放 API（`/open/v1/*`）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/open/v1/events` | GET | 事件目录契约（外部系统据此决定订阅哪些事件码） |
| `/open/v1/org/tree` | GET | HRM 部门树透出，供外部 OA 系统同步组织架构 |

### 认证与限流

- **双源认证**：平台 JWT 或 `qzt_` 前缀 API Key（在[个人中心](/modules/system)创建）；API Key 继承其属主角色走 Casbin 鉴权，与人工操作同一份权限策略；
- **每调用方限流**：进程内令牌桶，**120 次/分钟**（按 API Key ID 或 JWT 用户 ID 维度），超限返回 429。

## 与其他模块的联动

| 联动模块 | 联动场景 |
|---------|---------|
| [审批中心](/modules/approval) | 审批通过/驳回/撤回事件出站 |
| [CRM](/modules/crm) | 回款登记事件出站 |
| [PSI 进销存](/modules/psi) | 销售出库事件出站 |
| [HRM](/modules/hrm) | 组织树经开放 API 供 OA 同步 |
| [系统管理](/modules/system) | API Key 创建与权限继承 |
