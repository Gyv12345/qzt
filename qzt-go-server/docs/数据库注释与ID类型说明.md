# 数据库注释与 ID 类型说明

> 记录 qztgo 数据库的主键类型选型理由，以及 2026-08-13 的全库注释治理。

## 一、为什么主键 `id` 用 `BIGINT UNSIGNED`

全库 114 张业务表的主键（及所有外键）统一使用 `BIGINT UNSIGNED`。选型理由：

### 1. BIGINT 而非 INT —— 容量与未来安全

- `INT` 上限约 ±21 亿（unsigned 约 42 亿）。企业系统中客户、审批实例、操作日志、跟进记录这类高增长表，单表自增几年内就可能逼近上限。
- 主键一旦溢出，迁移成本极高：所有外键、索引、关联表都要改类型，且要停机。
- `BIGINT`（约 ±9.2×10¹⁸）一步到位，从根本上杜绝未来重构。

### 2. UNSIGNED（无符号）—— 范围翻倍 + 类型对齐

- 自增主键不需要负数。去掉符号位后范围从 `[-2⁶³, 2⁶³-1]` 扩大到 `[0, 2⁶⁴-1]`（约 1844 京），可用自增空间翻倍，几乎不可能耗尽。
- 与 Go 侧 `uint` / `*uint`（64 位机即 uint64）**自然对齐**：GORM 把 Go 的 `uint` 映射为 `bigint unsigned`，序列化/反序列化类型无损往返，无需额外转换。

### 3. 全库统一 —— 工程一致性

- 114 张业务表的主键、外键全部 `bigint unsigned`，ORM 反射、JOIN、外键关联类型一致，避免隐式类型转换导致索引失效。
- Go model 里统一写 `ID uint \`gorm:"primaryKey"\``，GORM 自动建出 `bigint unsigned`。

### 4. 存储与性能 —— 可忽略的代价

- `BIGINT` 固定 8 字节，在 InnoDB 聚簇索引下与 `INT`（4 字节）的查找都是 O(1)，性能差异在业务系统中可忽略；多出的 4 字节/行相比"主键溢出需重构"的灾难性风险微不足道。

## 二、15 张表的 `id` 是 `VARCHAR(32)` —— 特例

以下 15 张表主键用 `varchar(32)`，它们都是**自定义字段的元数据/值表**，主键是业务语义的字符串 key（字段标识），而非自增流水号：

| 表 | 性质 |
| --- | --- |
| `sys_module_field` / `sys_module_field_blob` | 字段定义主表及其大属性（JSON） |
| `sys_module_form` | 模块表单配置 |
| `customer_field` / `customer_field_blob` | 客户自定义字段值 |
| `lead_field` / `lead_field_blob` | 线索自定义字段值 |
| `opportunity_field` / `opportunity_field_blob` | 商机自定义字段值 |
| `product_field` / `product_field_blob` | 产品自定义字段值 |
| `contract_field` / `contract_field_blob` | 合同自定义字段值 |
| `follow_up_record_field` / `follow_up_record_field_blob` | 跟进记录自定义字段值 |

这些表数据量小、主键是字符串标识，用 `varchar(32)` 更自然；与 `sys_module_field.id`（字段定义的主键）保持一致，便于跨表关联。

## 三、全库注释治理记录（2026-08-13）

### 治理前

- 表注释：37/138 有，**101 张为空**
- 字段注释：985/1545 有，**560 个为空**

### 治理后

- 表注释：**138/138 全有，0 为空**
- 字段注释：**1545/1545 全有，0 为空**

### 注释来源（优先级）

1. **Go model 的 `gorm:"comment:"` tag**（977 处）—— 代码真相，开发时随字段定义维护。
2. **model struct 的 Go 文档注释**（`// SysUser 系统用户`）→ 表注释。
3. **通用字段兜底**：`id`→主键ID、`created_at`→创建时间、`updated_at`→更新时间、`deleted_at`→删除时间(软删除)、`sort`→排序号、`remark`→备注 等。
4. **手工补充**：连接表（`sys_user_role`/`sys_role_menu`/`sys_menu_api`/`cms_article_tag`）、`casbin_rule`、`sys_api`/`sys_menu`/`sys_user` 中漏写 comment tag 的字段、自定义字段 blob 表的 `resource_id`/`field_id`/`field_value`。

### 方法（全程 DBX MCP 操作）

1. Python 解析 `internal/model/**/*.go`，提取 `(表名, 列名, comment)` 映射（列名用 GORM snake_case 规则，正确处理 `ID` 后缀如 `DeptID`→`dept_id`）。
2. DBX 开持久 session，建临时表 `_tc` 装映射（1361 行），派生 `_tc_spec`（具体表）/`_tc_glob`（全局通用列）。
3. 一条 SQL 直接生成最终 `ALTER` DDL —— 列定义从 `information_schema` 精确重建（保留 `type`/`NOT NULL`/`DEFAULT`/`AUTO_INCREMENT`/`on update` 精度），`COMMENT` 来自映射。
4. 存储过程游标动态执行全部 DDL（95 条表注释 + 552 条字段 MODIFY），`CONTINUE HANDLER` 忽略个别错误。
5. 8 个 `DEFAULT_GENERATED` 时间列因 `CURRENT_TIMESTAMP(3)` 精度未匹配首轮失败，手工精确重建修复。

### 可复跑治理脚本

- `docs/sql/table_comments.sql`：**幂等**补注释脚本（只补空的，已有不动）。含完整映射快照 + 存储过程。model 新增字段后需重新生成 `_tc` 映射段。
