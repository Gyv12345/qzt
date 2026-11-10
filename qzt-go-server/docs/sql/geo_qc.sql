-- geo_qc.sql — P18 AI 质检门禁配套：geo_source 加质检列 + 手动质检接口/按钮的 API 与菜单种子。
-- ID 分配：sys_api 791（当前最大 790）；sys_menu 2296（当前最大 2295，挂营销 GEO 页 2210 下）。
-- 授权：super_admin(1)（与信源库现有按钮 2224~2231 授权范围一致）。
-- 幂等：information_schema 守卫 ALTER + 固定 ID ON DUPLICATE KEY + casbin NOT EXISTS。
-- 执行方式：DBX MCP 执行（database=qztgo）或手动 mysql。casbin 运行期插入不生效，须重启 qzt-server。

-- ======================================================================
-- 1. geo_source 加 qc_status / qc_result 两列（幂等守卫 ALTER）
-- ======================================================================
SET @has_qc_status = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='geo_source' AND COLUMN_NAME='qc_status');
SET @ddl1 = IF(@has_qc_status=0,
  'ALTER TABLE `geo_source` ADD COLUMN `qc_status` varchar(16) NOT NULL DEFAULT ''none'' COMMENT ''AI质检状态(none/pass/warn/blocked)'' AFTER `error`',
  'SELECT 1');
PREPARE s1 FROM @ddl1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @has_qc_result = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='geo_source' AND COLUMN_NAME='qc_result');
SET @ddl2 = IF(@has_qc_result=0,
  'ALTER TABLE `geo_source` ADD COLUMN `qc_result` json NULL COMMENT ''AI质检结果JSON(分维度得分/原文定位/修改建议/checked_at/model)'' AFTER `qc_status`',
  'SELECT 1');
PREPARE s2 FROM @ddl2; EXECUTE s2; DEALLOCATE PREPARE s2;

-- ======================================================================
-- 2. sys_api 791：手动质检接口
-- ======================================================================
INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
  (791, '/geo/sources/:id/qc', 'POST', 'GEO', '稿件手动质检', NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `description`=VALUES(`description`), `updated_at`=NOW(3);

-- ======================================================================
-- 3. sys_menu 2296：质检按钮（挂营销 GEO 页 2210 下）
-- ======================================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`, `deleted_at`)
VALUES
  (2296, 2210, '质检稿件', '', '', '', 0, 2, 'marketing:geo:source:qc', 1, 1, NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `updated_at`=NOW(3);

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
VALUES (1,2296)
ON DUPLICATE KEY UPDATE `sys_role_id`=`sys_role_id`;

-- ======================================================================
-- 4. casbin 授权（幂等 NOT EXISTS；运行期插入不生效，须重启 qzt-server）
-- ======================================================================
INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`)
SELECT 'p', 'super_admin', a.path, a.method FROM sys_api a WHERE a.id = 791
AND NOT EXISTS (
  SELECT 1 FROM casbin_rule cr
  WHERE cr.ptype='p' AND cr.v0='super_admin' AND cr.v1=a.path AND cr.v2=a.method
);
