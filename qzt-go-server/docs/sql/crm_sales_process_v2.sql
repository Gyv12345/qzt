-- crm_sales_process_v2.sql P-F7 销售过程管理 v2。
-- 内容:阶段历史发生时间/输单快照、当前阶段进入时间/输单原因/停滞提醒防重、输单原因字典。
-- 幂等:全部 DDL 使用 information_schema 守卫;字典按 code/value 去重,可重复执行。
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,整批执行;不新增菜单/API/job ID。
-- 注意:旧 stage_record 的 created_at 保持 NULL,不得用迁移时间伪造历史;旧商机 stage_entered_at 同样保持 NULL。

-- 1. stage_record:真实阶段进入时间与结构化输单原因快照。
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='stage_record' AND COLUMN_NAME='created_at');
SET @ddl = IF(@col_exists=0,
  'ALTER TABLE `stage_record` ADD COLUMN `created_at` datetime(3) DEFAULT NULL COMMENT ''进入新阶段时间'' AFTER `reason`',
  'SELECT ''stage_record.created_at already exists, skip'' AS note');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='stage_record' AND COLUMN_NAME='lost_reason');
SET @ddl = IF(@col_exists=0,
  'ALTER TABLE `stage_record` ADD COLUMN `lost_reason` varchar(64) DEFAULT NULL COMMENT ''结构化输单原因'' AFTER `reason`',
  'SELECT ''stage_record.lost_reason already exists, skip'' AS note');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='stage_record' AND INDEX_NAME='idx_stage_record_biz_resource_id');
SET @ddl = IF(@idx_exists=0,
  'ALTER TABLE `stage_record` ADD INDEX `idx_stage_record_biz_resource_id` (`biz_type`,`resource_id`,`id`)',
  'SELECT ''stage_record composite index already exists, skip'' AS note');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. crm_opportunity:当前阶段停留与提醒状态。
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_opportunity' AND COLUMN_NAME='stage_entered_at');
SET @ddl = IF(@col_exists=0,
  'ALTER TABLE `crm_opportunity` ADD COLUMN `stage_entered_at` datetime(3) DEFAULT NULL COMMENT ''当前阶段进入时间'' AFTER `stage`',
  'SELECT ''crm_opportunity.stage_entered_at already exists, skip'' AS note');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_opportunity' AND COLUMN_NAME='lost_reason');
SET @ddl = IF(@col_exists=0,
  'ALTER TABLE `crm_opportunity` ADD COLUMN `lost_reason` varchar(64) DEFAULT NULL COMMENT ''结构化输单原因'' AFTER `stage_entered_at`',
  'SELECT ''crm_opportunity.lost_reason already exists, skip'' AS note');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_opportunity' AND COLUMN_NAME='stage_stagnant_reminded_on');
SET @ddl = IF(@col_exists=0,
  'ALTER TABLE `crm_opportunity` ADD COLUMN `stage_stagnant_reminded_on` date DEFAULT NULL COMMENT ''当前阶段停滞提醒日期'' AFTER `lost_reason`',
  'SELECT ''crm_opportunity.stage_stagnant_reminded_on already exists, skip'' AS note');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. 输单原因字典(不依赖固定 ID,避免与后续字典种子冲突)。
INSERT INTO `sys_dict` (`name`,`code`,`status`,`remark`,`created_at`,`updated_at`,`deleted_at`,`sort`)
SELECT '商机输单原因','OPPORTUNITY_LOST_REASON',1,'销售过程管理:结构化输单原因',NOW(3),NOW(3),NULL,0
WHERE NOT EXISTS (SELECT 1 FROM `sys_dict` WHERE `code`='OPPORTUNITY_LOST_REASON');

SET @lost_reason_dict_id = (SELECT `id` FROM `sys_dict` WHERE `code`='OPPORTUNITY_LOST_REASON' LIMIT 1);
DELETE FROM `sys_dict_item`
WHERE `dict_id`=@lost_reason_dict_id
  AND `value` IN ('PRICE','FEATURE','BUDGET','COMPETITOR','NO_DECISION','TIMING','OTHER');

INSERT INTO `sys_dict_item` (`dict_id`,`label`,`value`,`sort`,`status`,`remark`,`created_at`,`updated_at`,`deleted_at`) VALUES
(@lost_reason_dict_id,'价格或预算不匹配','PRICE',10,1,'报价或整体预算不匹配',NOW(3),NOW(3),NULL),
(@lost_reason_dict_id,'功能不满足','FEATURE',20,1,'关键功能或集成能力不满足',NOW(3),NOW(3),NULL),
(@lost_reason_dict_id,'项目无预算','BUDGET',30,1,'客户暂无立项或采购预算',NOW(3),NOW(3),NULL),
(@lost_reason_dict_id,'选择竞品','COMPETITOR',40,1,'客户选择其他厂商',NOW(3),NOW(3),NULL),
(@lost_reason_dict_id,'无决策人推进','NO_DECISION',50,1,'未触达决策人或内部无人推进',NOW(3),NOW(3),NULL),
(@lost_reason_dict_id,'时机不合适','TIMING',60,1,'采购计划延后或暂停',NOW(3),NOW(3),NULL),
(@lost_reason_dict_id,'其他原因','OTHER',99,1,'见阶段流转补充说明',NOW(3),NOW(3),NULL);
