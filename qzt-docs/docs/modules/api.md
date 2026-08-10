---
sidebar_label: 公共服务
sidebar_position: 15
---

# 公共服务

公共服务模块（`api`）是企智通的**横切型基础设施**，为所有业务模块提供文件上传、附件管理、BI 数据聚合和健康检查等跨领域能力。它不承载具体业务实体，而是为整个平台提供共享服务。

## 模块全景

```
┌──────────────────────────────────────────────┐
│              公共服务模块 (api)                │
├────────────┬─────────────┬───────────────────┤
│  文件存储   │  附件管理    │   BI 数据分析      │
│  Upload    │ Attachment  │   Dashboard       │
├────────────┴─────────────┴───────────────────┤
│         健康检查 / 公共配置                    │
│      Health / Public Config                  │
└──────────────────────────────────────────────┘
```

## 文件存储

文件存储是公共服务最核心的能力，采用**双桶模型**（详见 [文件存储设计](../architecture/storage)）：

### 上传接口

| 接口 | 说明 |
|------|------|
| `POST /api/upload` | 服务端上传（公共桶直链 / 私有桶 objectKey） |
| `GET /api/upload/sts` | 获取 OSS 直传预签名 PUT URL（15 分钟有效） |
| `GET /api/file/sign` | 为私有文件签发短期（1h）下载 URL |
| `GET /api/file/dl` | 本地模式私有文件代理下载（Token 鉴权） |

:::tip 双桶模型
- **公共桶**（public-read）：头像、CMS 图片、Logo 等，上传后返回可直链的 CDN URL
- **私有桶**（private）：合同、凭证、证件等敏感文件，存储 objectKey，下载需签名

详见 [文件存储设计](../architecture/storage)。
:::

## 附件管理

附件管理是独立于文件存储之上的**元数据层**，记录文件与业务对象的关联关系。

### 附件属性

| 字段 | 说明 |
|------|------|
| **业务类型 biz_type** | 关联的业务对象类型（CUSTOMER / CONTRACT / EXPENSE / EMPLOYEE 等） |
| **资源 ID resource_id** | 关联的业务对象 ID |
| **文件名** | 附件显示名 |
| **object_key** | 私有文件的存储路径 |
| **URL** | 公共文件的直链 URL |
| **可见性** | public / private |
| **上传人** | 附件上传者 |

### 使用方式

业务详情页（如客户详情、报销详情）的「附件」面板即基于附件管理实现：

1. 用户在详情页上传文件 → `POST /api/upload` 获取 URL/objectKey
2. 创建附件记录 → `POST /api/attachments`（绑定 biz_type + resource_id）
3. 列表展示 → `GET /api/attachments?biz_type=XXX&resource_id=Y`
4. 删除附件 → `DELETE /api/attachments/:id`（软删除，不删存储文件）

## BI 数据分析

公共服务内置**跨模块 BI 仪表盘**，从 CRM、HRM、Finance、PSI 等业务模块实时聚合数据，为工作台和分析页面提供图表数据。

### 核心指标

| 接口 | 数据 |
|------|------|
| `GET /api/dashboard/overview` | 核心指标汇总（客户数、商机数、合同额、回款额、待审批数） |
| `GET /api/dashboard/sales-trend` | 近 N 天回款趋势折线图 |
| `GET /api/dashboard/customer-distribution` | 客户行业 / 级别分布饼图 |
| `GET /api/dashboard/opportunity-funnel` | 商机漏斗（各阶段数量与金额） |
| `GET /api/dashboard/finance-summary` | 财务概览（收入、支出、利润） |

### CRM 分析

| 接口 | 数据 |
|------|------|
| `GET /api/dashboard/contract-trend` | 合同签订趋势 |
| `GET /api/dashboard/sales-ranking` | 销售业绩排行 |
| `GET /api/dashboard/lead-source-distribution` | 线索来源分布 |

### HRM 分析

| 接口 | 数据 |
|------|------|
| `GET /api/dashboard/employee-distribution` | 员工部门分布 |
| `GET /api/dashboard/headcount-trend` | 人员编制趋势 |
| `GET /api/dashboard/attendance-summary` | 考勤汇总（出勤/迟到/缺卡） |

### PSI 分析

| 接口 | 数据 |
|------|------|
| `GET /api/dashboard/stock-value-by-warehouse` | 各仓库库存价值 |
| `GET /api/dashboard/sales-vs-purchase` | 销售额 vs 采购额对比 |

:::info 数据聚合
BI 接口是只读的聚合查询，直接从各业务模块的表中进行 SQL 聚合（COUNT / SUM / GROUP BY），不维护独立的汇总表。数据实时反映业务最新状态。
:::

## 健康检查与公共配置

| 接口 | 说明 |
|------|------|
| `GET /api/health` | 服务存活探针（无需鉴权，用于负载均衡健康检查） |
| `GET /api/configs/public` | 公共系统配置（站点信息等，用于前端初始化） |
