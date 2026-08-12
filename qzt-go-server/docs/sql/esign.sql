-- esign.sql e签宝电子合同签署:任务表(容错)+ 合同字段。
-- 经 DBX MCP「我的阿里云数据库」(database=qztgo)执行。幂等。

-- 1) 电子签任务表(记录每次发起,支持 cron 重试)
CREATE TABLE IF NOT EXISTS `crm_esign_task` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `contract_id` bigint unsigned NOT NULL COMMENT '合同ID',
  `template_id` bigint unsigned NOT NULL COMMENT '合同模板ID(渲染PDF用)',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/RUNNING/SIGNED/FAILED',
  `flow_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'e签宝流程ID',
  `file_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生成PDF的私有桶objectKey',
  `sign_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '签署短链',
  `signers` text COLLATE utf8mb4_unicode_ci COMMENT '签署方JSON([{name,mobile,email}])',
  `retry_count` int NOT NULL DEFAULT 0,
  `next_retry_at` datetime DEFAULT NULL COMMENT '下次重试时间(失败退避)',
  `error` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '最近错误',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_esign_task_pending` (`status`,`next_retry_at`),
  KEY `idx_esign_task_contract` (`contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) 合同表加电子签字段(逐个幂等,MySQL 无 ADD COLUMN IF NOT EXISTS)
-- esign_enabled
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_contract' AND COLUMN_NAME='esign_enabled');
SET @s := IF(@e=0, 'ALTER TABLE `crm_contract` ADD COLUMN `esign_enabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT ''是否开启电子签''', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- template_id
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_contract' AND COLUMN_NAME='template_id');
SET @s := IF(@e=0, 'ALTER TABLE `crm_contract` ADD COLUMN `template_id` bigint unsigned DEFAULT NULL COMMENT ''合同模板ID(电子签渲染PDF用)''', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- esign_flow_id
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_contract' AND COLUMN_NAME='esign_flow_id');
SET @s := IF(@e=0, 'ALTER TABLE `crm_contract` ADD COLUMN `esign_flow_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''e签宝流程ID''', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- esign_status
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_contract' AND COLUMN_NAME='esign_status');
SET @s := IF(@e=0, 'ALTER TABLE `crm_contract` ADD COLUMN `esign_status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''NONE'' COMMENT ''NONE/INITIATED/SIGNING/SIGNED/FAILED''', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) sys_config e签宝凭证配置(值留空,管理员后台填)
--    key: esign.enabled / esign.app_id / esign.app_secret / esign.base_url / esign.callback_url
--    通过后台「系统配置」页填写,无需重启(setting.Get 热读)。
