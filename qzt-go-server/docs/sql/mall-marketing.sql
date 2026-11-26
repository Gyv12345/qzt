-- ======================================================================
-- mall-marketing.sql — 商城营销:买家账号 + 优惠券 + 限时特价
--
-- 用途:
--   1. 四张新表(IF NOT EXISTS 幂等):
--      mall_user(买家账号,手机号唯一)/ mall_coupon(券模板)
--      / mall_user_coupon(买家券实例,券码唯一)/ mall_promotion(限时特价)
--   2. mall_order 守卫加两列(information_schema 守卫,可重复执行):
--      discount_amount decimal(14,2) / coupon_no varchar(32)
--   3. sys_api 892-899(管理端 优惠券 CRUD 892-895 + 限时特价 CRUD 896-899)
--      公开/买家接口(/mall/public/* 与 /mall/auth/*)不走员工 Casbin,
--      不登记 sys_api(同 mall 既有公开接口口径)
--   4. sys_menu 2382-2389:2382「优惠券」页 + 2384-2386 按钮;
--      2383「限时特价」页 + 2387-2389 按钮(均挂顶级「商城管理」1000 下)
--   5. sys_menu_api 绑定 + sys_role_menu 授权 super_admin(1)/sales_manager(4)/sales_director(9)/demo(14)
--      (R67 补授:9/14 与 casbin 三角色对齐;R66 修复批曾漏 9/14 子页致 salesdir 有 API 无 UI 404)
--
-- ID 分配(2026-11-16 DBX 复核:sys_api MAX=891,sys_menu MAX=2381):
--   sys_api 892-899 / sys_menu 2382-2389
-- 执行方式:通过 DBX MCP 或 mysql 客户端逐段执行(DBX 多语句须拆单条);
--   建表/DELETE/INSERT 幂等可重复执行;ALTER 段已用 information_schema 守卫。
--   插库后须重启 qzt-server 刷新 Casbin 策略。
-- 基线同步说明:后续维护 docs/sql/qztgo.sql 基线时,需把本文件的四张建表与
--   mall_order 两列、sys_api/sys_menu 段并入基线(同 p28c 惯例,见文件末注释)。
-- ======================================================================

-- ============================================================
-- 1. 建表 —— 四张新表(IF NOT EXISTS 幂等)
-- ============================================================
CREATE TABLE IF NOT EXISTS `mall_user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `phone` varchar(16) NOT NULL COMMENT '手机号(登录账号)',
  `password` varchar(100) NOT NULL COMMENT '密码(bcrypt)',
  `nickname` varchar(64) NOT NULL DEFAULT '' COMMENT '昵称',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1正常 2禁用',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mall_user_phone` (`phone`),
  KEY `idx_mall_user_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城买家账号(与sys_user员工体系隔离)';

CREATE TABLE IF NOT EXISTS `mall_coupon` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL COMMENT '券名',
  `threshold` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '满X可用(0=无门槛)',
  `discount` decimal(14,2) NOT NULL COMMENT '抵扣金额',
  `total_count` int NOT NULL DEFAULT '0' COMMENT '发放总量',
  `claimed` int NOT NULL DEFAULT '0' COMMENT '已领取数',
  `per_user_limit` int NOT NULL DEFAULT '1' COMMENT '每人限领(含已用)',
  `start_at` datetime(3) DEFAULT NULL COMMENT '生效开始(NULL=立即)',
  `end_at` datetime(3) DEFAULT NULL COMMENT '生效结束(NULL=长期)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1启用 2停用',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mall_coupon_status` (`status`),
  KEY `idx_mall_coupon_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城优惠券模板';

CREATE TABLE IF NOT EXISTS `mall_user_coupon` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT '买家ID(mall_user)',
  `coupon_id` bigint unsigned NOT NULL COMMENT '券模板ID(mall_coupon)',
  `coupon_no` varchar(32) NOT NULL COMMENT '唯一券码(C+yyyyMMdd+6位随机大写字母数字)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1未使用 2已使用 3已过期',
  `used_order_no` varchar(40) NOT NULL DEFAULT '' COMMENT '核销订单号',
  `used_at` datetime(3) DEFAULT NULL COMMENT '核销时间',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_coupon_no` (`coupon_no`),
  KEY `idx_user_coupon_user` (`user_id`),
  KEY `idx_mall_user_coupon_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城买家券实例';

CREATE TABLE IF NOT EXISTS `mall_promotion` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL COMMENT '活动名',
  `product_id` bigint unsigned NOT NULL COMMENT '商品ID(crm_product)',
  `promo_price` decimal(14,2) NOT NULL COMMENT '活动价',
  `start_at` datetime(3) NOT NULL COMMENT '开始时间',
  `end_at` datetime(3) NOT NULL COMMENT '结束时间',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1启用 2停用',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_promotion_product` (`product_id`),
  KEY `idx_mall_promotion_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城限时特价(同商品可多条历史活动,生效取窗口内最低价)';

-- ============================================================
-- 2. mall_order 守卫加两列(information_schema 守卫,可重复执行)
--    total_amount 语义改为「应付总额(已扣券)」;discount_amount 记录优惠额,
--    coupon_no 记录使用的券码;均兼容历史行(0/'')。
-- ============================================================
SET @has_discount_amount = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mall_order' AND COLUMN_NAME='discount_amount');
SET @ddl = IF(@has_discount_amount=0,
  'ALTER TABLE `mall_order` ADD COLUMN `discount_amount` decimal(14,2) NOT NULL DEFAULT ''0.00'' COMMENT ''优惠券抵扣金额'' AFTER `total_amount`',
  'SELECT ''mall_order.discount_amount exists'' AS note');
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @has_coupon_no = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mall_order' AND COLUMN_NAME='coupon_no');
SET @ddl = IF(@has_coupon_no=0,
  'ALTER TABLE `mall_order` ADD COLUMN `coupon_no` varchar(32) NOT NULL DEFAULT '''' COMMENT ''使用的优惠券码'' AFTER `discount_amount`',
  'SELECT ''mall_order.coupon_no exists'' AS note');
PREPARE s2 FROM @ddl; EXECUTE s2; DEALLOCATE PREPARE s2;

-- ============================================================
-- 3. sys_api —— 892-899(管理端;公开/买家接口不登记,同 mall 既有口径)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_api_id` BETWEEN 892 AND 899;
DELETE FROM `sys_api` WHERE `id` BETWEEN 892 AND 899;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (892, '/mall/admin/coupons',     'GET',    '商城-优惠券', '优惠券分页列表(含已领取数/发放总量)', NOW(3), NOW(3)),
  (893, '/mall/admin/coupons',     'POST',   '商城-优惠券', '创建优惠券模板(满减门槛/面额/总量/每人限领/窗口)', NOW(3), NOW(3)),
  (894, '/mall/admin/coupons/:id', 'PUT',    '商城-优惠券', '更新优惠券(半增量;status=2 停用后买家不可领不可用)', NOW(3), NOW(3)),
  (895, '/mall/admin/coupons/:id', 'DELETE', '商城-优惠券', '删除优惠券(软删)', NOW(3), NOW(3)),
  (896, '/mall/admin/promotions',     'GET',    '商城-限时特价', '限时特价分页列表', NOW(3), NOW(3)),
  (897, '/mall/admin/promotions',     'POST',   '商城-限时特价', '创建限时特价(商品+活动价+时间窗)', NOW(3), NOW(3)),
  (898, '/mall/admin/promotions/:id', 'PUT',    '商城-限时特价', '更新限时特价(半增量;status=2 停用即失效)', NOW(3), NOW(3)),
  (899, '/mall/admin/promotions/:id', 'DELETE', '商城-限时特价', '删除限时特价(软删)', NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu —— 2382 优惠券页 + 2384-2386 按钮;2383 限时特价页 + 2387-2389 按钮
--    (均挂顶级「商城管理」1000 下,排在 1001 商城订单之后)
--    component 与 admin 前端 src/pages 路径对应:
--    mall/coupon/index → src/pages/mall/coupon/index.tsx
--    mall/promotion/index → src/pages/mall/promotion/index.tsx
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2382 AND 2389;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2382 AND 2389;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2382 AND 2389;

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2382, 1000, '优惠券',   '/mall/coupon',    'mall/coupon/index',    'TicketOutlined',     2, 1, 'mall:coupon:list',    1, 1, NOW(3), NOW(3)),
  (2384, 2382, '新增优惠券', NULL, NULL, NULL, 1, 2, 'mall:coupon:add',    1, 1, NOW(3), NOW(3)),
  (2385, 2382, '编辑优惠券', NULL, NULL, NULL, 2, 2, 'mall:coupon:edit',   1, 1, NOW(3), NOW(3)),
  (2386, 2382, '删除优惠券', NULL, NULL, NULL, 3, 2, 'mall:coupon:delete', 1, 1, NOW(3), NOW(3)),
  (2383, 1000, '限时特价', '/mall/promotion', 'mall/promotion/index', 'ThunderboltOutlined', 3, 1, 'mall:promotion:list',    1, 1, NOW(3), NOW(3)),
  (2387, 2383, '新增特价', NULL, NULL, NULL, 1, 2, 'mall:promotion:add',    1, 1, NOW(3), NOW(3)),
  (2388, 2383, '编辑特价', NULL, NULL, NULL, 2, 2, 'mall:promotion:edit',   1, 1, NOW(3), NOW(3)),
  (2389, 2383, '删除特价', NULL, NULL, NULL, 3, 2, 'mall:promotion:delete', 1, 1, NOW(3), NOW(3));

-- ============================================================
-- 5. sys_menu_api —— 页面/按钮 ↔ API 关联
--    2382 优惠券页(list GET);2384/2385/2386 → 创建/更新/删除;
--    2383 特价页(list GET);2387/2388/2389 → 创建/更新/删除。
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2382, 892),
  (2384, 893),
  (2385, 894),
  (2386, 895),
  (2383, 896),
  (2387, 897),
  (2388, 898),
  (2389, 899);

-- ============================================================
-- 6. sys_role_menu —— 授权 super_admin(1)/sales_manager(4)/sales_director(9)/demo(14)（R67 补授 9/14）
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM `sys_role` r
JOIN `sys_menu` m ON m.id BETWEEN 2382 AND 2389
WHERE r.id IN (1, 4, 9, 14)
ON DUPLICATE KEY UPDATE `sys_role_id` = VALUES(`sys_role_id`);

-- ============================================================
-- 7. 结尾验证(逐条执行核对)
-- ============================================================
-- SELECT COUNT(*) FROM sys_api WHERE id BETWEEN 892 AND 899;          -- 期望 8
-- SELECT COUNT(*) FROM sys_menu WHERE id BETWEEN 2382 AND 2389;       -- 期望 8
-- SELECT COUNT(*) FROM sys_menu_api WHERE sys_api_id BETWEEN 892 AND 899;  -- 期望 8
-- SELECT sys_role_id, COUNT(*) FROM sys_role_menu
--   WHERE sys_menu_id BETWEEN 2382 AND 2389 GROUP BY sys_role_id;     -- 期望 1/4 各 8
-- SHOW COLUMNS FROM mall_order LIKE 'discount_amount';                -- 期望 1 行
-- SHOW COLUMNS FROM mall_order LIKE 'coupon_no';                      -- 期望 1 行

-- ============================================================
-- 8. 基线 qztgo.sql 同步说明(仅注释,不产生数据)
--    后续维护 docs/sql/qztgo.sql 基线时需手工同步:
--    ① 四张新表建表语句(mall_user/mall_coupon/mall_user_coupon/mall_promotion);
--    ② mall_order 建表语句内补 discount_amount / coupon_no 两列
--       (位于 total_amount 之后);
--    ③ sys_api 892-899 / sys_menu 2382-2389 / sys_menu_api / sys_role_menu
--       对应段并入基线;
--    ④ 不加演示数据(演示集不含券与活动)。
-- ============================================================
