-- ============================================================
-- cms_scheduling.sql — P19 CMS 定时发布+内容有效期（开源 CMS 对标 C1）
-- 用途：cms_article 加 publish_at / expire_at 两列 + 到点推送定时任务。
--   1) 公开口径守卫：未到 publish_at 或已过 expire_at 的文章，公开接口
--      （列表/slug/详情）与 md 镜像/sitemap 同源不可见；
--   2) 到点推送：sys_job id=26 每分钟扫描「刚到点」的文章（10 分钟容错窗口）
--      触发百度/IndexNow 推送，cms_push_log 24h 去重防重复；
--   3) admin 文章表单新增「发布时间/有效期至」字段（复用现有 CRUD 端点，无新接口）。
-- ID 区间：sys_job 26（当前最大 25）；sys_api/sys_menu 不新增（复用文章 CRUD 权限）。
-- 兼容性：两列 NULL 兼容——存量文章行为与现状完全一致（无值=立即发布/永久有效）。
-- 幂等：information_schema 守卫 ALTER + 固定 ID 先 DELETE 再 INSERT。
-- 执行方式：DBX 执行（database=qztgo）或手动 mysql；sys_job 插入后需重启 qzt-server。
-- ============================================================

-- 1. publish_at（幂等守卫 ALTER + 索引）
SET @has_publish_at = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cms_article' AND COLUMN_NAME='publish_at');
SET @ddl1 = IF(@has_publish_at=0,
  'ALTER TABLE `cms_article` ADD COLUMN `publish_at` datetime(3) NULL COMMENT ''定时发布时间(NULL=立即)'' AFTER `status`, ADD INDEX `idx_cms_article_publish_at` (`publish_at`)',
  'SELECT 1');
PREPARE s1 FROM @ddl1; EXECUTE s1; DEALLOCATE PREPARE s1;

-- 2. expire_at（同口径，独立 ALTER 防合并失败）
SET @has_expire_at = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cms_article' AND COLUMN_NAME='expire_at');
SET @ddl2 = IF(@has_expire_at=0,
  'ALTER TABLE `cms_article` ADD COLUMN `expire_at` datetime(3) NULL COMMENT ''内容有效期至(NULL=永久)'' AFTER `publish_at`',
  'SELECT 1');
PREPARE s2 FROM @ddl2; EXECUTE s2; DEALLOCATE PREPARE s2;

-- 3. sys_job id=26 每分钟到点推送（插入后需重启服务生效）
DELETE FROM `sys_job` WHERE `id` = 26;
INSERT INTO `sys_job` (`id`, `job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`, `created_at`, `updated_at`)
VALUES (26, '官网CMS-到点推送', '官网', '0 * * * * *', 'cms.scheduling.push', 1, '每分钟扫描刚到 publish_at 的文章(10分钟容错窗口)触发百度/IndexNow推送,cms_push_log 24h去重防重复', NOW(3), NOW(3));
