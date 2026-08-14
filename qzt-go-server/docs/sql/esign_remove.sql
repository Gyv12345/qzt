-- esign_remove.sql 电子签(e签宝)功能下线清理脚本。
-- 背景:e签宝 API 调用需单独付费,功能整体移除(后端 crm esign 模块/admin 合同页电子签 UI 均已删)。
-- 经 DBX MCP「我的阿里云数据库」(database=qztgo)执行。执行前已确认:
--   crm_esign_task 仅 1 条测试记录;crm_contract 无任何行启用过电子签。
-- 原 docs/sql/esign.sql(建表/种子)已删除。

-- 1) 电子签任务表
DROP TABLE IF EXISTS `crm_esign_task`;

-- 2) 合同表电子签列(MySQL 8 无 DROP COLUMN IF EXISTS,逐列判断)
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_contract' AND COLUMN_NAME='esign_enabled');
SET @s := IF(@e>0, 'ALTER TABLE `crm_contract` DROP COLUMN `esign_enabled`', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_contract' AND COLUMN_NAME='template_id');
SET @s := IF(@e>0, 'ALTER TABLE `crm_contract` DROP COLUMN `template_id`', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_contract' AND COLUMN_NAME='esign_flow_id');
SET @s := IF(@e>0, 'ALTER TABLE `crm_contract` DROP COLUMN `esign_flow_id`', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_contract' AND COLUMN_NAME='esign_status');
SET @s := IF(@e>0, 'ALTER TABLE `crm_contract` DROP COLUMN `esign_status`', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) sys_config e签宝凭证配置(5 条)
DELETE FROM `sys_config` WHERE `group` = 'esign';

-- 4) sys_job 定时任务(每 5 分钟渲染签署 PDF)
DELETE FROM `sys_job` WHERE `bean_class` = 'crm.esign.retry';

-- 5) casbin 权限(电子签接口)
DELETE FROM `casbin_rule` WHERE `v1` LIKE '%/esign%';
