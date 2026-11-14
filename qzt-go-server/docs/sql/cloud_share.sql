-- ============================================================================
-- cloud_share.sql  网盘文件分享(2026-11-12)
--
-- 用途:企业网盘(cloud 模块)「分享下载」—— 登录态创建/管理分享链接,
--   公开侧免登录取元信息与下载地址(签出 10 分钟有效 URL)。
--   提取码恒时校验(hmac.Equal);公开下载每 IP 每分钟 10 次频控(应用侧 Redis Incr)。
--
-- ID 分配:
--   cloud_share 新表(自增,无固定种子数据);
--   sys_api 854-856(现用最大 853):854 GET /cloud/shares、855 POST /cloud/shares、
--     856 DELETE /cloud/shares/:id,group=网盘-分享;
--   sys_menu 2351-2352(现用最大 2350):按钮挂网盘菜单 721(/cloud/file,
--     实查 parent 720=网盘目录、721=文件管理页面菜单)下——
--     2351「分享」cloud:share:create、2352「取消分享」cloud:share:cancel;
--   公开接口 GET /cloud/public/shares/:token、POST /cloud/public/shares/:token/download
--     不登记 sys_api(同 mall 口径,公开接口不进操作日志)。
--
-- 幂等性:建表 CREATE TABLE IF NOT EXISTS;sys_api/sys_menu 先 DELETE 硬删
--   固定 ID 区间再 INSERT;sys_menu_api/sys_role_menu 复合主键按 NOT EXISTS 守卫。
--
-- 执行方式:DBX MCP「我的阿里云数据库」逐条执行(多语句只生效第一条,须单语句单调用)。
-- ============================================================================

-- ── 1. 分享表 ──
CREATE TABLE IF NOT EXISTS `cloud_share` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `token` varchar(64) NOT NULL COMMENT '分享令牌(43位base64url)',
  `file_id` bigint unsigned NOT NULL COMMENT '被分享的文件ID',
  `owner_id` bigint unsigned NOT NULL COMMENT '创建人(分享所有者)',
  `extract_code` varchar(16) NOT NULL DEFAULT '' COMMENT '提取码(可空)',
  `expire_at` datetime NOT NULL COMMENT '过期时间',
  `disabled` tinyint NOT NULL DEFAULT 0 COMMENT '0正常 1=已取消',
  `download_count` int NOT NULL DEFAULT 0 COMMENT '累计下载次数',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token` (`token`),
  KEY `idx_cloud_share_file_id` (`file_id`),
  KEY `idx_cloud_share_owner_id` (`owner_id`),
  KEY `idx_cloud_share_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网盘文件分享';

-- ── 2. 管理端接口登记 sys_api 854-856 ──
DELETE FROM `sys_api` WHERE `id` IN (854,855,856);

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
(854, '/cloud/shares',      'GET',    '网盘-分享', '我的分享分页', NOW(3), NOW(3)),
(855, '/cloud/shares',      'POST',   '网盘-分享', '创建文件分享', NOW(3), NOW(3)),
(856, '/cloud/shares/:id',  'DELETE', '网盘-分享', '取消分享',     NOW(3), NOW(3));

-- ── 3. 菜单按钮 sys_menu 2351-2352(挂网盘-文件管理菜单 721 下) ──
DELETE FROM `sys_menu` WHERE `id` IN (2351,2352);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`) VALUES
(2351, 721, '分享',     NULL, NULL, NULL, 1, 2, 'cloud:share:create', 1, 1, NOW(3), NOW(3)),
(2352, 721, '取消分享', NULL, NULL, NULL, 2, 2, 'cloud:share:cancel', 1, 1, NOW(3), NOW(3));

-- ── 4. 菜单-接口绑定(分享按钮绑 GET/POST;取消分享按钮绑 DELETE) ──
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`)
SELECT t.menu_id, t.api_id FROM (
  SELECT 2351 AS menu_id, 854 AS api_id
  UNION ALL SELECT 2351, 855
  UNION ALL SELECT 2352, 856
) t
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_menu_api` m WHERE m.sys_menu_id = t.menu_id AND m.sys_api_id = t.api_id
);

-- ── 5. 超管角色(role 1)绑定菜单(绑定后 service 自动重建 Casbin 策略) ──
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT t.role_id, t.menu_id FROM (
  SELECT 1 AS role_id, 2351 AS menu_id
  UNION ALL SELECT 1, 2352
) t
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_role_menu` r WHERE r.sys_role_id = t.role_id AND r.sys_menu_id = t.menu_id
);
