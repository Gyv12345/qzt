-- ============================================================
-- storefront_p28c.sql —— 独立站第二支付通道 PayPal + 邮件通知(P28-C)
--
-- 用途:
--   1. storefront_order 守卫加列 paypal_order_id varchar(64) NULL(PayPal 订单 ID,创建后回填)
--   2. storefront_order 守卫加唯一索引 uk_sf_order_paypal(paypal_order_id)
--      (NULL 不参与唯一冲突,未下单 PayPal 的历史行不受影响)
--   3. sys_config 种子 storefront.notify_email(订单/询盘邮件通知收件人,空值=通道关闭)
--   4. 基线 qztgo.sql 同步说明(见文件末注释)
--
-- ID 分配区间:无新增 sys_api / sys_menu(两个 PayPal 接口挂在
--             /storefront/public/* 公开组,免登录不走 Casbin,不登记 sys_api,
--             同 P28-A/B 公开接口口径);无新菜单。
-- 执行方式:通过 DBX MCP 或 mysql 客户端逐段执行(DBX 多语句须拆单条);幂等可重复执行。
-- 注意:PayPal 凭据 PAYPAL_CLIENT_ID / PAYPAL_SECRET 与 SMTP EMAIL_SMTP_* 均走
--       gitignored .env 注入,不入库、不落代码。
-- ============================================================

-- ============================================================
-- 1. storefront_order 守卫加列 paypal_order_id(information_schema 守卫,可重复执行)
-- ============================================================
SET @has_paypal_order_id = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='storefront_order' AND COLUMN_NAME='paypal_order_id');
SET @ddl = IF(@has_paypal_order_id=0,
  'ALTER TABLE `storefront_order` ADD COLUMN `paypal_order_id` varchar(64) DEFAULT NULL COMMENT ''PayPal 订单 ID(P28-C 第二支付通道;创建后回填;NULL=未走 PayPal 通道)'' AFTER `stripe_session_id`',
  'SELECT ''paypal_order_id exists'' AS note');
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

-- ============================================================
-- 2. storefront_order 守卫加唯一索引 uk_sf_order_paypal(information_schema 守卫,可重复执行)
-- ============================================================
SET @has_paypal_uk = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='storefront_order' AND INDEX_NAME='uk_sf_order_paypal');
SET @ddl = IF(@has_paypal_uk=0,
  'ALTER TABLE `storefront_order` ADD UNIQUE KEY `uk_sf_order_paypal` (`paypal_order_id`)',
  'SELECT ''uk_sf_order_paypal exists'' AS note');
PREPARE s2 FROM @ddl; EXECUTE s2; DEALLOCATE PREPARE s2;

-- ============================================================
-- 3. sys_config 种子 storefront.notify_email(空值=邮件通道关闭;INSERT WHERE NOT EXISTS 幂等)
-- ============================================================
INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `sort`, `remark`, `created_at`, `updated_at`)
SELECT 'storefront', 'storefront.notify_email', '独立站通知邮箱', '', 'string', 0, 1, 12, '订单/询盘邮件通知收件人(逗号分隔), 空值=通道关闭', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'storefront.notify_email');

-- ============================================================
-- 4. 基线 qztgo.sql 同步说明(仅注释,不产生数据)
--    2026-11-13 之后维护的 docs/sql/qztgo.sql 基线需手工同步:
--    ① storefront_order 建表语句内补 paypal_order_id varchar(64) DEFAULT NULL 列
--       (位于 stripe_session_id 之后)+ UNIQUE KEY `uk_sf_order_paypal` (`paypal_order_id`);
--    ② sys_config 种子段补 storefront.notify_email 行(同第 3 段,value 留空串);
--    ③ 不加 PayPal 演示数据(演示集不含真实支付单)。
-- ============================================================
