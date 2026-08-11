-- lead_customfield.sql
-- 为线索(Lead)新增自定义字段能力,并支持「线索 → 客户」转化时按字段映射带转自定义字段值。
-- 执行方式:经 DBX MCP「我的阿里云数据库」(database=qztgo)或手动 mysql 执行。幂等,可重复执行。
-- 依赖:sys_module_form / sys_module_field / customer_field 已存在(qztgo.sql)。
--
-- 改动:
--   1) 新建 lead_field / lead_field_blob(结构镜像 customer_field,存线索的自定义字段值)。
--   2) 在 sys_module_form 注册「线索」模块(form_key=LEAD,唯一,INSERT IGNORE 幂等)。
--   3) 给 sys_module_field 加列 convert_target_field(线索字段配置「转化到客户时映射到哪个客户字段」;
--      其他模块该列闲置)。MySQL 无 ADD COLUMN IF NOT EXISTS,用 information_schema 判断实现幂等。

-- 1) 线索自定义字段值表(单值)
CREATE TABLE IF NOT EXISTS `lead_field` (
  `id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '线索ID',
  `field_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字段ID',
  `field_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字段值',
  PRIMARY KEY (`id`),
  KEY `idx_lead_rfv` (`resource_id`,`field_id`,`field_value`),
  KEY `idx_lead_field_field_id` (`field_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 线索自定义字段值表(BLOB 大值)
CREATE TABLE IF NOT EXISTS `lead_field_blob` (
  `id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lead_field_blob_resource_id` (`resource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) 注册「线索」表单模块
INSERT IGNORE INTO `sys_module_form` (`id`, `form_key`, `name`) VALUES ('f_lead', 'LEAD', '线索');

-- 3) 字段定义表加「转化映射目标字段」列(幂等)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_module_field' AND COLUMN_NAME = 'convert_target_field'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `sys_module_field` ADD COLUMN `convert_target_field` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''转化映射目标字段ID(线索字段→客户字段)''',
  'SELECT ''convert_target_field already exists'' AS msg'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
