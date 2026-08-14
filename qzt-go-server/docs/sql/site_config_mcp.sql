-- site_config_mcp.sql 给 sys_site_config 加 mcp_url 列,支持私有化部署动态下发 MCP 服务地址。
--
-- 背景:个人中心「API Key」页的 MCP 配置说明此前把地址硬编码为
--   https://devlovecode.com/mcp(ProfileCenter.tsx 的 MCP_PROD_URL 常量)。
--   项目私有化部署卖给客户,每个客户域名不同,故改为:把 MCP 地址存进站点配置表,
--   客户在后台「站点设置」填一次(域名根 + /mcp),前端从公开接口
--   GET /system/site-config 动态读取;留空时前端兜底用 window.location.origin + '/mcp'。
--
-- 幂等:用 INFORMATION_SCHEMA 检查列是否存在,可重复执行。
-- 执行方式:
--   A) mysql 客户端: source 本文件(支持预处理,幂等)
--   B) DBX MCP: database=qztgo,预处理语句需客户端支持,否则逐条改写执行
-- 关联代码: model/site_config.go (McpURL 字段)、service/site_config.go (Update 非空覆盖)、
--   qzt-go-admin 前端 ProfileCenter.tsx(动态读取)。

SET @db := DATABASE();
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'mcp_url'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `sys_site_config` ADD COLUMN `mcp_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''MCP服务地址'' AFTER `copyright`',
  'SELECT ''sys_site_config.mcp_url 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 给全局唯一记录(id=1)填入 devlovecode.com 生产默认值;已填非空值则保留不覆盖。
-- 私有部署客户执行后请到后台「站点设置」改为自己的域名(如 https://your-domain.com/mcp)。
UPDATE `sys_site_config`
SET `mcp_url` = COALESCE(NULLIF(`mcp_url`, ''), 'https://devlovecode.com/mcp')
WHERE `id` = 1;
