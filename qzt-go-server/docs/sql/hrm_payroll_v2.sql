-- hrm_payroll_v2.sql P16 薪酬 v2:社保方案表 + 工资项(公式)表 + 薪酬结构挂方案。
-- 幂等:CREATE TABLE IF NOT EXISTS + information_schema 守卫 ALTER。
-- 执行方式:DBX MCP database=qztgo 逐段执行。
-- 菜单/API 段随 P16-2(后端接线完成时)补发。

-- ======================================================================
-- 1. 建表(2 张)
-- ======================================================================

CREATE TABLE IF NOT EXISTS `hrm_insurance_plan` (
  `id`               bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`             varchar(64)     NOT NULL COMMENT '方案名称',
  `pension_rate`     decimal(6,4)    NOT NULL DEFAULT 0 COMMENT '养老比例(如 0.0800)',
  `medical_rate`     decimal(6,4)    NOT NULL DEFAULT 0 COMMENT '医疗比例',
  `unemployment_rate` decimal(6,4)   NOT NULL DEFAULT 0 COMMENT '失业比例',
  `injury_rate`      decimal(6,4)    NOT NULL DEFAULT 0 COMMENT '工伤比例',
  `maternity_rate`   decimal(6,4)    NOT NULL DEFAULT 0 COMMENT '生育比例',
  `fund_rate`        decimal(6,4)    NOT NULL DEFAULT 0 COMMENT '公积金比例',
  `base_min`         decimal(14,2)   DEFAULT NULL COMMENT '基数下限(NULL=不限)',
  `base_max`         decimal(14,2)   DEFAULT NULL COMMENT '基数上限(NULL=不限)',
  `status`           tinyint         NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `created_at`       datetime(3)     DEFAULT NULL,
  `updated_at`       datetime(3)     DEFAULT NULL,
  `deleted_at`       datetime(3)     DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社保公积金方案(多方案,比例可配)';

CREATE TABLE IF NOT EXISTS `hrm_salary_item` (
  `id`         bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `code`       varchar(32)  NOT NULL COMMENT '工资项编码(公式引用,如 BASE_SALARY)',
  `name`       varchar(64)  NOT NULL COMMENT '工资项名称',
  `kind`       varchar(16)  NOT NULL COMMENT 'INCOME收入 / DEDUCT扣款 / TAX扣税',
  `formula`    varchar(255) DEFAULT NULL COMMENT '计算公式(受限四则:数字/项编码/+ - * / 括号/round(x,n);NULL=固定值项)',
  `fixed_amount` decimal(14,2) DEFAULT NULL COMMENT '固定值(无公式时使用)',
  `sort`       int          NOT NULL DEFAULT 0 COMMENT '排序(求值顺序,小在前)',
  `status`     tinyint      NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `created_at` datetime(3)  DEFAULT NULL,
  `updated_at` datetime(3)  DEFAULT NULL,
  `deleted_at` datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工资项定义(公式引擎求值)';

-- ======================================================================
-- 2. hrm_salary_structure 挂社保方案(plan_id,守卫可重复执行)
-- ======================================================================

SET @has_plan = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hrm_salary_structure' AND COLUMN_NAME='plan_id');
SET @ddl = IF(@has_plan=0,
  'ALTER TABLE `hrm_salary_structure` ADD COLUMN `plan_id` bigint unsigned DEFAULT NULL COMMENT ''社保方案ID(NULL=沿用内置硬比例)'' AFTER `social_ins_rate`',
  'SELECT 1');
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;
