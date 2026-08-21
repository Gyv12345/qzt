-- ============================================================
-- marketing.sql — 营销模块(抖音/巨量引擎飞鱼线索自动入库)
-- ------------------------------------------------------------
-- 作用:
--   1. 建 2 张表(marketing_account 渠道账号 / marketing_lead_log 线索同步日志)
--   2. 字典 LEAD_SOURCE 追加「抖音广告」
--   3. sys_job 定时任务(marketing.feiyu.pull 每 15 分钟拉取线索)
--   4. sys_api / sys_menu(顶级「营销」分组 + 渠道账号 + 同步日志)/ sys_menu_api / sys_role_menu
--
-- 遵循工作区 AGENTS.md「种子数据与建表」约定:建表 DDL + 种子一律走 SQL,
-- Go 代码不建表不写种子(无 AutoMigrate/SeedData)。
--
-- 幂等:CREATE TABLE IF NOT EXISTS + 固定 ID 区间先 DELETE 再 INSERT,可重复执行。
--
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行;
--   或 mysql -h <host> -P 3306 -u <user> -p qztgo < docs/sql/marketing.sql
--
-- ID 分配(执行时已查库确认 max(api)=502, max(menu)=968, 均不冲突):
--   sys_api  : 510~517
--   sys_menu : 980 顶级分组; 981/982 两个菜单; 990~995 按钮节点
--   sys_dict : 按 code/value 幂等(LEAD_SOURCE 追加 value='5')
--   sys_job  : 按 bean_class 幂等
--
-- 注意:sys_job 插入后需重启服务生效(调度器启动时加载,无热重载)。
-- ============================================================

-- ============================================================
-- 1. 建表 DDL
-- ============================================================

-- 营销渠道账号(每客户一条:开放平台应用 + OAuth 授权 token + 同步游标)
CREATE TABLE IF NOT EXISTS `marketing_account` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '账号备注名',
  `channel` varchar(32) NOT NULL DEFAULT 'oceanengine' COMMENT '渠道(oceanengine巨量引擎)',
  `app_id` varchar(64) NOT NULL COMMENT '开放平台应用ID',
  `app_secret` varchar(128) DEFAULT NULL COMMENT '应用Secret(脱敏不回显)',
  `access_token` varchar(512) DEFAULT NULL COMMENT '访问令牌(约24h)',
  `refresh_token` varchar(512) DEFAULT NULL COMMENT '刷新令牌(约30d)',
  `token_expires_at` datetime DEFAULT NULL COMMENT 'access_token过期时间',
  `refresh_expires_at` datetime DEFAULT NULL COMMENT 'refresh_token过期时间',
  `advertiser_ids` varchar(512) DEFAULT NULL COMMENT '已授权广告主ID(逗号分隔)',
  `status` tinyint DEFAULT 0 COMMENT '0待授权 1已授权 2授权失效',
  `enabled` tinyint DEFAULT 1 COMMENT '1启用 0停用',
  `last_sync_at` datetime DEFAULT NULL COMMENT '上次线索同步游标时间',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_marketing_account_status` (`status`,`enabled`),
  KEY `idx_marketing_account_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='营销渠道账号(巨量引擎)';

-- 营销线索同步日志(追加写,不软删;uk(account_id, external_id) 是幂等核心)
CREATE TABLE IF NOT EXISTS `marketing_lead_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint unsigned NOT NULL COMMENT '渠道账号ID',
  `external_id` varchar(64) NOT NULL COMMENT '外部线索ID(飞鱼clue_id)',
  `lead_id` bigint unsigned DEFAULT NULL COMMENT '入库后的crm_lead.id(重复/失败为NULL)',
  `name` varchar(255) DEFAULT NULL COMMENT '姓名',
  `phone` varchar(30) DEFAULT NULL COMMENT '手机号(可能是虚拟号)',
  `company` varchar(255) DEFAULT NULL COMMENT '公司',
  `campaign_name` varchar(255) DEFAULT NULL COMMENT '广告计划名称',
  `ad_name` varchar(255) DEFAULT NULL COMMENT '广告名称',
  `lead_create_time` datetime DEFAULT NULL COMMENT '留资时间',
  `status` tinyint NOT NULL COMMENT '1已入库 2重复跳过 3失败',
  `detail` varchar(255) DEFAULT NULL COMMENT '说明(重复/失败原因)',
  `raw` json COMMENT '原始报文(排查用)',
  `created_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_marketing_lead_log_ext` (`account_id`,`external_id`),
  KEY `idx_marketing_lead_log_status` (`status`),
  KEY `idx_marketing_lead_log_phone` (`phone`),
  KEY `idx_marketing_lead_log_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='营销线索同步日志';

-- ============================================================
-- 2. 字典 LEAD_SOURCE 追加「抖音广告」(幂等:按 code+value 跳过;免会话变量,DBX 单语句可执行)
-- ============================================================
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT d.id, '抖音广告', '5', 5, 1, '' FROM sys_dict d
WHERE d.code='LEAD_SOURCE' AND NOT EXISTS (SELECT 1 FROM sys_dict_item i WHERE i.dict_id=d.id AND i.value='5');

