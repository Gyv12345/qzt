-- site_config_cleanup.sql 清理 sys_site_config 冗余字段(2026-08-18)。
--
-- 背景:站点信息表里的 slogan/contact_qq/contact_wechat/weibo_url/wechat_qr_url/
--   linked_in_url 共 6 个字段,官网(CMS)、admin、移动端均无任何消费方,
--   属于「表单有入口、前台没人用」的死字段,后台表单一并下线,故从表结构清除。
--   同时补建 mcp_url 列(site_config_mcp.sql 迁移在生产未执行过,新代码保存
--   「MCP 服务地址」需要该列,详见 model/site_config.go)。
--
-- 新部署:直接执行 qztgo.sql(建表已含 hero_*/mcp_url、不含下述 6 列),无需本文件。
-- 存量部署:执行本文件;与 site_config_mcp.sql 二选一即可(本文件为其超集)。
--
-- 幂等:用 INFORMATION_SCHEMA 检查列存在性,可重复执行。
-- 执行方式:
--   A) mysql 客户端: source 本文件
--   B) DBX MCP: 预处理多语句不支持时,逐段改写执行(每段单语句)
-- 关联代码: model/site_config.go、repository/site_config.go(Update 列清单)、
--   qzt-go-admin 站点设置表单、qzt-go-cms layout.tsx。

SET @db := DATABASE();

-- 1) 补建 mcp_url(存在则跳过)
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'mcp_url') = 0,
  'ALTER TABLE `sys_site_config` ADD COLUMN `mcp_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''MCP服务地址'' AFTER `copyright`',
  'SELECT ''sys_site_config.mcp_url 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) 删除 6 个无消费方的字段(存在才删)
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'slogan') > 0,
  'ALTER TABLE `sys_site_config` DROP COLUMN `slogan`',
  'SELECT ''sys_site_config.slogan 不存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'contact_qq') > 0,
  'ALTER TABLE `sys_site_config` DROP COLUMN `contact_qq`',
  'SELECT ''sys_site_config.contact_qq 不存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'contact_wechat') > 0,
  'ALTER TABLE `sys_site_config` DROP COLUMN `contact_wechat`',
  'SELECT ''sys_site_config.contact_wechat 不存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'weibo_url') > 0,
  'ALTER TABLE `sys_site_config` DROP COLUMN `weibo_url`',
  'SELECT ''sys_site_config.weibo_url 不存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'wechat_qr_url') > 0,
  'ALTER TABLE `sys_site_config` DROP COLUMN `wechat_qr_url`',
  'SELECT ''sys_site_config.wechat_qr_url 不存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'linked_in_url') > 0,
  'ALTER TABLE `sys_site_config` DROP COLUMN `linked_in_url`',
  'SELECT ''sys_site_config.linked_in_url 不存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
