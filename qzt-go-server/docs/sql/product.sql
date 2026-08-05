-- ============================================================================
-- product.sql  CRM 商品表结构增量: image_url 商品主图
-- 执行方式: mysql -h <host> -u <user> -p <database> < product.sql
-- 幂等: 可重复执行(通过 information_schema 判断列是否已存在)
-- ============================================================================

-- crm_product 增加商品主图 URL 字段
SET @col := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_product'
    AND COLUMN_NAME = 'image_url'
);
SET @ddl := IF(@col = 0,
  'ALTER TABLE crm_product ADD COLUMN image_url VARCHAR(512) NULL DEFAULT NULL COMMENT ''商品主图URL'' AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
