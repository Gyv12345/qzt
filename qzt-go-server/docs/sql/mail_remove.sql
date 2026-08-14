-- ============================================================
-- mail_remove.sql — 邮件功能下线清理(对齐代码删除:2026-08-14)
-- ------------------------------------------------------------
-- 背景: 邮件功能整体下线,后端 /mail 模块、mailclient 包、MCP mail 工具、
--       admin 邮件配置页与写邮件弹窗均已从代码中移除。本脚本清理其 DB 种子。
-- 清理: 1. sys_menu 950-952(邮件配置页/保存配置按钮/发送邮件按钮)及其关联
--       2. sys_api 440-441(POST /mail/send、POST /mail/test)及其关联
--       3. sys_config 中 group=mail 的 8 条 SMTP 配置
-- 注意: DBX MCP 多语句只执行第一条,须逐条执行;group 为保留字需反引号。
-- ============================================================

-- 1. 菜单-API 关联、角色-菜单关联
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 950 AND 952;
DELETE FROM `sys_menu_api` WHERE `sys_api_id` BETWEEN 440 AND 441;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 950 AND 952;

-- 2. 菜单与 API 本体
DELETE FROM `sys_menu` WHERE `id` BETWEEN 950 AND 952;
DELETE FROM `sys_api` WHERE `id` BETWEEN 440 AND 441;

-- 3. SMTP 配置组(8 条)
DELETE FROM `sys_config` WHERE `group` = 'mail';

-- ── 验证(应全部为 0) ──
SELECT COUNT(*) AS menu_left FROM `sys_menu` WHERE `id` BETWEEN 950 AND 952;
SELECT COUNT(*) AS api_left FROM `sys_api` WHERE `id` BETWEEN 440 AND 441;
SELECT COUNT(*) AS config_left FROM `sys_config` WHERE `group` = 'mail';
