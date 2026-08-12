-- crm_seas.sql 公海重构:默认池标识 + 池菜单挪到配置目录 + 新增客户公海/线索公海菜单。
-- 经 DBX MCP「我的阿里云数据库」(database=qztgo)执行。幂等。

-- 1) 默认池标识 is_default(列不存在才加,幂等)
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_customer_pool' AND COLUMN_NAME='is_default');
SET @s := IF(@e=0, 'ALTER TABLE `crm_customer_pool` ADD COLUMN `is_default` tinyint DEFAULT 0 COMMENT ''是否默认池(不可删)''', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_lead_pool' AND COLUMN_NAME='is_default');
SET @s := IF(@e=0, 'ALTER TABLE `crm_lead_pool` ADD COLUMN `is_default` tinyint DEFAULT 0 COMMENT ''是否默认池(不可删)''', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 标记 id=1 的池为默认(不可删)
UPDATE `crm_customer_pool` SET `is_default` = 1 WHERE `id` = 1;
UPDATE `crm_lead_pool` SET `is_default` = 1 WHERE `id` = 1;

-- 2) 池配置菜单挪到 CRM 配置目录(parent_id 130)
UPDATE `sys_menu` SET `parent_id` = 130 WHERE `id` IN (100, 352);

-- 3) 新增「客户公海」「线索公海」菜单(path 不存在才插,幂等)
INSERT INTO `sys_menu` (`parent_id`, `name`, `path`, `component`, `type`, `permission`, `sort`)
SELECT 128, '客户公海', '/crm/customer-sea', 'crm/customer-sea/index', 1, 'crm:customer:pick', 2
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `path` = '/crm/customer-sea');

INSERT INTO `sys_menu` (`parent_id`, `name`, `path`, `component`, `type`, `permission`, `sort`)
SELECT 350, '线索公海', '/crm/lead-sea', 'crm/lead-sea/index', 1, 'crm:lead:pick', 2
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `path` = '/crm/lead-sea');

-- 4) 给 super_admin(role_id=1)分配新菜单(幂等)
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT 1, m.id FROM `sys_menu` m
WHERE m.`path` = '/crm/customer-sea'
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.`sys_role_id` = 1 AND rm.`sys_menu_id` = m.id);

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT 1, m.id FROM `sys_menu` m
WHERE m.`path` = '/crm/lead-sea'
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.`sys_role_id` = 1 AND rm.`sys_menu_id` = m.id);
