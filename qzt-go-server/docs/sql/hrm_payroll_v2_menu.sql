-- hrm_payroll_v2_menu.sql P16-2 薪酬接线配套:
-- hrm_payroll 加工资项快照列 + 「薪酬设置」菜单(方案/工资项管理) + sys_api/casbin。
-- 幂等:information_schema 守卫 ALTER + 固定 ID + ON DUPLICATE KEY。
-- ID 分配:sys_menu 2256~2259(当前最大 2255);sys_api 751~758(当前最大 750);
--         casbin 授予 super_admin + hr。casbin 运行期插入不生效,须重启 qzt-server。

-- ======================================================================
-- 1. hrm_payroll 加 items_snapshot(工资项求值快照,新模式工资条落 JSON;旧模式 NULL)
-- ======================================================================

SET @has_snap = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hrm_payroll' AND COLUMN_NAME='items_snapshot');
SET @ddl = IF(@has_snap=0,
  'ALTER TABLE `hrm_payroll` ADD COLUMN `items_snapshot` text COMMENT ''工资项求值快照JSON([{code,name,kind,amount}],公式引擎模式;传统模式NULL)'' AFTER `net_pay`',
  'SELECT 1');
PREPARE s0 FROM @ddl; EXECUTE s0; DEALLOCATE PREPARE s0;

-- ======================================================================
-- 2. sys_menu「薪酬设置」页(挂人事管理 874 下,社保方案+工资项两 Tab)
-- ======================================================================

DELETE FROM `sys_menu` WHERE `id` BETWEEN 2256 AND 2259 AND `permission` NOT LIKE 'hrm:payroll-config%';
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`, `deleted_at`)
VALUES
  (2256, 874, '薪酬设置', '/hrm/payroll-config', 'hrm/payroll-config/index', 'MoneyCollectOutlined', 6, 1, 'hrm:payroll-config:list', 1, 1, NOW(3), NOW(3), NULL),
  (2257, 2256, '薪酬配置新增', '', '', '', 0, 2, 'hrm:payroll-config:add', 1, 1, NOW(3), NOW(3), NULL),
  (2258, 2256, '薪酬配置编辑', '', '', '', 0, 2, 'hrm:payroll-config:edit', 1, 1, NOW(3), NOW(3), NULL),
  (2259, 2256, '薪酬配置删除', '', '', '', 0, 2, 'hrm:payroll-config:delete', 1, 1, NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `updated_at`=NOW(3);

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
VALUES (1,2256),(1,2257),(1,2258),(1,2259),(9,2256),(9,2257),(9,2258),(9,2259)
ON DUPLICATE KEY UPDATE `sys_role_id`=`sys_role_id`;

-- ======================================================================
-- 3. sys_api(751~758) + casbin 授权(super_admin + hr)
-- ======================================================================

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
  (751, '/hrm/insurance-plans', 'GET',    'HRM', '社保方案列表', NOW(3), NOW(3), NULL),
  (752, '/hrm/insurance-plans', 'POST',   'HRM', '新建社保方案', NOW(3), NOW(3), NULL),
  (753, '/hrm/insurance-plans/:id', 'PUT', 'HRM', '更新社保方案', NOW(3), NOW(3), NULL),
  (754, '/hrm/insurance-plans/:id', 'DELETE', 'HRM', '删除社保方案', NOW(3), NOW(3), NULL),
  (755, '/hrm/salary-items', 'GET',   'HRM', '工资项列表', NOW(3), NOW(3), NULL),
  (756, '/hrm/salary-items', 'POST',  'HRM', '新建工资项', NOW(3), NOW(3), NULL),
  (757, '/hrm/salary-items/:id', 'PUT', 'HRM', '更新工资项', NOW(3), NOW(3), NULL),
  (758, '/hrm/salary-items/:id', 'DELETE', 'HRM', '删除工资项', NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `description`=VALUES(`description`), `updated_at`=NOW(3);

INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`)
SELECT 'p', rc.code, a.path, a.method FROM
  (SELECT 'super_admin' AS code UNION SELECT 'hr') rc
  JOIN sys_api a ON a.id BETWEEN 751 AND 758
WHERE NOT EXISTS (
  SELECT 1 FROM casbin_rule cr
  WHERE cr.ptype='p' AND cr.v0=rc.code AND cr.v1=a.path AND cr.v2=a.method
);
