-- =====================================================================
-- workflow.sql
-- 用途:P27 自动化工作流引擎 —— 两张业务表(工作流定义/执行记录)
--      + 菜单(自动化目录/工作流定义/执行记录及按钮) + API 登记 + 菜单-API 绑定
--      + casbin 策略 + 角色授权。
-- 幂等:CREATE TABLE IF NOT EXISTS + INSERT 均带 NOT EXISTS 防重,可重复执行。
-- ID 区间:
--   sys_menu 2320~2328 (2320 顶级目录「自动化」,2321 定义页,2322 执行记录页,2323~2328 按钮)
--   sys_api  830~841   (12 个端点)
--   casbin_rule / sys_role_menu 不带 id 自增插入
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行。
-- 注意:casbin_rule 直插后必须重启 qzt-server 才生效(Casbin enforcer 启动时加载策略);
--      菜单/角色授权实时生效(前端重新登录/刷新菜单即可)。
-- 角色集合:自动化为管理侧配置能力 —— 授权给 1(super_admin)/4(销售经理)/9(销售总监)。
-- 关联代码:
--   qzt-go-server internal/model/workflow/workflow.go(模型)
--   qzt-go-server internal/repository/workflow/workflow.go(仓储)
--   qzt-go-server internal/module/workflow/(router/handler/service,执行引擎)
--   qzt-go-admin src/pages/workflow/(definition 画布编辑 / run 执行记录)
-- =====================================================================

-- ======================================================================
-- 1. 建表:workflow_definition + workflow_run
-- ======================================================================

-- 工作流定义(触发器+画布图)
CREATE TABLE IF NOT EXISTS `workflow_definition` (
  `id`             bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`           varchar(100) NOT NULL COMMENT '名称',
  `description`    varchar(500) DEFAULT '' COMMENT '描述',
  `trigger_type`   varchar(20)  NOT NULL DEFAULT 'MANUAL' COMMENT '触发类型:MANUAL/CRON/EVENT',
  `trigger_config` text COMMENT '触发配置JSON',
  `graph`          text COMMENT '画布节点图JSON',
  `enabled`        tinyint      NOT NULL DEFAULT 0 COMMENT '启用:1是 0否',
  `owner_id`       bigint unsigned DEFAULT NULL COMMENT '创建人ID(sys_user)',
  `last_run_at`    datetime(3)  DEFAULT NULL COMMENT '最近运行时间',
  `run_count`      bigint       NOT NULL DEFAULT 0 COMMENT '累计运行次数',
  `created_at`     datetime(3)  DEFAULT NULL,
  `updated_at`     datetime(3)  DEFAULT NULL,
  `deleted_at`     datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_workflow_definition_trigger` (`trigger_type`,`enabled`),
  KEY `idx_workflow_definition_owner` (`owner_id`),
  KEY `idx_workflow_definition_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='自动化工作流定义';

-- 执行记录
CREATE TABLE IF NOT EXISTS `workflow_run` (
  `id`              bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `definition_id`   bigint unsigned NOT NULL COMMENT '工作流定义ID',
  `trigger_source`  varchar(20)  NOT NULL COMMENT '触发来源:MANUAL/CRON/EVENT',
  `trigger_payload` text COMMENT '触发参数JSON(事件上下文快照)',
  `status`          varchar(20)  NOT NULL DEFAULT 'RUNNING' COMMENT '状态:RUNNING/SUCCESS/FAILED',
  `node_trace`      text COMMENT '节点执行轨迹JSON:[{number,name,node_type,status,output,error}]',
  `error`           varchar(1000) DEFAULT '' COMMENT '失败原因',
  `cost_ms`         bigint       NOT NULL DEFAULT 0 COMMENT '耗时毫秒',
  `created_at`      datetime(3)  DEFAULT NULL,
  `updated_at`      datetime(3)  DEFAULT NULL,
  `deleted_at`      datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_workflow_run_definition` (`definition_id`),
  KEY `idx_workflow_run_status` (`status`),
  KEY `idx_workflow_run_created` (`created_at`),
  KEY `idx_workflow_run_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='自动化工作流执行记录';

-- ======================================================================
-- 2. sys_menu 2320~2328(2320 顶级目录「自动化」;2321/2322 页面;2323~2328 按钮)
-- ======================================================================

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2320, 0, '自动化', '/workflow', '', 'PartitionOutlined', 24, 0, '', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2320);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2321, 2320, '工作流定义', '/workflow/definition', 'workflow/definition/index', 'ApartmentOutlined', 1, 1, 'workflow:def:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2321);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2322, 2320, '执行记录', '/workflow/run', 'workflow/run/index', 'FieldTimeOutlined', 2, 1, 'workflow:run:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2322);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2323, 2321, '新增工作流', '', NULL, 1, 2, 'workflow:def:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2323);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2324, 2321, '编辑工作流', '', NULL, 2, 2, 'workflow:def:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2324);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2325, 2321, '删除工作流', '', NULL, 3, 2, 'workflow:def:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2325);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2326, 2321, '运行工作流', '', NULL, 4, 2, 'workflow:def:run', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2326);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2327, 2322, '重跑执行记录', '', NULL, 1, 2, 'workflow:run:retry', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2327);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2328, 2322, '删除执行记录', '', NULL, 2, 2, 'workflow:run:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2328);

-- ======================================================================
-- 3. sys_api 830~841(12 个端点,group='工作流')
-- ======================================================================

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`)
SELECT x.id, x.path, x.method, '工作流', x.descr, NOW(3), NOW(3) FROM (
  SELECT 830 AS id, '/workflow/definitions'            AS path, 'GET'    AS method, '工作流列表'     AS descr UNION ALL
  SELECT 831, '/workflow/definitions',                 'POST',   '新增工作流' UNION ALL
  SELECT 832, '/workflow/definitions/:id',             'GET',    '工作流详情' UNION ALL
  SELECT 833, '/workflow/definitions/:id',             'PUT',    '编辑工作流' UNION ALL
  SELECT 834, '/workflow/definitions/:id',             'DELETE', '删除工作流' UNION ALL
  SELECT 835, '/workflow/definitions/:id/run',         'POST',   '手动运行工作流' UNION ALL
  SELECT 836, '/workflow/definitions/:id/enable',      'PUT',    '启用/停用工作流' UNION ALL
  SELECT 837, '/workflow/events',                      'GET',    '事件目录' UNION ALL
  SELECT 838, '/workflow/runs',                        'GET',    '执行记录列表' UNION ALL
  SELECT 839, '/workflow/runs/:id',                    'GET',    '执行记录详情' UNION ALL
  SELECT 840, '/workflow/runs/:id/retry',              'POST',   '重跑执行记录' UNION ALL
  SELECT 841, '/workflow/runs/:id',                    'DELETE', '删除执行记录'
) x
WHERE NOT EXISTS (SELECT 1 FROM `sys_api` a WHERE a.id = x.id AND a.deleted_at IS NULL);

