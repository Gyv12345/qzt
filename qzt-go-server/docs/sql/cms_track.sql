-- cms_track.sql 官网埋点:事件表 DDL + 后台「访问统计」菜单种子。
--
-- 用途:官网(qzt-go-cms)第一方埋点。前台通过 POST /cms/public/track 批量上报
-- 访客行为(pageview/contact_submit/click_demo 等),后台「官网内容 → 访问统计」
-- 查看 PV/UV、页面/事件/来源 Top 榜,对应路由:
--   GET /cms/track/summary(管理端汇总)  GET /cms/track/list(原始事件分页)
--
-- ID 分配区间:菜单 2200(官网内容 111 下的子菜单;写文件时 sys_menu max(id)=2103,
-- 注意 980 已被「营销」目录占用,不可复用)。
-- 权限:super_admin 代码级旁路,插入菜单行即可见;其他角色需在
-- 「角色管理 → API 授权」勾选 GET /cms/track/summary、GET /cms/track/list。
-- 幂等:CREATE TABLE IF NOT EXISTS + 菜单先 DELETE 固定 ID 再 INSERT。
-- 执行方式:DBX MCP 或 mysql 客户端单条执行。时间:2026-09-22

CREATE TABLE IF NOT EXISTS `cms_track_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `event` varchar(64) NOT NULL COMMENT '事件名',
  `path` varchar(255) DEFAULT '' COMMENT '页面路径',
  `title` varchar(255) DEFAULT '' COMMENT '页面标题',
  `referrer` varchar(500) DEFAULT '' COMMENT '来源页',
  `visitor_id` varchar(64) DEFAULT '' COMMENT '匿名访客ID',
  `session_id` varchar(64) DEFAULT '' COMMENT '会话ID',
  `props` json DEFAULT NULL COMMENT '扩展属性JSON',
  `ip` varchar(64) DEFAULT '' COMMENT '上报IP',
  `ua` varchar(255) DEFAULT '' COMMENT 'User-Agent',
  `created_at` datetime(3) DEFAULT NULL COMMENT '上报时间',
  PRIMARY KEY (`id`),
  KEY `idx_cms_track_event_event` (`event`),
  KEY `idx_cms_track_event_path` (`path`),
  KEY `idx_cms_track_event_visitor` (`visitor_id`),
  KEY `idx_cms_track_event_ip` (`ip`),
  KEY `idx_cms_track_event_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='CMS官网埋点事件';

DELETE FROM `sys_menu` WHERE `id` = 2200;

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`, `deleted_at`)
VALUES
  (2200, 111, '访问统计', '/cms/track', 'cms/track/index', 'FundOutlined', 6, 1, 'cms:track:list', 1, 1, NOW(), NOW(), NULL);
