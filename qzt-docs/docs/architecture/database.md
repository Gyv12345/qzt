---
sidebar_position: 4
sidebar_label: 数据库设计
---

# 数据库设计

企智通使用 **MySQL 8** 作为主存储。本文说明数据库的基本规范、命名约定、软删除策略与建表流程。

## 基本规范

| 项 | 规范 |
| --- | --- |
| 数据库 | MySQL 8.0+ |
| 字符集 | `utf8mb4`（完整支持 emoji 与生僻字） |
| 排序规则 | `utf8mb4_0900_ai_ci`（MySQL 8 默认，大小写 / 重音不敏感） |
| 存储引擎 | InnoDB（支持事务、行锁、外键） |
| 主键 | `id BIGINT UNSIGNED AUTO_INCREMENT`，统一自增主键 |
| 时间字段 | `DATETIME`，存储服务器本地时间 |
| 布尔字段 | `TINYINT(1)`，0 / 1 |

## 表命名规范

所有表名使用**小写蛇形（snake_case）**，并按业务模块添加**前缀**，便于一眼识别归属与避免冲突：

| 前缀 | 模块 | 示例表 |
| --- | --- | --- |
| `sys_` | 系统管理 | `sys_users`、`sys_roles`、`sys_menus`、`sys_dicts`、`sys_operation_logs` |
| `crm_` | CRM | `crm_customers`、`crm_contacts`、`crm_leads`、`crm_opportunities`、`crm_contracts`、`crm_receivables` |
| `hrm_` | HRM | `hrm_departments`、`hrm_positions`、`hrm_employees`、`hrm_attendance` |
| `psi_` | 进销存 | `psi_purchase_orders`、`psi_sales_orders`、`psi_inventory`、`psi_warehouses`、`psi_suppliers` |
| `fin_` | 财务 | `fin_accounts`（科目）、`fin_vouchers`（凭证）、`fin_invoices` |
| `cms_` | CMS | `cms_articles`、`cms_categories`、`cms_tags`、`cms_pages` |

关联表（多对多）命名：`{前缀}_{a}_{b}`，如 `crm_customer_members`（客户与成员的关联）。

## 通用字段

几乎所有业务表都包含以下通用字段，由 GORM 模型基类统一定义：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED PK | 自增主键 |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |
| `deleted_at` | DATETIME NULL | 软删除标记，NULL 表示未删除 |
| `created_by` | BIGINT UNSIGNED | 创建人 ID |
| `updated_by` | BIGINT UNSIGNED | 更新人 ID |
| `tenant_id` | BIGINT UNSIGNED | （可选）多租户隔离字段 |

GORM 的 `gorm.Model` 已内置 `ID`、`CreatedAt`、`UpdatedAt`、`DeletedAt`，项目在此基础上扩展了 `created_by` / `updated_by`（通过钩子自动填充）。

## 软删除

企智通**全表启用软删除**（soft delete），即删除操作不执行 `DELETE`，而是将 `deleted_at` 设为当前时间。

### 实现机制

- GORM 在所有查询自动追加 `WHERE deleted_at IS NULL`
- 删除时执行 `UPDATE ... SET deleted_at = NOW() WHERE id = ?`
- 数据物理上仍在表中，可随时恢复或审计

### 为什么用软删除

- **数据安全**：误删可恢复，避免灾难性数据丢失
- **审计合规**：保留完整历史，满足财务、合同等场景的留痕要求
- **关联完整性**：删除客户后，其历史合同、回款记录仍可查询，不会因外键级联而消失

### 注意事项

- 软删除字段会占用存储，生产环境需定期归档（将历史数据迁移到归档表）
- 唯一索引需包含 `deleted_at`，否则删除后无法新建同名记录（例如客户名唯一性）。常见做法是用 `deleted_at` 替代自增 ID 参与唯一约束，或使用 Generated Column。

## 建表流程（SQL 文件优先）

企智通**不使用 GORM 的 AutoMigrate** 自动建表，而是通过**显式的 SQL 迁移文件**管理 schema 演进。

### 为什么不用 AutoMigrate

`AutoMigrate` 会根据结构体自动建表 / 加列，但在生产环境存在严重问题：

- **不可控**：自动推断的字段类型、长度、索引可能与预期不符
- **无法处理复杂变更**：重命名列、修改类型、数据迁移它都做不了
- **缺乏评审**：没有可 review 的 SQL 文件，难以追踪 schema 历史
- **生产事故风险**：模型改一行，线上表结构就变了，难以回滚

### SQL 迁移文件

所有建表与变更保存在 `migrations/` 目录，按版本号排序：

```
migrations/
├── 001_sys_base.sql              # 系统基础表（用户、角色、菜单、字典）
├── 002_crm_base.sql              # CRM 模块建表
├── 003_hrm_base.sql              # HRM 模块建表
├── 004_approval_base.sql         # 审批模块建表
├── 005_psi_base.sql              # 进销存建表
├── 006_finance_base.sql          # 财务建表
├── 007_cms_base.sql              # CMS 建表
├── 008_add_contract_template.sql # 增量变更（合同模板）
└── ...
```

每个文件**幂等**（使用 `CREATE TABLE IF NOT EXISTS`、`ADD COLUMN IF NOT EXISTS`），可重复执行。应用启动时会检查并执行未应用的迁移（通过一张 `sys_migrations` 表记录已执行的版本）。

### 开发流程

1. 设计表结构，编写 SQL 文件放入 `migrations/`
2. 编写对应的 GORM Model 结构体（字段与 SQL 对齐）
3. 编写 repository 层的 CRUD
4. 启动应用，迁移自动执行

## 索引规范

- **高频查询字段建索引**：外键字段、状态字段、时间范围查询字段
- **联合索引顺序**：区分度高的字段在前，遵循最左前缀原则
- **避免过度索引**：索引加速读但拖慢写，每张表索引数建议不超过 5 个
- **软删除兼容**：查询频繁带 `deleted_at IS NULL` 时，可将其纳入联合索引

示例：

```sql
CREATE TABLE crm_customers (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(128) NOT NULL,
  level       VARCHAR(8) NOT NULL DEFAULT 'C',
  owner_id    BIGINT UNSIGNED NOT NULL COMMENT '负责人',
  -- ...
  created_at  DATETIME NOT NULL,
  updated_at  DATETIME NOT NULL,
  deleted_at  DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_owner_deleted (owner_id, deleted_at),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 扩展阅读

- [后端架构](./backend)：Model 层如何映射到这些表
- [认证与权限](./auth)：`sys_users` / `sys_roles` / `sys_menus` 的协作
