-- approval_transfer.sql P13 审批转办/委托:approval_task 加 delegator_id 列 + 「审批转办」按钮菜单。
-- 幂等:delegator_id 用 information_schema 守卫可重复执行;菜单用固定 ID + ON DUPLICATE KEY。
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行(2026-11-05 已执行)。
-- ID 分配:sys_menu 2241(当前最大 2240,顺延);sys_role_menu 按现持有 approval:todo:approve(菜单 133)的同一批角色(1/3/4/9/10)。

-- ======================================================================
-- 1. approval_task 加 delegator_id(上一手审批人,转办/委托留痕)
-- ======================================================================

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'approval_task'
    AND COLUMN_NAME = 'delegator_id'
);
SET @ddl = IF(@col_exists = 0,
  'ALTER TABLE `approval_task` ADD COLUMN `delegator_id` bigint unsigned DEFAULT NULL COMMENT ''上一手审批人(转办让渡/委托代审留痕,委托时=原审批人)'' AFTER `approver_id`',
  'SELECT ''delegator_id already exists, skip'' AS note');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ======================================================================
-- 2. sys_menu 按钮「审批转办」(parent=132 我的待办,perm approval:todo:transfer)
-- ======================================================================

DELETE FROM `sys_menu` WHERE `id` = 2241 AND `permission` <> 'approval:todo:transfer';
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`, `deleted_at`)
VALUES (2241, 132, '审批转办', '', '', '', 3, 2, 'approval:todo:transfer', 1, 1, NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `parent_id`=132, `name`='审批转办', `sort`=3, `type`=2, `permission`='approval:todo:transfer', `visible`=1, `status`=1, `deleted_at`=NULL;

-- ======================================================================
-- 3. sys_role_menu:与 approval:todo:approve(菜单 133)同批角色(1/3/4/9/10)发授权
-- ======================================================================

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
VALUES (1,2241),(3,2241),(4,2241),(9,2241),(10,2241)
ON DUPLICATE KEY UPDATE `sys_role_id`=`sys_role_id`;
