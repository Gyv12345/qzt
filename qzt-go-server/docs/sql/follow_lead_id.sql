-- follow_lead_id.sql 跟进记录/计划表新增 lead_id 列,打通线索跟进链路。
--
-- 背景:FollowUpRecord/FollowUpPlan 此前只能关联 客户/商机/联系人/合同,无法关联线索,
--   导致线索的 follow_time 永不被更新,公海自动回收对线索基本失效(恒判逾期)。
--   新增 lead_id 后,跟进记录可关联线索,并联动更新 crm_lead.follow_time。
--
-- 幂等:用 INFORMATION_SCHEMA 检查列/索引是否存在,可重复执行(需 mysql 客户端支持预处理)。
-- 执行方式二选一:
--   A) mysql 客户端:source 本文件(支持预处理,幂等)
--   B) DBX MCP:database=qztgo,逐条执行下方不带预处理的 4 条 ALTER(每条单独发)
-- 注意:本脚本已于 2026-08-07 在生产/开发库执行过,DBX 单语句模式不支持预处理。
-- 关联代码:model/crm/follow.go (LeadID 字段)、service/lead.go (UpdateFollow)、
--   service/follow.go (CreateRecord/CreatePlan 联动)。

-- ======================================================================
-- 1. follow_up_record 新增 lead_id 列 + 索引
-- ======================================================================
SET @db := DATABASE();
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'follow_up_record' AND COLUMN_NAME = 'lead_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `follow_up_record` ADD COLUMN `lead_id` bigint unsigned NULL COMMENT ''关联线索'' AFTER `owner_id`',
  'SELECT ''follow_up_record.lead_id 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- lead_id 索引(跟进时间线按线索查询用)
SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'follow_up_record' AND INDEX_NAME = 'idx_follow_record_lead'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE `follow_up_record` ADD INDEX `idx_follow_record_lead` (`lead_id`)',
  'SELECT ''idx_follow_record_lead 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ======================================================================
-- 2. follow_up_plan 新增 lead_id 列 + 索引
-- ======================================================================
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'follow_up_plan' AND COLUMN_NAME = 'lead_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `follow_up_plan` ADD COLUMN `lead_id` bigint unsigned NULL COMMENT ''关联线索'' AFTER `owner_id`',
  'SELECT ''follow_up_plan.lead_id 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'follow_up_plan' AND INDEX_NAME = 'idx_follow_plan_lead'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE `follow_up_plan` ADD INDEX `idx_follow_plan_lead` (`lead_id`)',
  'SELECT ''idx_follow_plan_lead 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
