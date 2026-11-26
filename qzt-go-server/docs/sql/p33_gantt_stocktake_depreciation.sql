-- ======================================================================
-- p33_gantt_stocktake_depreciation.sql — P33 项目甘特图 + 资产盘点 + 折旧计提
--
-- 用途:
--   1. proj_task 加三列(甘特图三要素): start_date / progress / is_milestone
--   2. 三张新表: psi_asset_stocktake / psi_asset_stocktake_item / psi_asset_depreciation_log
--   3. sys_api 885-891(盘点 5 + 折旧 2)
--   直接把 sys_api 885-891 逐条 INSERT,见第 3 节
--   4. sys_menu 2369 页面 + 2370-2372 按钮 + 2373(挂固定资产 940)
--   5. sys_job 32(asset.depreciate.monthly 每月 1 号 01:00)
--
-- ID 分配(2026-11-14 DBX 复核:sys_api MAX=884,sys_menu MAX=2368,sys_job MAX=31):
--   sys_api 885-891 / sys_menu 2369-2373 / sys_job 32
-- 执行方式: ALTER 逐条(已存在同名列报 Duplicate column 属正常,跳过即可);
--   其余 INSERT 幂等。通过 DBX MCP 逐条执行。casbin 插库后须重启 qzt-server。
-- ======================================================================

-- ============================================================
-- 1. ALTER —— proj_task 甘特图三列(逐条执行;已存在则跳过该条)
-- ============================================================
ALTER TABLE `proj_task` ADD COLUMN `start_date` DATE NULL COMMENT '开始日期(甘特图)';
ALTER TABLE `proj_task` ADD COLUMN `progress` int NOT NULL DEFAULT 0 COMMENT '进度0-100';
ALTER TABLE `proj_task` ADD COLUMN `is_milestone` tinyint NOT NULL DEFAULT 0 COMMENT '是否里程碑';

-- ============================================================
-- 2. 建表 —— 三张新表(IF NOT EXISTS 幂等)
-- ============================================================
CREATE TABLE IF NOT EXISTS `psi_asset_stocktake` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stocktake_no` varchar(32) NOT NULL COMMENT '盘点单号(PD+日期+序号)',
  `scope_type` varchar(20) NOT NULL COMMENT '盘点范围类型(all/category/dept)',
  `scope_value` varchar(64) DEFAULT '' COMMENT '范围值(分类名或部门ID,all时空)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1进行中 2已完成',
  `total_count` int NOT NULL DEFAULT '0' COMMENT '应盘总数(发起时快照)',
  `checked_count` int NOT NULL DEFAULT '0' COMMENT '已盘数(首次填报的明细数)',
  `stocktake_by` bigint unsigned NOT NULL COMMENT '发起人ID',
  `stocktake_at` datetime(3) DEFAULT NULL COMMENT '发起时间',
  `finished_at` datetime(3) DEFAULT NULL COMMENT '完成时间(未完成为空)',
  `remark` varchar(255) DEFAULT '' COMMENT '备注',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stocktake_no` (`stocktake_no`),
  KEY `idx_psi_asset_stocktake_status` (`status`),
  KEY `idx_psi_asset_stocktake_by` (`stocktake_by`),
  KEY `idx_psi_asset_stocktake_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产盘点单(范围快照式,区别于库存盘点 psi_stocktake)';

CREATE TABLE IF NOT EXISTS `psi_asset_stocktake_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stocktake_id` bigint unsigned NOT NULL COMMENT '盘点单ID',
  `asset_id` bigint unsigned NOT NULL COMMENT '资产ID',
  `asset_no` varchar(32) DEFAULT '' COMMENT '资产编号(发起时快照)',
  `asset_name` varchar(64) DEFAULT '' COMMENT '资产名称(发起时快照)',
  `expected_status` tinyint NOT NULL DEFAULT '0' COMMENT '盘点时资产状态快照(1使用2闲置3维修)',
  `result_status` tinyint DEFAULT NULL COMMENT '盘点结果(1在库2缺失3损坏,NULL未盘)',
  `result_remark` varchar(200) DEFAULT '' COMMENT '结果备注',
  `checked_by` bigint unsigned NOT NULL COMMENT '填报人ID',
  `checked_at` datetime(3) DEFAULT NULL COMMENT '填报时间(未盘为空)',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stocktake_item_stocktake` (`stocktake_id`),
  KEY `idx_stocktake_item_asset` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产盘点明细';

CREATE TABLE IF NOT EXISTS `psi_asset_depreciation_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL COMMENT '资产ID',
  `period` char(7) NOT NULL COMMENT '计提期间(YYYY-MM)',
  `amount` varchar(32) DEFAULT '' COMMENT '本期折旧额',
  `before_depreciation` varchar(32) DEFAULT '' COMMENT '计提前已折旧快照',
  `after_depreciation` varchar(32) DEFAULT '' COMMENT '计提后已折旧快照',
  `created_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_asset_period` (`asset_id`,`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产折旧计提日志((asset_id,period)唯一=幂等键)';

