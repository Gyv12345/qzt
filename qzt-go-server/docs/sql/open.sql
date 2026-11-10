-- ============================================================
-- open.sql — P17 开放集成地基：Webhook 出站执行器 + REST 开放 API
-- ------------------------------------------------------------
-- 作用:
--   1. 建 2 张业务表(open_webhook / open_webhook_event)
--   2. sys_job 种子：open.webhook.dispatch(每分钟投递) + open.webhook.cleanup(每日清理)
--   3. sys_api 10 条(操作日志元数据 + Casbin obj)
--   4. sys_menu 「开放集成」目录 + 2 菜单 + 5 按钮
--   /open/v1/*(api 788/789)绑定到目录节点 2280——凡授「开放集成」菜单树的角色
--   经 Casbin 自动重建即获得开放 API 访问权,无需直插 casbin_rule。
--   788/789 也可经 admin「系统管理-接口管理」授权给专用集成角色。
--   5. sys_menu_api 关联 + 授权给 super_admin
-- ============================================================
-- 遵循工作区 AGENTS.md「种子数据与建表」约定:业务建表 DDL + 种子一律走 SQL,
-- 禁止 Go AutoMigrate / SeedData。
--
-- 幂等:CREATE TABLE IF NOT EXISTS + 固定 ID 区间先 DELETE 再 INSERT,可重复执行。
--
-- 执行方式:DBX MCP 执行(开发库 qztgo),或:
--   mysql -h <host> -P 3306 -u <user> -p qztgo < docs/sql/open.sql
--
-- ID 分配(2026-11-06 实测 max(api)=758, max(menu)=2259):
--   sys_api  : 780~789 (10 条)
--   sys_menu : 2280 目录; 2281/2282 菜单; 2290~2294 按钮
-- ============================================================

-- ============================================================
-- 1. 建表 DDL
-- ============================================================

-- Webhook 端点配置
CREATE TABLE IF NOT EXISTS `open_webhook` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT '端点名称',
  `url` varchar(512) NOT NULL COMMENT '投递目标 URL(仅 http/https)',
  `secret` varchar(64) NOT NULL COMMENT 'HMAC-SHA256 签名密钥(敏感,创建时缺省服务端生成)',
  `events` varchar(255) NOT NULL DEFAULT '' COMMENT '订阅事件,逗号分隔,空=订阅全部',
  `status` tinyint DEFAULT 1 COMMENT '1启用 0停用',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `created_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_open_webhook_status` (`status`),
  KEY `idx_open_webhook_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='开放平台 Webhook 端点配置';

-- Webhook 事件投递日志(outbox)
CREATE TABLE IF NOT EXISTS `open_webhook_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `webhook_id` bigint unsigned NOT NULL COMMENT '目标 webhook',
  `event_type` varchar(64) NOT NULL COMMENT '事件类型',
  `payload` text COMMENT '事件载荷(JSON 快照)',
  `status` tinyint DEFAULT 0 COMMENT '0待投递 1成功 2失败重试中 3死信',
  `retry_count` int DEFAULT 0 COMMENT '已尝试次数',
  `max_retries` int DEFAULT 5 COMMENT '最大尝试次数',
  `next_retry_at` datetime(3) DEFAULT NULL COMMENT '下次投递时间',
  `last_http_status` int DEFAULT NULL COMMENT '最近一次 HTTP 状态码',
  `last_error` varchar(512) DEFAULT NULL COMMENT '最近一次错误',
  `delivered_at` datetime(3) DEFAULT NULL COMMENT '投递成功时间',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_owe_whs` (`webhook_id`,`status`),
  KEY `idx_owe_snr` (`status`,`next_retry_at`),
  KEY `idx_owe_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Webhook投递日志';

-- ============================================================
-- 2. sys_job 种子(幂等:按 bean_class NOT EXISTS;插入后需重启服务生效)
-- ============================================================

INSERT INTO `sys_job` (`job_name`,`job_group`,`cron_expression`,`bean_class`,`status`,`remark`)
SELECT 'Webhook投递','open','0 * * * * *','open.webhook.dispatch',1,'扫描待投递事件,签名后 POST 到订阅端点,失败按退避重试'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_job` WHERE `bean_class` = 'open.webhook.dispatch');

INSERT INTO `sys_job` (`job_name`,`job_group`,`cron_expression`,`bean_class`,`status`,`remark`)
SELECT 'Webhook日志清理','open','0 30 3 * * *','open.webhook.cleanup',1,'每日清理 30 天前的成功投递日志'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_job` WHERE `bean_class` = 'open.webhook.cleanup');

-- ============================================================
-- 3. sys_api —— 开放集成接口(path 与 Casbin obj 一致)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2280 AND 2299;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2280 AND 2299;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2280 AND 2299;
DELETE FROM `sys_api` WHERE `id` BETWEEN 780 AND 789;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (780, '/open/webhooks',                    'GET',    '开放集成', 'Webhook列表',  NOW(3), NOW(3)),
  (781, '/open/webhooks',                    'POST',   '开放集成', '创建Webhook',  NOW(3), NOW(3)),
  (782, '/open/webhooks/:id',                'GET',    '开放集成', 'Webhook详情',  NOW(3), NOW(3)),
  (783, '/open/webhooks/:id',                'PUT',    '开放集成', '更新Webhook',  NOW(3), NOW(3)),
  (784, '/open/webhooks/:id',                'DELETE', '开放集成', '删除Webhook',  NOW(3), NOW(3)),
  (785, '/open/webhooks/:id/status',         'PUT',    '开放集成', '启停Webhook',  NOW(3), NOW(3)),
  (786, '/open/webhook-events',              'GET',    '开放集成', '投递日志列表', NOW(3), NOW(3)),
  (787, '/open/webhook-events/:id/retry',    'POST',   '开放集成', '重试投递',     NOW(3), NOW(3)),
  (788, '/open/v1/events',                   'GET',    '开放集成', '事件目录(开放)', NOW(3), NOW(3)),
  (789, '/open/v1/org/tree',                 'GET',    '开放集成', '组织树(开放)',   NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu —— 「开放集成」一级目录 + 菜单 + 按钮
-- ============================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  -- 一级目录
  (2280, 0, '开放集成', '/open', NULL, 'ApiOutlined', 90, 0, '', 1, 1, NOW(3), NOW(3)),

  -- Webhook 订阅菜单
  (2281, 2280, 'Webhook 订阅', '/open/webhook', 'open/webhook/index', 'ApiOutlined', 1, 1, 'open:webhook:list', 1, 1, NOW(3), NOW(3)),
  (2290, 2281, '新增Webhook', NULL, NULL, NULL, 1, 2, 'open:webhook:add',    1, 1, NOW(3), NOW(3)),
  (2291, 2281, '编辑Webhook', NULL, NULL, NULL, 2, 2, 'open:webhook:edit',   1, 1, NOW(3), NOW(3)),
  (2292, 2281, '删除Webhook', NULL, NULL, NULL, 3, 2, 'open:webhook:delete', 1, 1, NOW(3), NOW(3)),
  (2293, 2281, '启停Webhook', NULL, NULL, NULL, 4, 2, 'open:webhook:status', 1, 1, NOW(3), NOW(3)),

  -- 投递日志菜单
  (2282, 2280, '投递日志', '/open/webhooklog', 'open/webhooklog/index', 'ProfileOutlined', 2, 1, 'open:webhooklog:list', 1, 1, NOW(3), NOW(3)),
  (2294, 2282, '重试投递', NULL, NULL, NULL, 1, 2, 'open:webhooklog:retry', 1, 1, NOW(3), NOW(3));

-- ============================================================
-- 5. sys_menu_api 绑定 + 授权超管
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  -- Webhook 订阅页
  (2281, 780),  -- list → GET /open/webhooks
  (2281, 782),  -- list → GET /open/webhooks/:id
  (2281, 788),  -- 列表页需要事件目录下拉 → GET /open/v1/events
  (2290, 781),
  (2291, 783),
  (2292, 784),
  (2293, 785),
  -- 投递日志页
  (2282, 786),
  (2294, 787),
  -- /open/v1/* 绑定到目录:授「开放集成」目录的角色自动获得开放 API 访问权
  (2280, 788),
  (2280, 789);

-- 授权给超级管理员(立即可见可用)
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id BETWEEN 2280 AND 2294
WHERE r.code = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );
