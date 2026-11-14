-- ============================================================
-- storefront_order.sql —— 独立站订单建表 + 种子(P28-B:Stripe 支付闭环)
--
-- 用途:
--   1. storefront_order(订单主单:订单号/状态/金额/买家回填/Stripe session+PI/PSI 单号)
--      / storefront_order_item(订单明细:下单价格快照)
--   2. sys_api(857-858:订单列表/详情)/ sys_menu(2345「订单管理」;2342 站点配置 sort 改 3)
--      / sys_menu_api / sys_role_menu(super_admin id=1 授菜单链 2340+2345)
--   公开接口 /storefront/public/checkout 与 /storefront/public/webhooks/stripe
--   不走 Casbin,不登记 sys_api(同 mall 口径)。
--
-- ID 分配区间:sys_api 857-858(此前最大 856);sys_menu 2345(2340-2344 已被 P28-A 使用,
--             任务书原定的 2343 在生产库已被「新增/编辑商品」按钮占用,故顺延到
--             storefront.sql 预留的 2345;2346-2347 仍预留)
-- 执行方式:通过 DBX MCP 或 mysql 客户端逐段执行(DBX 多语句须拆单条);幂等可重复执行。
-- 注意:stripe_session_id 允许 NULL(下单→回调之间无 session,多条 NULL 不冲突唯一索引),
--      支付回调后回填;密钥 STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET 走 .env,不入库。
-- ============================================================

-- ============================================================
-- 1. 独立站订单表(与 internal/model/storefront/order.go 对齐)
-- ============================================================
CREATE TABLE IF NOT EXISTS `storefront_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(40) NOT NULL DEFAULT '' COMMENT '订单号(SF+yyyyMMdd+序号)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1待支付 2已支付 3已取消 4已过期',
  `currency` char(3) NOT NULL DEFAULT 'USD' COMMENT '结算币种(ISO 4217)',
  `total_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '订单总额',
  `customer_email` varchar(200) NOT NULL DEFAULT '' COMMENT '买家邮箱(支付回调回填)',
  `customer_name` varchar(200) NOT NULL DEFAULT '' COMMENT '买家姓名(支付回调回填)',
  `customer_country` varchar(100) NOT NULL DEFAULT '' COMMENT '买家国家/地区(支付回调回填)',
  `stripe_session_id` varchar(255) DEFAULT NULL COMMENT 'Stripe Checkout Session ID(创建后回填;NULL=尚未回调到 Session 创建完成)',
  `payment_intent_id` varchar(255) NOT NULL DEFAULT '' COMMENT 'Stripe Payment Intent ID(支付完成后回填)',
  `psi_order_no` varchar(40) NOT NULL DEFAULT '' COMMENT '关联 PSI 销售单号(best-effort 生成后回填)',
  `locale` varchar(10) NOT NULL DEFAULT 'en' COMMENT '下单时站点语言',
  `ip` varchar(64) NOT NULL DEFAULT '' COMMENT '下单 IP(频控+溯源)',
  `paid_at` datetime DEFAULT NULL COMMENT '支付完成时间(webhook 回填)',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sf_order_no` (`order_no`),
  UNIQUE KEY `uk_sf_order_session` (`stripe_session_id`),
  KEY `idx_sf_order_status` (`status`),
  KEY `idx_sf_order_email` (`customer_email`),
  KEY `idx_sf_order_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='独立站订单主单';

CREATE TABLE IF NOT EXISTS `storefront_order_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL COMMENT '订单ID(storefront_order)',
  `product_id` bigint unsigned NOT NULL COMMENT 'CRM商品ID(crm_product)',
  `product_name` varchar(200) NOT NULL DEFAULT '' COMMENT '商品名(下单快照)',
  `sku` varchar(100) NOT NULL DEFAULT '' COMMENT 'SKU编号(独立站 checkout 不选规格,默认空)',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '数量',
  `unit_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '单价(主单位,下单快照)',
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '小计=单价×数量',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sf_order_item_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='独立站订单明细';

-- ============================================================
-- 2. sys_api 857-858 —— 订单管理端接口(公开接口不登记)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_api_id` BETWEEN 857 AND 858;
DELETE FROM `sys_api` WHERE `id` BETWEEN 857 AND 858;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (857, '/storefront/orders',     'GET', '独立站-订单', '独立站订单分页列表(主单+明细嵌套)', NOW(3), NOW(3)),
  (858, '/storefront/orders/:id', 'GET', '独立站-订单', '独立站订单详情(主单+明细嵌套)', NOW(3), NOW(3));

-- ============================================================
-- 3. sys_menu 2345「订单管理」(parent=2340 独立站目录;sort=2)
--    并把 2342「站点配置」sort 改 3 → 目录内排序:商品(1)→订单(2)→配置(3)
--    component 与 admin 前端对应:storefront/order/index → src/pages/storefront/order/index.tsx
-- ============================================================
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` = 2345;
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` = 2345;
DELETE FROM `sys_menu` WHERE `id` = 2345;

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2345, 2340, '订单管理', '/storefront/order', 'storefront/order/index', 'GlobalOutlined', 2, 1, 'storefront:order:list', 1, 1, NOW(3), NOW(3));

UPDATE `sys_menu` SET `sort` = 3, `updated_at` = NOW(3) WHERE `id` = 2342;

-- ============================================================
-- 4. sys_menu_api —— 订单管理菜单 ↔ 订单接口
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2345, 857),
  (2345, 858);

-- ============================================================
-- 5. sys_role_menu —— 超管角色(id=1)授菜单链:目录 2340 + 订单页 2345
--    (2340 在 P28-A 已授权,幂等重插;ON DUPLICATE 走主键无副作用)
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT 1, m.id FROM `sys_menu` m WHERE m.id IN (2340, 2345)
ON DUPLICATE KEY UPDATE `sys_role_id` = VALUES(`sys_role_id`);
