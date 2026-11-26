-- lead_auto_assign.sql P-F5 线索自动分配:sys_config 规则种子 + 批量分配接口 Casbin 登记 + 菜单按钮授权。
-- 幂等:可重复执行(NOT EXISTS / 先删固定 ID 再插)。
--
-- 用途:
--   1. sys_config 两条配置:总开关(默认关) + 规则数组(JSON,按序首条全命中生效)
--   2. sys_api 914:POST /crm/leads/batch-assign(Casbin RBAC 权限面)
--   3. sys_menu 374:线索管理页(351)下的「批量分配」按钮
--
-- ID 分配(2026-11-20 DBX 复核):sys_api MAX=913(本文件取 914);
--   sys_menu 按钮 374 起空闲(线索池按钮用到 373,本文件取 374,不与 lead.sql 350-379 区间冲突)。
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,整段执行。
-- 执行后:重启 qzt-server 刷新 Casbin 策略(sys_api 新增 path 需重启后生效)。
--
-- 基线说明:本文件种子需在下次基线整理时并入 docs/sql/qztgo.sql
--   (每周一 03:00 demoWeeklyReset 任务会重放 qztgo.sql 基线,未并入则本周种子会被重置掉);
--   本周内若发生基线重置,请重跑本文件。
--
-- 验证(执行后应分别为 2/1/1/1/有 351 的角色数):
--   SELECT COUNT(*) FROM sys_config WHERE `key` IN ('crm.lead.auto_assign_enabled','crm.lead.auto_assign_rules');
--   SELECT COUNT(*) FROM sys_api WHERE id=914;
--   SELECT COUNT(*) FROM sys_menu WHERE id=374;
--   SELECT COUNT(*) FROM sys_menu_api WHERE sys_menu_id=374 AND sys_api_id=914;
--   SELECT COUNT(DISTINCT sys_role_id) FROM sys_role_menu WHERE sys_menu_id=374;

-- ======================================================================
-- 1. sys_config 自动分配开关 + 规则(group=crm)
-- ======================================================================

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'crm', 'crm.lead.auto_assign_enabled', '线索自动分配开关', '0', 'bool', 0, 1, 1, 10, '开启后新入公海线索(官网留言/抖音广告)按规则自动分配给跟进人'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'crm.lead.auto_assign_enabled');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'crm', 'crm.lead.auto_assign_rules', '线索自动分配规则', '[]', 'json', 0, 1, 1, 11, '格式 [{"source":"","level":"","industry":"","user_id":1,"enabled":true}],按数组顺序取第一条所有非空条件均命中的规则;条件留空=该维度不限;v1 维度=来源/等级/行业(crm_lead 无 region 字段,区域维度不做)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'crm.lead.auto_assign_rules');

-- ======================================================================
-- 2. sys_api 914 批量分配接口(先删固定 ID 再插,保证幂等)
-- ======================================================================

DELETE FROM `sys_menu_api` WHERE `sys_menu_id` = 374 OR `sys_api_id` = 914;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` = 374;
DELETE FROM `sys_menu` WHERE `id` = 374;
DELETE FROM `sys_api` WHERE `id` = 914;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (914, '/crm/leads/batch-assign', 'POST', '线索管理', '批量分配线索(公海领取式+私海转移式)', NOW(3), NOW(3));

-- ======================================================================
-- 3. sys_menu 374 「批量分配」按钮(挂线索管理页 351 下,type=2 按钮)
-- ======================================================================

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (374, 351, '批量分配', NULL, NULL, NULL, 8, 2, 'crm:lead:batch_assign', 1, 1, NOW(3), NOW(3));

-- ======================================================================
-- 4. sys_menu_api 菜单-API 关联
-- ======================================================================

INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (374, 914);

-- ======================================================================
-- 5. 授权:给已拥有「线索管理」菜单(351)的角色补授「批量分配」按钮,
--    使其立即可用(与 351 持有面保持一致)
-- ======================================================================

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT rm.sys_role_id, 374 FROM sys_role_menu rm
WHERE rm.sys_menu_id = 351
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu x WHERE x.sys_role_id = rm.sys_role_id AND x.sys_menu_id = 374
  );

-- 执行完请重启 qzt-server 加载策略;但注意:重启仅 LoadPolicy(加载 casbin_rule 现有行),
-- 菜单-API 绑定不会自动物化成 casbin 策略行——物化只发生在 service 层 SetMenus。
-- 因此 SQL 直插种子必须同时直插 casbin_rule(见第 6 节),否则非超管 403(R70 D2 教训)。

-- ======================================================================
-- 6. casbin_rule 策略行(R70 D2 补):直接物化 4 个非超管角色的批量分配策略。
--    super_admin 走代码级放行无需行;角色名以 sys_role.code 为准。
-- ======================================================================

DELETE FROM `casbin_rule` WHERE v1 = '/crm/leads/batch-assign';
INSERT INTO `casbin_rule` (`ptype`,`v0`,`v1`,`v2`) VALUES
  ('p','sale','/crm/leads/batch-assign','POST'),
  ('p','sales_manager','/crm/leads/batch-assign','POST'),
  ('p','test_role','/crm/leads/batch-assign','POST'),
  ('p','sales_director','/crm/leads/batch-assign','POST');
