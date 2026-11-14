---
sidebar_label: GEO 增长引擎
sidebar_position: 12
---

# GEO 增长引擎（geo）

GEO（Generative Engine Optimization，生成式引擎优化）模块解决一个新问题：**当潜在客户问 AI（ChatGPT、豆包、DeepSeek 等）「哪家 CRM 适合中小企业」时，你的品牌是否被推荐、是否带官网引用？** 模块由两条产线组成：

1. **监测产线**：提示词库 × AI 平台的全组合自动提问、按统一口径打分，产出「AI 推荐率 / 自有引用命中率」两大指标与趋势；
2. **信源产线**：从监测结果发现选题 → AI 生成图文/视频稿件 → 质检 → 投递到微信公众号与抖音，用真实内容反向提升 AI 可见性。

## 监测产线

### 提示词库

维护要向 AI 平台提出的监测问题，按分组组织：

| 字段 | 说明 |
|------|------|
| 问题 | 完整监测问题，如「中小企业适合用哪款 CRM？」 |
| 分组 | `brand`（品牌词）/ `category`（品类词）/ `scenario`（场景词） |
| 是否启用 | 仅启用的提示词参与监测 |
| 排序 / 备注 | 展示顺序与说明 |

### 监测平台

监测目标是**任何 OpenAI 兼容协议的 AI 平台**——平台记录「API 根地址 + 模型名 + API Key」三元组，GPT、Claude 兼容网关、DeepSeek、豆包等均可接入：

| 字段 | 说明 |
|------|------|
| 平台名 | 自定义名称 |
| Base URL | OpenAI 兼容 API 根地址 |
| 模型名 | 如 `gpt-4o`、`deepseek-chat` |
| API Key | 服务端保存，接口不回显 |

### 监测轮次与打分

一轮监测 = 启用提示词 × 启用平台的**全组合**逐对提问，抓取回答全文后按三级口径打分：

| 得分 | 口径 |
|------|------|
| 0 | 未提及行简 |
| 1 | 提及行简 |
| 2 | 提及行简且带官网链接 |

回答分析基于「品牌锚点（行简）+ 自有域名（devlovecode.com）+ 竞品清单」三组关键词，同时抽取回答中的引用 URL、命中的竞品名。一轮结束后汇总两个核心指标：

| 指标 | 含义 |
|------|------|
| **AI 推荐率** | 提及行简的结果占比 |
| **自有引用命中率** | 引用命中自有域名的占比 |

执行细节：组合间并发 5 路、单次提问超时 90 秒，避免打爆单平台限流；同一时刻仅允许一轮监测在执行（防重入）。

### 接口清单（监测）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/geo/prompts` | GET / POST | 提示词分页列表 / 新增 |
| `/geo/prompts/:id` | PUT / DELETE | 编辑 / 删除提示词 |
| `/geo/platforms` | GET / POST | 监测平台列表 / 新增 |
| `/geo/platforms/:id` | PUT / DELETE | 编辑 / 删除平台 |
| `/geo/runs` | POST | 启动一轮监测（异步执行） |
| `/geo/runs` | GET | 轮次分页列表 |
| `/geo/runs/:id` | GET | 轮次详情（指标汇总） |
| `/geo/runs/:id/results` | GET | 逐组合结果明细（含回答全文） |
| `/geo/runs/:id/export` | GET | 导出 CSV |
| `/geo/trend` | GET | 指标历史趋势 |

:::tip 定时监测
监测支持定时触发：定时任务 `geo.monitor.run`（默认每周一 09:00，可在「定时任务」中调整）自动拉起一轮监测；Admin 页面可手动「立即监测」。
:::

## 信源产线

信源产线把「监测发现的机会」变成「可发布的内容」，全链路 AI 参与、每步独立容错（一步失败记录后继续）。

### 选题池

