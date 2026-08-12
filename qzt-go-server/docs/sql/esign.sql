-- esign.sql e签宝电子合同签署:任务表(容错)+ 合同字段。
-- 经 DBX MCP「我的阿里云数据库」(database=qztgo)执行。幂等。

-- 1) 电子签任务表(记录每次发起,支持 cron 重试)
CREATE TABLE IF NOT EXISTS `crm_esign_task` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `contract_id` bigint unsigned NOT NULL COMMENT '合同ID',
  `template_id` bigint unsigned NOT NULL COMMENT '合同模板ID(渲染PDF用)',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/RUNNING/READY/INITIATED/COMPLETED/FAILED',
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

-- 3) sys_config e签宝凭证配置(值留空,管理员后台填)。
--    通过后台「系统配置」页填写,无需重启(setting.Get 热读)。
INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'esign', 'esign.enabled', '电子签开关', 'false', 'boolean', 0, 1, 1, 1, '总开关,false 时审批通过不自动生成签署 PDF'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'esign.enabled');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'esign', 'esign.app_id', 'e签宝 AppId', '', 'string', 0, 1, 1, 2, 'e签宝开放平台应用 AppId(后台填)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'esign.app_id');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'esign', 'esign.app_secret', 'e签宝 AppSecret', '', 'string', 0, 1, 1, 3, 'e签宝应用密钥(后台填,用于 HMAC 签名)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'esign.app_secret');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'esign', 'esign.base_url', 'e签宝 BaseURL', 'https://smlopenapi.esign.cn', 'string', 0, 1, 1, 4, '沙箱 smlopenapi.esign.cn / 正式 openapi.esign.cn'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'esign.base_url');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'esign', 'esign.callback_url', '签署回调地址', 'https://devlovecode.com/crm/public/esign/callback', 'string', 0, 1, 1, 5, 'e签宝签署状态回调(公网可达,免鉴权验签);需在 e签宝后台同步配置'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'esign.callback_url');

-- 4) sys_job 定时任务:扫描 PENDING/FAILED 的电子签任务,渲染 PDF / 重试。
--    bean_class 必须与 crm/service/esign_job.go 的 RegisterJobHandler 完全一致。
INSERT INTO `sys_job` (`job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`)
SELECT '电子签PDF生成重试', 'crm', '0 */5 * * * *', 'crm.esign.retry', 1, '每5分钟扫描 PENDING/FAILED 任务,渲染签署 PDF(半自动:停在 READY 待补签署方)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_job` WHERE `bean_class` = 'crm.esign.retry');

-- 5) casbin_rule 权限:电子签发起/查询接口(super_admin 跳过 RBAC,此处供其他角色分配用)。
--    回调 /crm/public/esign/callback 走 public 组免鉴权,无需 casbin。
INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`, `v3`, `v4`, `v5`)
SELECT 'p', 'super_admin', '/crm/contracts/:id/esign/initiate', 'POST', '', '', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `casbin_rule` WHERE `ptype`='p' AND `v0`='super_admin' AND `v1`='/crm/contracts/:id/esign/initiate' AND `v2`='POST');

INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`, `v3`, `v4`, `v5`)
SELECT 'p', 'super_admin', '/crm/contracts/:id/esign', 'GET', '', '', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `casbin_rule` WHERE `ptype`='p' AND `v0`='super_admin' AND `v1`='/crm/contracts/:id/esign' AND `v2`='GET');

