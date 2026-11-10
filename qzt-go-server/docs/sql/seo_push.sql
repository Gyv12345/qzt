-- ============================================================
-- seo_push.sql — 搜索引擎主动推送（cms_push_log 表 + 权限/定时任务种子）
-- 用途：官网新页面自动推给百度主动推送与 IndexNow，加速收录——
--       ① 文章创建/更新为已发布后自动推送（cms/service 的 TriggerArticlePush 钩子）；
--       ② 每日 07:40 cron 兜底扫近 7 天发布/更新的文章（cms.seo.push）；
--       ③ admin 文章列表手动「推送搜索引擎」按钮（/cms/push/*）。
--       配置在 config seo 节：token/key 走 .env（GEO_BAIDU_TOKEN / SEO_INDEXNOW_KEY），
--       未配置时接口报错、cron 记失败日志，功能静默降级不影响其他功能。
-- ID 区间：
--   cms_push_log    : 自增，无固定种子区间
--   sys_api         : 720~722（723~729 留扩展）
--   sys_menu        : 2240（按钮，挂文章管理页 112 下；2241~2245 留扩展）
--   sys_job         : 23（cms.seo.push，每天 07:40）
-- 执行方式：DBX MCP（连接「我的阿里云数据库」，database=qztgo）或手动 mysql 执行；
--       全部幂等（CREATE TABLE IF NOT EXISTS + 固定区间先 DELETE 再 INSERT），可重复执行。
--       注意：sys_job 插入后需重启服务才会被调度器加载。
-- ============================================================

-- 1. 推送日志表（一条 URL 一次调用一行；24h 幂等去重靠 created_at 查询，不加唯一约束）
CREATE TABLE IF NOT EXISTS `cms_push_log` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `channel`    VARCHAR(16)  NOT NULL COMMENT '通道 baidu/indexnow',
  `url`        VARCHAR(500) NOT NULL COMMENT '推送URL',
  `ref_type`   VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '关联类型 cms_article/custom',
  `ref_id`     BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '关联ID(0=纯URL)',
  `status`     VARCHAR(16)  NOT NULL COMMENT 'success/failed/skipped',
  `http_code`  INT          NOT NULL DEFAULT 0 COMMENT 'HTTP状态码(0=未发出请求)',
  `resp_body`  VARCHAR(500) NOT NULL DEFAULT '' COMMENT '响应摘要(截断)',
  `error`      VARCHAR(500) NOT NULL DEFAULT '' COMMENT '失败或跳过原因',
  `batch_id`   VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '批次ID(同一次推送操作共享)',
  `created_at` DATETIME(3)  DEFAULT NULL COMMENT '创建时间',
  `updated_at` DATETIME(3)  DEFAULT NULL COMMENT '更新时间',
  `deleted_at` DATETIME(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_channel_url_created` (`channel`, `url`, `created_at`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_cms_push_log_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索引擎推送日志';

-- 2. sys_api 权限（path 与 Casbin obj 一致；注意请求实际路径带 /cms 前缀由模块挂载）
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2240 AND 2245;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2240 AND 2245;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2240 AND 2245;
DELETE FROM `sys_api` WHERE `id` BETWEEN 720 AND 729;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (720, '/cms/push/baidu',    'POST', '官网内容', '推送百度',     NOW(3), NOW(3)),
  (721, '/cms/push/indexnow', 'POST', '官网内容', '推送IndexNow', NOW(3), NOW(3)),
  (722, '/cms/push/logs',     'GET',  '官网内容', '推送日志列表', NOW(3), NOW(3));

-- 3. sys_menu —— 推送按钮，挂文章管理页(112)下
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2240, 112, '推送搜索引擎', NULL, NULL, NULL, 16, 2, 'cms:article:push', 1, 1, NOW(3), NOW(3));

-- 4. sys_menu_api —— 按钮 与 API 关联
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2240, 720),
  (2240, 721),
  (2240, 722);

-- 5. 授权给超级管理员
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id BETWEEN 2240 AND 2245
WHERE r.code = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- 6. sys_job —— 每日兜底推送（07:40，早于 GEO 产线 08:30；插入后需重启服务生效）
DELETE FROM `sys_job` WHERE `id` = 23;
INSERT INTO `sys_job` (`id`, `job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`, `created_at`, `updated_at`)
VALUES (23, '官网SEO-每日推送', '官网', '0 40 7 * * *', 'cms.seo.push', 1, '每天 07:40 把近7天发布/更新的文章推给百度+IndexNow(24h内已推自动跳过,百度按每日配额截断)', NOW(3), NOW(3));