| 能力 | 说明 |
|------|------|
| AI 生成选题 | `POST /geo/topics/generate`：基于最近监测轮次的结果（如竞品被提及而自己未提及的问题）让 LLM 提炼新选题 |
| 人工新增/编辑 | 支持手动录入选题 |
| 审核 | `POST /geo/topics/:id/review`：通过（approved）/ 驳回（rejected） |
| 冷却 | 同一选题 60 天内不重复产母稿 |

选题来源标记：`matrix`（产品矩阵）/ `ai`（AI 生成）/ `manual`（人工）。

### 稿件库

| 能力 | 说明 |
|------|------|
| AI 生成图文 | `POST /geo/sources/generate`：按选题生成 Markdown 母稿（标题/摘要/正文） |
| AI 视频 | 产线内可生成视频稿件（异步任务轮询直至成片） |
| AI 质检 | `POST /geo/sources/:id/qc`：质检结论 `pass` / `warn` / `blocked` |
| 分发稿 | `POST /geo/sources/:id/variants`：基于母稿生成平台差异化变体 |

稿件状态流转：`generated`（已生成）→ `pushed`（已推送到平台草稿箱）→ `published`（已发布）；失败保留错误摘要可重试。

### 投递渠道

| 渠道 | 接口 | 说明 |
|------|------|------|
| 微信公众号 | `POST /geo/sources/:id/push` → `POST /geo/sources/:id/publish` → `GET /geo/sources/:id/publish` | 推入公众号草稿箱 → 发起发布 → 轮询发布结果拿发布 URL |
| 抖音 | `POST /geo/sources/:id/douyin` | 直发已授权抖音账号 |

### 一键跑一轮

`POST /geo/sources/run` 编排整条产线：**AI 选题 → AI 图文 → 推送公众号 → AI 视频**，返回执行摘要（生成选题数、稿件、是否推送/渲染成功、各步备注）。同样支持定时任务 `geo.source.run` 定时执行，与手动触发共用同一防重入锁。

### 抖音授权账号

| 接口 | 方法 | 说明 |
|------|------|------|
| `/geo/platforms/douyin/authorize` | GET | 生成抖音 OAuth 授权链接 |
| `/geo/platforms/douyin/bind` | POST | 授权回调后绑定账号 |
| `/geo/platforms/douyin/accounts` | GET | 已绑定账号列表 |
| `/geo/platforms/douyin/accounts/:id` | DELETE | 解绑账号 |

令牌（access/refresh）服务端保存，接口不回显。

## 接口清单（信源产线）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/geo/topics` | GET / POST | 选题分页 / 新增 |
| `/geo/topics/:id` | PUT / DELETE | 编辑 / 删除选题 |
| `/geo/topics/:id/review` | POST | 选题审核 |
| `/geo/topics/generate` | POST | AI 生成选题 |
| `/geo/sources` | GET / POST | 稿件分页 / 新增 |
| `/geo/sources/:id` | PUT / DELETE | 编辑 / 删除稿件 |
| `/geo/sources/generate` | POST | AI 生成稿件 |
| `/geo/sources/run` | POST | 跑一轮产线 |
| `/geo/sources/:id/qc` | POST | AI 质检 |
| `/geo/sources/:id/variants` | POST | 生成分发稿 |
| `/geo/sources/:id/push` | POST | 推送公众号草稿箱 |
| `/geo/sources/:id/publish` | POST / GET | 发起发布 / 查询发布结果 |
| `/geo/sources/:id/douyin` | POST | 抖音直发 |

## 与其他模块的联动

| 联动模块 | 联动场景 |
|---------|---------|
| [AI 业务系统](/modules/ai) | 监测提问与内容生成统一走内部 LLM 网关 |
| [定时任务](/modules/enterprise) | `geo.monitor.run`（每周监测）与 `geo.source.run`（每周产稿） |
| [文件存储](/architecture/storage) | 视频成片落公共桶直链 |
| [CMS 内容管理](/modules/cms) | 稿件内容与官网博客同源运营 |
