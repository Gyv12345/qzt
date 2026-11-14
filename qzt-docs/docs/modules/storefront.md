---
sidebar_label: 跨境独立站
sidebar_position: 5
---

# 跨境独立站（storefront）

storefront 是**跨境独立站**的后端：面向海外买家提供英文/中文双语言商品浏览、询盘与在线支付。前台站点（storefront.devlovecode.com）与官网共用同一套 CMS 前端代码的双主题路由（见 [CMS 内容管理](/modules/cms)），本模块提供其商品、配置、询盘、订单与 Stripe 支付闭环。

## 设计要点

- **商品上架位与 CRM 商品解耦**：CRM 产品是内部主数据（人民币标准价），独立站额外维护一层「上架位」控制对外呈现（slug、直标价、精选、排序、多语言文案），CRM 下架不影响已维护的上架位展示口径；
- **价格体系**：上架位可设**直标价 + 币种**（USD/EUR/GBP…）；未设直标价时按站点汇率配置由 CRM 标价（CNY）折算展示价；
- **多语言**：每语言一份商品名 / 一句话卖点 / 富文本介绍，未翻译的语言回落主语言；
- **免登录**：前台全部走 `/storefront/public/*` 公开路由，订单与询盘均不建账号体系。

## 商品与站点配置

| 概念 | 说明 |
|------|------|
| 上架位 `storefront_product` | 关联 CRM 商品；slug（英文小写+连字符，全局唯一）；直标价（可空）；币种（默认 USD）；首页精选；排序；上架状态 |
| 多语言 `storefront_product_i18n` | 按 locale（如 en/zh）整组覆盖：商品名、卖点、介绍；保存未出现的 locale 不动 |
| 站点语言 `storefront.locales` | 站点语言清单（第一个为主语言），出厂默认 en、zh |
| 汇率 `storefront.rates` | CNY per unit，出厂默认 USD 7.2 / EUR 7.8 / GBP 8.8 |

## 接口清单

### 公开路由（免登录，独立站前台专用）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/storefront/public/products` | GET | 上架商品列表（按当前 locale 取文案，含展示价） |
| `/storefront/public/products/:slug` | GET | 商品详情（按 slug） |
| `/storefront/public/config` | GET | 站点配置（语言清单 + 汇率 + paypal_enabled） |
| `/storefront/public/inquiries` | POST | 提交询盘 |
| `/storefront/public/checkout` | POST | 下单，返回 Stripe 收银台地址 + 订单号（body 支持可选 `currency` 结算币种） |
| `/storefront/public/paypal/create` | POST | PayPal 下单，返回 PayPal 订单 ID + 审批页地址（买家支付后回跳站点） |
| `/storefront/public/paypal/capture` | POST | 捕获扣款（success 页回跳后调用，幂等置已支付） |
| `/storefront/public/webhooks/stripe` | POST | Stripe 支付回调（验签处理） |

### 管理路由（JWT + Casbin）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/storefront/products` | GET | 上架位分页列表（含各语言翻译完整度） |
| `/storefront/products` | POST / `/storefront/products/:id` PUT | 新增 / 部分字段更新（price 缺省不动 / null 清除） |
| `/storefront/products/:id` | GET | 上架位详情（含全部语言翻译） |
| `/storefront/config` | GET / PUT | 站点配置读取 / 保存 |
| `/storefront/orders` | GET | 订单分页列表 |
| `/storefront/orders/:id` | GET | 订单详情（含明细） |

## 询盘（Inquiry）

海外买家不直接下单时可提交询盘（姓名 / 邮箱必填，公司 / 国家 / 内容选填，可关联商品）：

- **IP 频控**：每 IP 每分钟最多 3 次提交，邮箱做宽松格式校验；
- **自动进 CRM**：询盘落库的同时自动在 **CRM 线索公海**创建线索（编号回填到询盘记录），销售在 CRM 领取跟进；
- **异步通知**：落库后异步通知管理员。

## 支付闭环（Stripe Checkout）

```
买家点击购买
   │
   ▼
POST /storefront/public/checkout（IP 频控 5 次/分钟）
   │  校验商品可购 → 价格解析（直标价 / CRM 价折算）
   ▼
订单落库（价格快照）→ 创建 Stripe Checkout Session → 回填 session id
   │
   ▼
买家在 Stripe 收银台完成支付
   │
   ▼
POST /storefront/public/webhooks/stripe（HMAC 验签）
   ├── checkout.session.completed → 幂等置「已支付」，回填买家信息 / PaymentIntent / 支付时间
   │      └── 异步通知 + best-effort 生成 PSI 销售单（失败仅记日志，不影响支付状态）
   └── checkout.session.expired → 置「已过期」
```