-- ============================================================
-- 3. sys_job 定时任务(bean_class 必须与 Go 代码 RegisterJobHandler 完全一致)
--    调度器启动时加载,无热重载——插入后需重启服务生效。
-- ============================================================
INSERT INTO `sys_job` (`job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`)
SELECT '抖音线索拉取', 'marketing', '0 */15 * * * *', 'marketing.feiyu.pull', 1, '每 15 分钟拉取飞鱼线索,去重后入 CRM 线索公海'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_job` WHERE `bean_class` = 'marketing.feiyu.pull');

-- ============================================================
-- 4. sys_api —— 营销模块接口(path 与 Casbin obj 一致)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 980 AND 1019;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 980 AND 1019;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 980 AND 1019;
DELETE FROM `sys_api` WHERE `id` BETWEEN 510 AND 529;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  -- 渠道账号 (510-515)
  (510, '/marketing/accounts',                    'GET',    '营销-渠道账号', '渠道账号列表', NOW(3), NOW(3)),
  (511, '/marketing/accounts',                    'POST',   '营销-渠道账号', '新增渠道账号', NOW(3), NOW(3)),
  (512, '/marketing/accounts/:id',                'PUT',    '营销-渠道账号', '编辑渠道账号', NOW(3), NOW(3)),
  (513, '/marketing/accounts/:id',                'DELETE', '营销-渠道账号', '删除渠道账号', NOW(3), NOW(3)),
  (514, '/marketing/accounts/:id/authorize-url',  'GET',    '营销-渠道账号', '生成授权链接', NOW(3), NOW(3)),
  (515, '/marketing/accounts/:id/sync',           'POST',   '营销-渠道账号', '立即同步线索', NOW(3), NOW(3)),
  -- 同步日志 (516-517)
  (516, '/marketing/logs',                        'GET',    '营销-同步日志', '同步日志列表', NOW(3), NOW(3)),
  (517, '/marketing/logs/:id',                    'GET',    '营销-同步日志', '同步日志详情', NOW(3), NOW(3));

-- ============================================================
-- 5. sys_menu —— 顶级「营销」分组
--    component 与 admin 前端 src/pages 路径对应:
--    marketing/account/index → src/pages/marketing/account/index.tsx
--    marketing/log/index     → src/pages/marketing/log/index.tsx
-- ============================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  -- 营销顶级分组目录(与「客户管理」73 同级)
  (980, 0, '营销', '', NULL, 'RocketOutlined', 2, 0, '', 1, 1, NOW(3), NOW(3)),

  -- 渠道账号菜单
  (981, 980, '渠道账号', '/marketing/account', 'marketing/account/index', 'ApiOutlined', 1, 1, 'marketing:account:list', 1, 1, NOW(3), NOW(3)),
  -- 渠道账号按钮
  (990, 981, '新增渠道账号', NULL, NULL, NULL, 1, 2, 'marketing:account:add',        1, 1, NOW(3), NOW(3)),
  (991, 981, '编辑渠道账号', NULL, NULL, NULL, 2, 2, 'marketing:account:edit',       1, 1, NOW(3), NOW(3)),
  (992, 981, '删除渠道账号', NULL, NULL, NULL, 3, 2, 'marketing:account:delete',     1, 1, NOW(3), NOW(3)),
  (993, 981, 'OAuth 授权',   NULL, NULL, NULL, 4, 2, 'marketing:account:authorize',  1, 1, NOW(3), NOW(3)),
  (994, 981, '立即同步',     NULL, NULL, NULL, 5, 2, 'marketing:account:sync',       1, 1, NOW(3), NOW(3)),

  -- 同步日志菜单
  (982, 980, '同步日志', '/marketing/log', 'marketing/log/index', 'FileTextOutlined', 2, 1, 'marketing:log:list', 1, 1, NOW(3), NOW(3)),
  -- 同步日志按钮
  (995, 982, '查看详情', NULL, NULL, NULL, 1, 2, 'marketing:log:detail', 1, 1, NOW(3), NOW(3));

-- ============================================================
-- 6. sys_menu_api —— 菜单(含按钮)与 API 关联
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  -- 渠道账号
  (981, 510),  -- list 菜单 → GET /marketing/accounts
  (990, 511),  -- 新增 → POST /marketing/accounts
  (991, 512),  -- 编辑 → PUT /marketing/accounts/:id
  (992, 513),  -- 删除 → DELETE /marketing/accounts/:id
  (993, 514),  -- 授权 → GET /marketing/accounts/:id/authorize-url
  (994, 515),  -- 立即同步 → POST /marketing/accounts/:id/sync
  -- 同步日志
  (982, 516),  -- list 菜单 → GET /marketing/logs
  (995, 517);  -- 查看详情 → GET /marketing/logs/:id

-- ============================================================
-- 7. 授权给超级管理员(使其立即可见)
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id BETWEEN 980 AND 1019
WHERE r.code = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );
