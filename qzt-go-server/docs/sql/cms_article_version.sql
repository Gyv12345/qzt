-- ============================================================
-- cms_article_version.sql — P20 CMS 文章修订版本/回滚（开源 CMS 对标 C2）
-- 用途：cms_article_version 快照表 + 版本列表/回滚接口的 API 与按钮权限。
--       ① 文章每次保存(更新)前自动快照旧内容(title/summary/content/cover_url)；
--       ② 回滚=目标版本内容写回正文,写回前再快照当前态(版本链不断链)；
--       ③ 每篇保留最近 20 版,超出自动清理最旧。
-- ID 区间：sys_api 792~793（当前最大 791）；sys_menu 2297（当前最大 2296,挂文章页 112 下）。
-- 幂等：CREATE TABLE IF NOT EXISTS + 固定 ID ON DUPLICATE KEY。
-- 执行方式：DBX MCP（database=qztgo）或手动 mysql；casbin 由角色菜单重建,需重启服务生效。
-- ============================================================

-- 1. 版本快照表
CREATE TABLE IF NOT EXISTS `cms_article_version` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `article_id`  BIGINT UNSIGNED NOT NULL COMMENT '文章ID',
  `version_no`  INT NOT NULL COMMENT '版本号(每篇递增)',
  `title`       VARCHAR(255) NOT NULL DEFAULT '' COMMENT '标题快照',
  `summary`     VARCHAR(500) NOT NULL DEFAULT '' COMMENT '摘要快照',
  `content`     LONGTEXT COMMENT '正文快照',
  `cover_url`   VARCHAR(500) NOT NULL DEFAULT '' COMMENT '封面快照',
  `editor_id`   BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '快照时操作人ID',
  `editor_name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '快照时操作人昵称',
  `created_at`  DATETIME(3) DEFAULT NULL COMMENT '快照时间',
  `updated_at`  DATETIME(3) DEFAULT NULL,
  `deleted_at`  DATETIME(3) DEFAULT NULL COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_cav_article` (`article_id`, `version_no`),
  KEY `idx_cav_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CMS 文章修订版本快照';

-- 2. sys_api（版本列表 + 回滚）
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` = 2297;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` = 2297;
DELETE FROM `sys_menu` WHERE `id` = 2297;
DELETE FROM `sys_api` WHERE `id` IN (792, 793);

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (792, '/cms/articles/:id/versions', 'GET', '官网内容', '文章版本列表', NOW(3), NOW(3)),
  (793, '/cms/articles/:id/versions/:version_id/rollback', 'POST', '官网内容', '回滚文章到历史版本', NOW(3), NOW(3));

-- 3. sys_menu 2297 版本按钮（挂文章管理页 112 下）
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2297, 112, '文章版本管理', NULL, NULL, NULL, 17, 2, 'cms:article:version', 1, 1, NOW(3), NOW(3));

-- 4. sys_menu_api 关联
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2297, 792),
  (2297, 793);

-- 5. 授权给超级管理员（菜单可见性）
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, 2297 FROM sys_role r
WHERE r.code = 'super_admin'
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = 2297);
