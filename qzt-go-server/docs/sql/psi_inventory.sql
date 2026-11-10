-- psi_inventory.sql P15 库存盘点/调拨单:4 张新表 + 菜单/API/Casbin 授权种子。
-- 幂等:CREATE TABLE IF NOT EXISTS + 固定 ID + ON DUPLICATE KEY。
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行。
-- ID 分配:sys_menu 2242~2251(当前最大 2241);sys_api 723~735(当前最大 722);
--         casbin_rule 授予 super_admin + sales_director(与 /psi/stock-in-orders 同面)。
-- 注意:casbin_rule 运行期插入不生效,须重启 qzt-server 后加载(dev/prod 均需重启)。

-- ======================================================================
-- 1. 建表(4 张)
-- ======================================================================

-- 1.1 盘点主表
CREATE TABLE IF NOT EXISTS `psi_stocktake` (
  `id`           bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `stocktake_no` varchar(64)     NOT NULL COMMENT '盘点单号(PD+日期+纳秒尾)',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '盘点仓库ID',
  `status`       tinyint         NOT NULL DEFAULT 1 COMMENT '1盘点中 2已确认 3已作废',
  `take_date`    datetime        DEFAULT NULL COMMENT '盘点日期',
  `operator_id`  bigint unsigned DEFAULT NULL COMMENT '发起人ID',
  `confirm_time` datetime        DEFAULT NULL COMMENT '确认时间',
  `remark`       varchar(500)    DEFAULT NULL COMMENT '盘点说明',
  `created_at`   datetime(3)     DEFAULT NULL,
  `updated_at`   datetime(3)     DEFAULT NULL,
  `deleted_at`   datetime(3)     DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`stocktake_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存盘点单';

-- 1.2 盘点明细表
CREATE TABLE IF NOT EXISTS `psi_stocktake_item` (
  `id`           bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `stocktake_id` bigint unsigned NOT NULL COMMENT '盘点单ID',
  `product_id`   bigint unsigned NOT NULL COMMENT '商品ID',
  `sku_id`       bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID(0=历史数据未指定)',
  `expected_qty` decimal(14,3)   NOT NULL COMMENT '账面数量(发起时快照)',
  `actual_qty`   decimal(14,3)   DEFAULT NULL COMMENT '实盘数量(未盘为NULL)',
  `diff_qty`     decimal(14,3)   NOT NULL DEFAULT 0 COMMENT '差异数量(确认时计算 actual-expected)',
  `remark`       varchar(500)    DEFAULT NULL COMMENT '备注',
  `created_at`   datetime(3)     DEFAULT NULL,
  `updated_at`   datetime(3)     DEFAULT NULL,
  `deleted_at`   datetime(3)     DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_stocktake` (`stocktake_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存盘点明细';

-- 1.3 调拨主表
CREATE TABLE IF NOT EXISTS `psi_stock_transfer` (
  `id`                bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `transfer_no`       varchar(64)     NOT NULL COMMENT '调拨单号(DB+日期+纳秒尾)',
  `from_warehouse_id` bigint unsigned NOT NULL COMMENT '调出仓库ID',
  `to_warehouse_id`   bigint unsigned NOT NULL COMMENT '调入仓库ID',
  `status`            tinyint         NOT NULL DEFAULT 1 COMMENT '1在途 2完成 3已作废',
  `transfer_date`     datetime        DEFAULT NULL COMMENT '调拨日期',
  `operator_id`       bigint unsigned DEFAULT NULL COMMENT '经办人ID',
  `execute_time`      datetime        DEFAULT NULL COMMENT '执行时间',
  `remark`            varchar(500)    DEFAULT NULL COMMENT '调拨说明',
  `created_at`        datetime(3)     DEFAULT NULL,
  `updated_at`        datetime(3)     DEFAULT NULL,
  `deleted_at`        datetime(3)     DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`transfer_no`),
  KEY `idx_from_warehouse` (`from_warehouse_id`),
  KEY `idx_to_warehouse` (`to_warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存调拨单';

-- 1.4 调拨明细表
CREATE TABLE IF NOT EXISTS `psi_stock_transfer_item` (
  `id`          bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `transfer_id` bigint unsigned NOT NULL COMMENT '调拨单ID',
  `product_id`  bigint unsigned NOT NULL COMMENT '商品ID',
  `sku_id`      bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID(0=历史数据未指定)',
  `quantity`    decimal(14,3)   NOT NULL COMMENT '调拨数量',
  `remark`      varchar(500)    DEFAULT NULL COMMENT '备注',
  `created_at`  datetime(3)     DEFAULT NULL,
  `updated_at`  datetime(3)     DEFAULT NULL,
  `deleted_at`  datetime(3)     DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_transfer` (`transfer_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存调拨明细';

-- ======================================================================
-- 2. sys_menu:库存管理(173)下新增「库存盘点」「库存调拨」两页+按钮
-- ======================================================================

DELETE FROM `sys_menu` WHERE `id` BETWEEN 2242 AND 2251 AND `permission` NOT LIKE 'psi:stock%';
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`, `deleted_at`)
VALUES
  (2242, 173, '库存盘点', '/psi/stocktake',   'psi/stocktake/index',   'FileSearchOutlined', 4, 1, 'psi:stocktake:list',     1, 1, NOW(3), NOW(3), NULL),
  (2243, 2242, '新增盘点', '', '', '', 0, 2, 'psi:stocktake:add',     1, 1, NOW(3), NOW(3), NULL),
  (2244, 2242, '确认盘点', '', '', '', 0, 2, 'psi:stocktake:confirm', 1, 1, NOW(3), NOW(3), NULL),
  (2245, 2242, '作废盘点', '', '', '', 0, 2, 'psi:stocktake:cancel',  1, 1, NOW(3), NOW(3), NULL),
  (2246, 2242, '删除盘点', '', '', '', 0, 2, 'psi:stocktake:delete',  1, 1, NOW(3), NOW(3), NULL),
  (2247, 173, '库存调拨', '/psi/stocktransfer', 'psi/stocktransfer/index', 'SwapOutlined', 5, 1, 'psi:stocktransfer:list', 1, 1, NOW(3), NOW(3), NULL),
  (2248, 2247, '新增调拨', '', '', '', 0, 2, 'psi:stocktransfer:add',     1, 1, NOW(3), NOW(3), NULL),
  (2249, 2247, '执行调拨', '', '', '', 0, 2, 'psi:stocktransfer:execute', 1, 1, NOW(3), NOW(3), NULL),
  (2250, 2247, '作废调拨', '', '', '', 0, 2, 'psi:stocktransfer:cancel',  1, 1, NOW(3), NOW(3), NULL),
  (2251, 2247, '删除调拨', '', '', '', 0, 2, 'psi:stocktransfer:delete',  1, 1, NOW(3), NOW(3), NULL);

-- 菜单授权:超管(1)+销售总监(9,sales_director,与进销存其他页同面)
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
VALUES (1,2242),(1,2243),(1,2244),(1,2245),(1,2246),(1,2247),(1,2248),(1,2249),(1,2250),(1,2251),
       (9,2242),(9,2243),(9,2244),(9,2245),(9,2246),(9,2247),(9,2248),(9,2249),(9,2250),(9,2251)
ON DUPLICATE KEY UPDATE `sys_role_id`=`sys_role_id`;

-- ======================================================================
-- 3. sys_api:盘点/调拨接口注册(723~735)
-- ======================================================================

DELETE FROM `sys_api` WHERE `id` BETWEEN 723 AND 735 AND `path` NOT LIKE '/psi/stocktake%' AND `path` NOT LIKE '/psi/stock-transfer%';
INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
  (723, '/psi/stocktake-orders', 'GET',    'PSI', '盘点单列表',   NOW(3), NOW(3), NULL),
  (724, '/psi/stocktake-orders', 'POST',   'PSI', '创建盘点单',   NOW(3), NOW(3), NULL),
  (725, '/psi/stocktake-orders/:id', 'GET', 'PSI', '盘点单详情',  NOW(3), NOW(3), NULL),
  (726, '/psi/stocktake-orders/:id', 'PUT', 'PSI', '录实盘数',    NOW(3), NOW(3), NULL),
  (727, '/psi/stocktake-orders/:id/confirm', 'POST', 'PSI', '确认盘点(派生盘盈亏流水)', NOW(3), NOW(3), NULL),
  (728, '/psi/stocktake-orders/:id/cancel', 'PUT', 'PSI', '作废盘点单', NOW(3), NOW(3), NULL),
  (729, '/psi/stocktake-orders/:id', 'DELETE', 'PSI', '删除盘点单', NOW(3), NOW(3), NULL),
  (730, '/psi/stock-transfer-orders', 'GET',   'PSI', '调拨单列表', NOW(3), NOW(3), NULL),
  (731, '/psi/stock-transfer-orders', 'POST',  'PSI', '创建调拨单', NOW(3), NOW(3), NULL),
  (732, '/psi/stock-transfer-orders/:id', 'GET', 'PSI', '调拨单详情', NOW(3), NOW(3), NULL),
  (733, '/psi/stock-transfer-orders/:id/execute', 'POST', 'PSI', '执行调拨(出+入同事务)', NOW(3), NOW(3), NULL),
  (734, '/psi/stock-transfer-orders/:id/cancel', 'PUT', 'PSI', '作废调拨单', NOW(3), NOW(3), NULL),
  (735, '/psi/stock-transfer-orders/:id', 'DELETE', 'PSI', '删除调拨单', NOW(3), NOW(3), NULL);

-- ======================================================================
-- 4. casbin_rule:super_admin + sales_director 授权(重启后生效)
-- ======================================================================

INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`)
SELECT 'p', rc.code, a.path, a.method FROM
  (SELECT 'super_admin' AS code UNION SELECT 'sales_director') rc
  JOIN sys_api a ON a.id BETWEEN 723 AND 735
WHERE NOT EXISTS (
  SELECT 1 FROM casbin_rule cr
  WHERE cr.ptype='p' AND cr.v0=rc.code AND cr.v1=a.path AND cr.v2=a.method
);
