-- storage_config_cleanup.sql
-- 用途：存储配置已从 DB 表 sys_storage_config 迁移到配置文件(config.{env}.yaml + .env)，
--       此脚本清理与之关联的 admin 菜单和 Casbin API 权限项。
-- 执行方式：通过 DBX MCP 或 mysql 手动执行。
-- 注意：sys_storage_config 数据表本身保留(不删表，仅清理代码引用过的菜单/API 权限)，新代码不再读取。
-- ID 区间：菜单 209-211（存储配置页 + 2 个按钮权限），API 241-244（4 个 storage-config 接口）。
-- 外键依赖顺序：先 sys_menu_api / sys_role_menu，再 sys_menu；先 sys_api_role(如有) / casbin_rule，再 sys_api。

-- 1. 先删关联表(外键约束)
DELETE FROM sys_menu_api WHERE sys_menu_id IN (209, 210, 211) OR sys_api_id IN (241, 242, 243, 244);
DELETE FROM sys_role_menu WHERE sys_menu_id IN (209, 210, 211);

-- 2. 清理 Casbin 策略表中引用上述 API 的规则
DELETE FROM casbin_rule WHERE v1 = '/system/storage-config' OR v1 = '/system/storage-config/reload' OR v1 = '/system/storage-config/test';

-- 3. 删除存储配置菜单(含按钮权限子项)
DELETE FROM sys_menu WHERE id IN (209, 210, 211);

-- 4. 删除存储配置相关的 Casbin API 权限项
DELETE FROM sys_api WHERE id IN (241, 242, 243, 244);

-- 验证(预期均为 0)
SELECT COUNT(*) AS menu_left FROM sys_menu WHERE component LIKE '%storage%' OR path LIKE '%storage%';
SELECT COUNT(*) AS api_left FROM sys_api WHERE path LIKE '%storage-config%';
