-- product_sku.sql 商品规格 SKU 改造(2026-08-22)
--
-- 用途:商品引入 SKU(规格)维度 —— 新建 crm_product_sku 表;进销存库存结余改按
-- 「规格SKU+仓库」记账;采购/销售/退货/其他出入库/商城订单明细全部加 sku_id;
-- 存量商品自动补「默认规格」SKU(spec='',编号=商品编号),历史单据/库存回填。
--
-- 幂等性:建表 CREATE TABLE IF NOT EXISTS;ALTER 加列/索引为一次性语句
-- (MySQL 不支持 ADD COLUMN IF NOT EXISTS,重复执行会报 1060 重复列,忽略即可)。
-- 回填 UPDATE/INSERT 带 sku_id=0 / NOT EXISTS 守卫,可重复执行。
--
-- 执行方式:DBX MCP「我的阿里云数据库」逐条执行(多语句只生效第一条,须单语句单调用)。

-- ── 1. SKU 表 ──
CREATE TABLE IF NOT EXISTS `crm_product_sku` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL COMMENT '商品ID(引用crm_product.id)',
  `spec` varchar(128) NOT NULL DEFAULT '' COMMENT '规格描述(空=默认规格)',
  `sku_no` varchar(64) DEFAULT NULL COMMENT 'SKU编号',
  `price` decimal(14,2) DEFAULT NULL COMMENT '售价',
  `cost_price` decimal(14,2) DEFAULT NULL COMMENT '成本价',
  `image_url` varchar(512) DEFAULT NULL COMMENT '规格图URL',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_no` (`sku_no`),
  KEY `idx_product` (`product_id`),
  KEY `idx_crm_product_sku_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品规格SKU';

-- ── 2. 存量商品补默认规格 SKU(可重复执行) ──
INSERT INTO `crm_product_sku` (`product_id`, `spec`, `sku_no`, `price`, `cost_price`, `image_url`, `created_at`, `updated_at`)
SELECT p.id, '', IF(p.product_no = '', CONCAT('SKU-P', p.id), p.product_no),
       p.standard_price, p.cost_price, p.image_url, NOW(3), NOW(3)
FROM `crm_product` p
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM `crm_product_sku` s WHERE s.product_id = p.id AND s.deleted_at IS NULL);

-- ── 3. 库存结余改按 SKU+仓库 维度 ──
ALTER TABLE `psi_stock` ADD COLUMN `sku_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID' AFTER `product_id`;

UPDATE `psi_stock` st
JOIN `crm_product_sku` s ON s.product_id = st.product_id AND s.spec = '' AND s.deleted_at IS NULL
SET st.sku_id = s.id
WHERE st.sku_id = 0 AND st.deleted_at IS NULL;

ALTER TABLE `psi_stock` DROP INDEX `uk_product_warehouse`, ADD UNIQUE KEY `uk_sku_warehouse` (`sku_id`, `warehouse_id`);

-- ── 4. 库存流水加 SKU ──
ALTER TABLE `psi_stock_movement` ADD COLUMN `sku_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID' AFTER `product_id`;

ALTER TABLE `psi_stock_movement` ADD KEY `idx_psi_stock_movement_sku_id` (`sku_id`);

UPDATE `psi_stock_movement` m
JOIN `crm_product_sku` s ON s.product_id = m.product_id AND s.spec = '' AND s.deleted_at IS NULL
SET m.sku_id = s.id
WHERE m.sku_id = 0 AND m.deleted_at IS NULL;

-- ── 5. 六类单据明细加 SKU 并回填 ──
ALTER TABLE `psi_purchase_order_detail` ADD COLUMN `sku_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID' AFTER `product_id`;
ALTER TABLE `psi_purchase_order_detail` ADD KEY `idx_psi_purchase_order_detail_sku_id` (`sku_id`);
UPDATE `psi_purchase_order_detail` d JOIN `crm_product_sku` s ON s.product_id = d.product_id AND s.spec = '' AND s.deleted_at IS NULL SET d.sku_id = s.id WHERE d.sku_id = 0 AND d.deleted_at IS NULL;

ALTER TABLE `psi_purchase_return_detail` ADD COLUMN `sku_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID' AFTER `product_id`;
ALTER TABLE `psi_purchase_return_detail` ADD KEY `idx_psi_purchase_return_detail_sku_id` (`sku_id`);
UPDATE `psi_purchase_return_detail` d JOIN `crm_product_sku` s ON s.product_id = d.product_id AND s.spec = '' AND s.deleted_at IS NULL SET d.sku_id = s.id WHERE d.sku_id = 0 AND d.deleted_at IS NULL;

