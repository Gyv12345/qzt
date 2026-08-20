-- ============================================================
-- mall.sql —— 商城模块建表 + 种子(垂直商城:商品复用 crm_product,仅订单域)
--
-- 用途:
--   1. mall_order / mall_order_item 商城订单表
--   2. sys_api(520-523)/ sys_menu(1000-1005:顶级「商城管理」+ 商城订单页 + 按钮权限)
--      / sys_menu_api / sys_role_menu(super_admin)
--   3. sys_config 增加 mall_url 公开配置(App 端商城入口地址,is_public=1 免鉴权可读;
--      部署后由管理员在后台修改为实际商城域名,私有化部署各客户各自配置)
--
-- ID 分配区间:sys_menu 1000-1005(此前最大 995,marketing 占 980-995);
--             sys_api 520-523(此前最大 517)
-- 执行方式:通过 DBX MCP 或 mysql 客户端逐段执行(多语句须拆单条);幂等可重复执行。
-- ============================================================

-- ============================================================
-- 1. 商城订单表
-- ============================================================
CREATE TABLE IF NOT EXISTS `mall_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(64) NOT NULL COMMENT '订单号(MO+日期+序号)',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '关联客户ID(下单时按手机号复用历史客户,无则自动创建公海客户)',
  `contact_name` varchar(64) NOT NULL COMMENT '收货人姓名',
  `contact_phone` varchar(30) NOT NULL COMMENT '联系电话',
  `address` varchar(255) NOT NULL COMMENT '收货地址',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `total_quantity` decimal(14,3) NOT NULL DEFAULT '0.000' COMMENT '总数量',
  `total_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '总金额',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1待处理 2已确认 3已完成 4已取消',
  `psi_order_id` bigint unsigned DEFAULT NULL COMMENT '关联PSI销售单ID(无默认仓库时为空,后台可手动补生成)',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_mall_order_customer` (`customer_id`),
  KEY `idx_mall_order_phone` (`contact_phone`),
  KEY `idx_mall_order_status` (`status`),
  KEY `idx_mall_order_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城订单';

CREATE TABLE IF NOT EXISTS `mall_order_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL COMMENT '订单ID',
  `product_id` bigint unsigned NOT NULL COMMENT '商品ID(crm_product)',
  `product_name` varchar(255) NOT NULL COMMENT '商品名称快照',
  `quantity` decimal(14,3) NOT NULL COMMENT '数量',
  `unit_price` decimal(14,2) NOT NULL COMMENT '单价快照(下单时 standard_price)',
  `amount` decimal(14,2) NOT NULL COMMENT '金额',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mall_item_order` (`order_id`),
  KEY `idx_mall_item_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城订单明细';

-- ============================================================
-- 2. sys_api —— 商城管理接口(公开接口 /mall/public/* 不走 RBAC,不登记)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 1000 AND 1005;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 1000 AND 1005;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 1000 AND 1005;
DELETE FROM `sys_api` WHERE `id` BETWEEN 520 AND 523;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (520, '/mall/orders',                              'GET',  '商城-订单', '商城订单列表', NOW(3), NOW(3)),
  (521, '/mall/orders/:id',                          'GET',  '商城-订单', '商城订单详情', NOW(3), NOW(3)),
  (522, '/mall/orders/:id/status',                   'PUT',  '商城-订单', '商城订单状态流转', NOW(3), NOW(3)),
  (523, '/mall/orders/:id/generate-sales-order',     'POST', '商城-订单', '商城订单手动生成销售单', NOW(3), NOW(3));

-- ============================================================
-- 3. sys_menu —— 顶级「商城管理」+ 商城订单页
--    component 与 admin 前端 src/pages 路径对应:
--    mall/order/index → src/pages/mall/order/index.tsx
--    商品的上下架/价格维护继续用现有 CRM 产品管理页,不建商城商品页
-- ============================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (1000, 0,    '商城管理', '', '', NULL, 'ShoppingCartOutlined', 6, 0, '', 1, 1, NOW(3), NOW(3)),
  (1001, 1000, '商城订单', '/mall/order', 'mall/order/index', 'ShoppingCartOutlined', 1, 1, 'mall:order:list', 1, 1, NOW(3), NOW(3)),
  (1002, 1001, '确认订单', NULL, NULL, NULL, 1, 2, 'mall:order:confirm',   1, 1, NOW(3), NOW(3)),
  (1003, 1001, '完成订单', NULL, NULL, NULL, 2, 2, 'mall:order:finish',    1, 1, NOW(3), NOW(3)),
  (1004, 1001, '取消订单', NULL, NULL, NULL, 3, 2, 'mall:order:cancel',    1, 1, NOW(3), NOW(3)),
  (1005, 1001, '生成销售单', NULL, NULL, NULL, 4, 2, 'mall:order:generate', 1, 1, NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu_api —— 菜单(含按钮)与 API 关联
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (1001, 520),  -- 订单列表/详情菜单 → GET /mall/orders(+ :id 详情同菜单)
  (1001, 521),
  (1002, 522),  -- 确认/完成/取消共用状态流转接口(按目标状态校验)
  (1003, 522),
  (1004, 522),
  (1005, 523);  -- 生成销售单 → POST /mall/orders/:id/generate-sales-order

-- ============================================================
-- 5. sys_role_menu —— 默认授权超管角色(id=1)
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT 1, m.id FROM `sys_menu` m WHERE m.id BETWEEN 1000 AND 1005
ON DUPLICATE KEY UPDATE `sys_role_id` = VALUES(`sys_role_id`);

-- ============================================================
-- 6. sys_config —— mall_url 公开配置(App 端商城入口;正式商城域名部署后生效,
--    私有化部署客户在后台「系统设置」改成自己的商城地址)
-- ============================================================
INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `sort`, `remark`, `created_at`, `updated_at`)
SELECT 'site', 'mall_url', '商城站点地址', 'https://mall.devlovecode.com', 'text', 1, 1, 60, 'App 端商城入口;私有化部署改为客户专属域名', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'mall_url');