-- ======================================================================
-- 4. sys_menu_api —— 菜单(含按钮)与 API 关联
--    列表/详情绑菜单,写操作绑对应按钮
-- ======================================================================

INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`)
SELECT m.menu_id, a.id FROM sys_api a JOIN (
  SELECT 2321 AS menu_id, 830 AS api_no UNION ALL
  SELECT 2321, 832 UNION ALL
  SELECT 2321, 837 UNION ALL
  SELECT 2323, 831 UNION ALL
  SELECT 2324, 833 UNION ALL
  SELECT 2324, 836 UNION ALL
  SELECT 2325, 834 UNION ALL
  SELECT 2326, 835 UNION ALL
  SELECT 2322, 838 UNION ALL
  SELECT 2322, 839 UNION ALL
  SELECT 2327, 840 UNION ALL
  SELECT 2328, 841
) m ON a.id = m.api_no
WHERE a.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys_menu_api x WHERE x.sys_menu_id = m.menu_id AND x.sys_api_id = a.id
  );

-- ======================================================================
-- 5. casbin_rule —— p, 角色, 路径, 方法(授权 4销售经理/9销售总监;1 super_admin 走旁路)
--    ⚠️ 直插后必须重启 qzt-server 才生效(enforcer 启动加载策略)。
-- ======================================================================

INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`)
SELECT 'p', r.code, x.path, x.method FROM sys_role r JOIN (
  SELECT '/workflow/definitions'            AS path, 'GET' AS method UNION ALL
  SELECT '/workflow/definitions',           'POST' UNION ALL
  SELECT '/workflow/definitions/:id',       'GET' UNION ALL
  SELECT '/workflow/definitions/:id',       'PUT' UNION ALL
  SELECT '/workflow/definitions/:id',       'DELETE' UNION ALL
  SELECT '/workflow/definitions/:id/run',   'POST' UNION ALL
  SELECT '/workflow/definitions/:id/enable', 'PUT' UNION ALL
  SELECT '/workflow/events',                'GET' UNION ALL
  SELECT '/workflow/runs',                  'GET' UNION ALL
  SELECT '/workflow/runs/:id',              'GET' UNION ALL
  SELECT '/workflow/runs/:id/retry',        'POST' UNION ALL
  SELECT '/workflow/runs/:id',              'DELETE'
) x
WHERE r.code IN ('sales_manager', 'sales_director')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM casbin_rule c
    WHERE c.ptype = 'p' AND c.v0 = r.code AND c.v1 = x.path AND c.v2 = x.method
      AND (c.v3 = '' OR c.v3 IS NULL) AND (c.v4 = '' OR c.v4 IS NULL) AND (c.v5 = '' OR c.v5 IS NULL)
  );

-- ======================================================================
-- 6. sys_role_menu —— 菜单 2320~2328 授权 1/4/9
-- ======================================================================

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id BETWEEN 2320 AND 2328
WHERE r.id IN (1, 4, 9)
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );
