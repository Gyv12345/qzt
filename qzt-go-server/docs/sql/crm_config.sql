-- crm_config.sql CRM 配置中心:跟进预警阈值 + 公海自动回收定时任务 + 统一配置页菜单。
-- 幂等:可重复执行。
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行。
-- ID 区间:sys_menu 700-710,sys_config 自定义 key,sys_job bean_class 唯一。

-- ======================================================================
-- 1. sys_config 跟进预警阈值 + 定时任务开关(group=crm)
-- ======================================================================

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'crm', 'crm.followup.warn_days_customer', '客户未跟进预警天数', '15', 'int', 0, 1, 1, 1, '客户超过该天数未跟进则推送提醒'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'crm.followup.warn_days_customer');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'crm', 'crm.followup.warn_days_lead', '线索未跟进预警天数', '7', 'int', 0, 1, 1, 2, '线索超过该天数未跟进则推送提醒'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'crm.followup.warn_days_lead');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'crm', 'crm.followup.warn_days_opportunity', '商机未跟进预警天数', '15', 'int', 0, 1, 1, 3, '商机超过该天数未跟进则推送提醒'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'crm.followup.warn_days_opportunity');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'crm', 'crm.followup.remind_enabled', '跟进提醒开关', '1', 'bool', 0, 1, 1, 4, '开启后定时扫描超期未跟进推送站内信'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'crm.followup.remind_enabled');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'crm', 'crm.pool.auto_recycle_enabled', '公海自动回收开关', '1', 'bool', 0, 1, 1, 5, '开启后定时扫描公海池 auto_recycle=1 的池执行回收'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'crm.pool.auto_recycle_enabled');

-- ======================================================================
-- 2. sys_job 定时任务(bean_class 必须与 Go 代码 RegisterJobHandler 完全一致)
-- ======================================================================

INSERT INTO `sys_job` (`job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`)
SELECT '公海自动回收', 'crm', '0 0 2 * * *', 'crm.pool.auto_recycle', 1, '每日 02:00 扫描超期未跟进,转入公海(客户池+线索池)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_job` WHERE `bean_class` = 'crm.pool.auto_recycle');

INSERT INTO `sys_job` (`job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`)
SELECT '跟进逾期提醒', 'crm', '0 0 9 * * *', 'crm.followup.reminder', 1, '每日 09:00 扫描超期未跟进,按负责人推送站内信'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_job` WHERE `bean_class` = 'crm.followup.reminder');

-- ======================================================================
-- 3. sys_menu 新增「CRM 配置」菜单(挂在配置目录 130 下)
--    component=crm/setting/index 对应 admin 前端 src/pages/crm/setting/index.tsx
-- ======================================================================

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 700, 130, 'CRM 配置', '/crm/setting', 'crm/setting/index', 'SettingOutline', 0, 1, 'crm:setting:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 700);

-- CRM 配置:跟进预警配置(只读接口 GET /crm/followup/warn-config 用已有 JWT 鉴权,无需独立 Casbin API)
-- 合同模板/字段/阶段的编辑权限沿用各自菜单的权限码,配置页只做聚合入口
