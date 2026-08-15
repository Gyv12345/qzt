# 数据库初始化说明

**本项目建表与种子数据全走 SQL 文件（SQL-first）：本目录下的 SQL 文件是表结构与种子数据的单一事实来源**，由用户手动执行（DBX MCP 或 mysql）。应用启动**不做** AutoMigrate、**不写**任何种子（`internal/model/migrate.go` 与 `internal/app/migrate.go` 已清空为注释，Go 代码不再负责建表/种子）。

## 执行方式

1. 首次初始化：先创建数据库（若用 `qztgo.sql` 全量导入则无需单独建库）：
   ```sql
   CREATE DATABASE qztgo DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. 执行 `qztgo.sql`（全库地基：系统表 + 系统地基种子——超管角色/用户、内置菜单与 API、示例字典）。
3. 其余 SQL 文件按需执行：每个文件对应一个功能增量（建表/加列/菜单/权限种子/下线清理），全部幂等、可重复执行。新模块上线或代码升级后，对照下表按需补跑。
4. 执行入口：DBX MCP 连接「我的阿里云数据库」（database=qztgo），或手动 `mysql -h <host> -u <user> -p qztgo < xxx.sql`。

## 写新 SQL 的约定

- 一个功能增量一个文件，命名 `{模块或功能}.sql`；文件头注释标明**用途、ID 分配区间、执行方式**。
- 必须幂等：`CREATE TABLE IF NOT EXISTS` + `INSERT ... ON DUPLICATE KEY UPDATE`，或先 DELETE 固定 ID 区间再 INSERT。
- 菜单/API/字典等种子的 ID 使用固定区间，避免与既有数据冲突（写新文件前先查 `sys_menu` 等表现有 max ID）。
- **禁止**用 Go 代码建表或写种子（不要新增 `AutoMigrate()` / `SeedData()`，不要往 `internal/model/seed_data.go` 历史遗留文件追加内容）。

## SQL 文件索引

| 文件 | 用途（摘自各文件头注释） |
| --- | --- |
| **`qztgo.sql`** | **全库地基**（DBX 导出）：全部系统表 + 系统地基种子（超管/菜单/API/字典），首次初始化必执行 |
| `api_key_toolsets.sql` | `sys_api_key` 增加 MCP 工具集字段（toolsets），API Key 级 MCP 工具过滤 |
| `approval_flow_form_key.sql` | `approval_flow` 增加 form_key 维度（OA 自定义表单每模板一条审批流） |
| `approval_preset.sql` | 审批流预置流程种子（13 种 form_type，is_preset=1 默认不启用） |
| `attachment.sql` | 通用附件系统建表 + Casbin API 权限种子 |
| `business_number.sql` | 为缺少编号的业务表补 `_no` 列，配合 numbergen 自动编号 |
| `cms_homepage_config.sql` | CMS 首页板块配置：板块开关 + 精选条目 |
| `contract_template.sql` | 合同模板（正文套打）`crm_contract_template` 建表+种子 |
| `crm_config.sql` | CRM 配置中心：跟进预警阈值 + 公海自动回收定时任务 + 配置页菜单 |
| `crm_seas.sql` | 公海重构：默认池标识 + 公海菜单挪到配置目录 + 客户/线索公海菜单 |
| `esign_remove.sql` | 电子签（e签宝）功能下线清理脚本 |
| `finance.sql` | 财务管理模块（finance）权限种子（sys_api/sys_menu） |
| `follow_lead_id.sql` | 跟进记录/计划表新增 lead_id 列，打通线索跟进链路 |
| `kb.sql` | 知识库模块菜单 + API 权限种子（含历史错挂菜单清理） |
| `lead.sql` | CRM 线索（Lead）+ 线索公海池 + 字典 + 权限种子 |
| `lead_customfield.sql` | 线索自定义字段 + 线索→客户转化字段映射 |
| `mail_remove.sql` | 邮件功能下线清理（对齐代码删除） |
| `oa_expense.sql` | OA 报销模块：建表 + 菜单 + 权限 + 字典 |
| `oa_form.sql` | OA 自定义表单引擎 + 公告迁移 + 请假菜单 |
| `oa_office.sql` | OA 日常办公：工作日志 + 日程日历 + 会议室 + 会议预订 |
| `product.sql` | CRM 商品表结构增量：image_url 商品主图 |
| `product_price_remove.sql` | 商品多价格（价格方案）功能下线清理 |
| `rbac_test_seed.sql` | RBAC + 数据权限测试种子数据 |
| `rbac_test_seed_dept.sql` | DEPT（本部门）数据权限测试补充数据 |
| `site_config_mcp.sql` | `sys_site_config` 加 mcp_url 列，动态下发 MCP 服务地址 |
| `storage_config_cleanup.sql` | 存储配置迁移到配置文件后的菜单/API 清理 |
| `table_comments.sql` | 全库表/字段中文注释补全（幂等，已有注释不动） |
| `wecom_clock.sql` | 考勤打卡来源字段 + 企微打卡数据同步定时任务 |
