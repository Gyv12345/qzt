-- marketing_outbound_remove.sql 智能外呼(阿里云 OutboundBot)功能下线清理脚本。
-- 背景:电话营销存在合规监管风险(禁盲呼/须客户同意),功能整体移除——
--   后端 marketing outbound 代码、admin 外呼页均已删除,本脚本清理库内残留。
-- 经 DBX MCP「我的阿里云数据库」(database=qztgo)逐条执行(勿整段 batch)。
-- 原 docs/sql/marketing_outbound.sql(建表/种子)同步删除。

-- 1) 外呼业务表
DROP TABLE IF EXISTS `marketing_outbound_group`;
DROP TABLE IF EXISTS `marketing_outbound_job`;

-- 2) sys_config 外呼配置(14 个 key,含阿里云 AccessKey,顺带清除生产密钥)
DELETE FROM `sys_config` WHERE `key` LIKE 'marketing.outbound.%';

-- 3) sys_job 定时任务(投递/结果回写)
DELETE FROM `sys_job` WHERE `bean_class` IN ('marketing.outbound.dispatch', 'marketing.outbound.poll');

-- 4) 菜单/按钮(2110~2113)及角色授权、菜单-API 关联(不触碰 R13 的 2100~2103)
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2110 AND 2113;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2110 AND 2113;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2110 AND 2113;

-- 5) sys_api 接口(700~705)
DELETE FROM `sys_api` WHERE `id` BETWEEN 700 AND 705;

-- 6) casbin 权限规则
DELETE FROM `casbin_rule` WHERE `v1` LIKE '/marketing/outbound%';