ALTER TABLE `psi_sales_order_detail` ADD COLUMN `sku_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID' AFTER `product_id`;
ALTER TABLE `psi_sales_order_detail` ADD KEY `idx_psi_sales_order_detail_sku_id` (`sku_id`);
UPDATE `psi_sales_order_detail` d JOIN `crm_product_sku` s ON s.product_id = d.product_id AND s.spec = '' AND s.deleted_at IS NULL SET d.sku_id = s.id WHERE d.sku_id = 0 AND d.deleted_at IS NULL;

ALTER TABLE `psi_sales_return_detail` ADD COLUMN `sku_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID' AFTER `product_id`;
ALTER TABLE `psi_sales_return_detail` ADD KEY `idx_psi_sales_return_detail_sku_id` (`sku_id`);
UPDATE `psi_sales_return_detail` d JOIN `crm_product_sku` s ON s.product_id = d.product_id AND s.spec = '' AND s.deleted_at IS NULL SET d.sku_id = s.id WHERE d.sku_id = 0 AND d.deleted_at IS NULL;

ALTER TABLE `psi_stock_in_order_detail` ADD COLUMN `sku_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID' AFTER `product_id`;
ALTER TABLE `psi_stock_in_order_detail` ADD KEY `idx_psi_stock_in_order_detail_sku_id` (`sku_id`);
UPDATE `psi_stock_in_order_detail` d JOIN `crm_product_sku` s ON s.product_id = d.product_id AND s.spec = '' AND s.deleted_at IS NULL SET d.sku_id = s.id WHERE d.sku_id = 0 AND d.deleted_at IS NULL;

ALTER TABLE `psi_stock_out_order_detail` ADD COLUMN `sku_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID' AFTER `product_id`;
ALTER TABLE `psi_stock_out_order_detail` ADD KEY `idx_psi_stock_out_order_detail_sku_id` (`sku_id`);
UPDATE `psi_stock_out_order_detail` d JOIN `crm_product_sku` s ON s.product_id = d.product_id AND s.spec = '' AND s.deleted_at IS NULL SET d.sku_id = s.id WHERE d.sku_id = 0 AND d.deleted_at IS NULL;

-- ── 6. 商城订单明细加 SKU + 规格快照 ──
ALTER TABLE `mall_order_item` ADD COLUMN `sku_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '规格SKU ID' AFTER `product_id`;
ALTER TABLE `mall_order_item` ADD KEY `idx_mall_order_item_sku_id` (`sku_id`);
ALTER TABLE `mall_order_item` ADD COLUMN `spec` varchar(128) NOT NULL DEFAULT '' COMMENT '规格描述快照' AFTER `product_name`;
UPDATE `mall_order_item` d JOIN `crm_product_sku` s ON s.product_id = d.product_id AND s.spec = '' AND s.deleted_at IS NULL SET d.sku_id = s.id WHERE d.sku_id = 0 AND d.deleted_at IS NULL;

-- ── 7. SKU 管理接口的 Casbin 权限(对齐商品管理:GET 给采购/销售总监/测试角色,写操作给销售总监/测试角色;super_admin 兜底) ──
INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`, `v3`, `v4`, `v5`)
SELECT 'p', role, path, method, '', '', '' FROM (
  SELECT 'super_admin' AS role, '/crm/products/:id/skus' AS path, 'GET' AS method
  UNION ALL SELECT 'super_admin', '/crm/products/:id/skus', 'POST'
  UNION ALL SELECT 'super_admin', '/crm/products/:id/skus/:skuId', 'PUT'
  UNION ALL SELECT 'super_admin', '/crm/products/:id/skus/:skuId', 'DELETE'
  UNION ALL SELECT 'sales_director', '/crm/products/:id/skus', 'GET'
  UNION ALL SELECT 'sales_director', '/crm/products/:id/skus', 'POST'
  UNION ALL SELECT 'sales_director', '/crm/products/:id/skus/:skuId', 'PUT'
  UNION ALL SELECT 'sales_director', '/crm/products/:id/skus/:skuId', 'DELETE'
  UNION ALL SELECT 'purchaser', '/crm/products/:id/skus', 'GET'
  UNION ALL SELECT 'test_role', '/crm/products/:id/skus', 'GET'
  UNION ALL SELECT 'test_role', '/crm/products/:id/skus', 'POST'
  UNION ALL SELECT 'test_role', '/crm/products/:id/skus/:skuId', 'PUT'
  UNION ALL SELECT 'test_role', '/crm/products/:id/skus/:skuId', 'DELETE'
) t
WHERE NOT EXISTS (
  SELECT 1 FROM `casbin_rule` c
  WHERE c.ptype = 'p' AND c.v0 = t.role AND c.v1 = t.path AND c.v2 = t.method
);