### 订单状态

| 状态 | 说明 |
|------|------|
| 1 待支付 | Checkout Session 已创建，等待买家支付 |
| 2 已支付 | Stripe webhook 确认完成支付（幂等处理重复回调） |
| 3 已取消 | 取消 |
| 4 已过期 | Checkout Session 过期 |

:::info Stripe 接入说明
支付基于 Stripe Checkout Session（当前以测试模式先行接入）。webhook 回调对 `Stripe-Signature` 头做 HMAC 验签（`t=时间戳,v1=签名`），验签失败直接拒绝；订单表以 session id 建唯一索引，保证重复回调不会重复入账。
:::

### 订单编号

订单号由自动编号服务生成：`SF + yyyyMMdd + 3 位流水`（如 `SF20261113001`），数据库唯一索引兜底。

## 多币种结算（P28-C）

买家可在导航栏**切换结算币种**（USD / EUR / GBP，来自站点汇率表）：

- **前端本地换算**：价格标签（PriceTag）按 `amount × rate(商品币种) ÷ rate(所选币种)` 以 CNY 为中枢换算，localStorage 持久化、跨标签页同步；静态导出下服务端首帧为默认 USD 形态，hydrate 后按用户选择换算；
- **后端权威折算**：下单接口（Stripe `checkout` / `paypal/create` 均支持 `currency` 参数）把所有商品价格**统一折算到所选结算币种**后快照，以此币种走支付网关——跨币种商品可合并下单（废除旧「不同币种分开下单」限制）；
- **汇率缺失拒绝**：结算币种必须在汇率表内，否则返回「不支持的结算币种」；商品价格币种缺汇率同样拒绝，避免错误折算。

## PayPal 支付通道（P28-C）

```
买家点击 PayPal 支付
   │
   ▼
POST /storefront/public/paypal/create（prepareOrder 同款校验/折算/落单）
   │  订单落库 → PayPal Orders API v2 创建订单 → 回填 paypal_order_id
   ▼
买家在 PayPal 审批页支付 → PayPal 按 return_url 跳回 success 页（自动带 token=<PayPal 订单 ID>）
   │
   ▼
success 页自动 POST /storefront/public/paypal/capture（服务端捕获扣款）
   ├── 捕获 COMPLETED → 幂等置已支付（与 Stripe webhook 共用 markOrderPaid + finalizePaidOrder）
   │      └── 异步通知 + 邮件 + best-effort PSI 销售单
   └── 捕获未完成 → 订单保持待支付，买家可重试
```

- **凭据未配置**：`paypal_enabled=false`（公开 config 下发），前端隐藏 PayPal 按钮；直接调接口返回「PayPal 支付未配置」；
- **幂等**：捕获带 `PayPal-Request-Id`（平台订单号），数据库侧以「仅待支付单可推进」条件更新兜底，重复回跳/并发只有一方生效；
- **沙箱先行**：`paypal.env=sandbox`，凭据 `PAYPAL_CLIENT_ID / PAYPAL_SECRET` 只走 gitignored `.env`。

## 邮件通知（P28-C）

订单已支付 / 新询盘时给运营发**事务邮件**（站内信 / 企微之外补充渠道）：

| 项 | 说明 |
|----|------|
| 收件人 | `sys_config storefront.notify_email`（逗号分隔），admin「独立站 → 站点配置」页维护，公开 config **不回传**该字段 |
| SMTP 凭据 | 只走 gitignored `.env`（`EMAIL_SMTP_HOST/PORT/USERNAME/PASSWORD/FROM`），空=通道关闭 |
| 投递策略 | 465 端口隐式 TLS、其他端口强制 STARTTLS（拒绝明文）；逐收件人单独投递，失败只记日志不影响主流程 |
| 触发点 | 订单 webhook/capture 置已支付后、询盘落库后（均异步，不发不发邮件则静默跳过） |

## 与其他模块的联动

| 联动模块 | 联动场景 |
|---------|---------|
| [CRM](/modules/crm) | 商品主数据与标价来源；询盘自动建公海线索 |
| [PSI 进销存](/modules/psi) | 支付成功后 best-effort 生成 PSI 销售单 |
| [CMS 内容管理](/modules/cms) | 前台为 cms 双主题的跨境路由（`(cross)/[locale]`），双域同根静态发布 |
| [静态站发布](/modules/deploy) | 独立站与官网共用一次 cms 构建（单构建双主题发布） |
| [系统管理](/modules/system) | Stripe/PayPal/SMTP 密钥等敏感配置走环境变量，不落库 |