-- ============================================================
-- 3. sys_api —— 885-891(7 条)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_api_id` BETWEEN 885 AND 891;
DELETE FROM `sys_api` WHERE `id` BETWEEN 885 AND 891;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (885, '/psi/assets/stocktakes',                        'POST', '资产盘点', '新建资产盘点单(按范围生成明细快照,应盘 0 报错)', NOW(3), NOW(3)),
  (886, '/psi/assets/stocktakes',                        'GET',  '资产盘点', '资产盘点单分页列表', NOW(3), NOW(3)),
  (887, '/psi/assets/stocktakes/:id',                    'GET',  '资产盘点', '盘点单详情(头+全部明细)', NOW(3), NOW(3)),
  (888, '/psi/assets/stocktakes/:id/items/:itemId',      'PUT',  '资产盘点', '填报盘点结果(首报 CheckedCount+1;已完成单拒绝)', NOW(3), NOW(3)),
  (889, '/psi/assets/stocktakes/:id/finish',             'POST', '资产盘点', '完成盘点(全盘校验+差异联动资产状态,同事务)', NOW(3), NOW(3)),
  (890, '/psi/assets/depreciate/run',                    'POST', '资产盘点', '手动计提当月折旧(直线法,幂等)', NOW(3), NOW(3)),
  (891, '/psi/assets/:id/depreciation-logs',             'GET',  '资产盘点', '资产折旧计提日志', NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu —— 2369 页面 + 2370-2372 按钮 + 2373(挂固定资产 940)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2369 AND 2373;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2369 AND 2373;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2369 AND 2373;

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2369, 170, '资产盘点', '/psi/asset-stocktake', 'psi/asset-stocktake/index', 'AuditOutlined', 11, 1, 'psi:asset-stocktake:list', 1, 1, NOW(3), NOW(3)),
  (2370, 2369, '新建盘点', NULL, NULL, NULL, 1, 2, 'psi:asset-stocktake:add', 1, 1, NOW(3), NOW(3)),
  (2371, 2369, '填报结果', NULL, NULL, NULL, 2, 2, 'psi:asset-stocktake:item', 1, 1, NOW(3), NOW(3)),
  (2372, 2369, '完成盘点', NULL, NULL, NULL, 3, 2, 'psi:asset-stocktake:finish', 1, 1, NOW(3), NOW(3)),
  (2373, 940, '手动计提折旧', NULL, NULL, NULL, 4, 2, 'psi:asset:depreciate', 1, 1, NOW(3), NOW(3));

-- ============================================================
-- 5. sys_menu_api —— 按钮↔API 关联
--    2369 页面带 list+detail;891 折旧记录挂固定资产页 940(页面权限即可查看)。
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2369, 886), (2369, 887),
  (2370, 885),
  (2371, 888),
  (2372, 889),
  (2373, 890),
  (940, 891);

-- ============================================================
-- 6. sys_role_menu —— 超管(role 1)授予新菜单/按钮
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id IN (2369, 2370, 2371, 2372, 2373)
WHERE r.id = 1
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- ============================================================
-- 7. sys_job —— 32 资产折旧计提(每月 1 号 01:00,6 段式 cron)
-- ============================================================
DELETE FROM `sys_job` WHERE `id` = 32 AND `bean_class` = 'asset.depreciate.monthly';

INSERT INTO `sys_job` (`id`, `job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`) VALUES
  (32, '资产折旧计提', 'psi', '0 0 1 1 * *', 'asset.depreciate.monthly', 1, '每月 1 号 01:00 直线法计提当月折旧(原值/使用年限月数,净值扣至 0;仅状态 在用/闲置/维修 资产;(asset_id,period) 唯一索引幂等,重复触发自动跳过已计提资产)');

-- ============================================================
-- 验证(执行后自查)
-- ============================================================
-- SELECT COUNT(*) FROM sys_api  WHERE id BETWEEN 885 AND 891;   -- 7
-- SELECT COUNT(*) FROM sys_menu WHERE id BETWEEN 2369 AND 2373; -- 5
-- SELECT COUNT(*) FROM sys_menu_api WHERE sys_menu_id IN (2369,2370,2371,2372,2373,940) AND sys_api_id BETWEEN 885 AND 891; -- 7
-- SELECT COUNT(*) FROM sys_role_menu WHERE sys_menu_id IN (2369,2370,2371,2372,2373) AND sys_role_id = 1;  -- 5
-- SELECT id, job_name, bean_class FROM sys_job WHERE id = 32;   -- 1
-- SHOW COLUMNS FROM proj_task WHERE Field IN ('start_date','progress','is_milestone');  -- 3 行



