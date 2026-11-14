-- storage_v2.sql
-- 用途：文件存储可配置化 v2 —— 重建 sys_storage_config 表（驱动可配置：local / oss / s3 兼容），
--       并注册系统管理「文件存储」页面的菜单与 API 权限种子。
--       存储配置从 config.{env}.yaml（yaml-only）迁移到 DB：单条 is_active=1 的配置生效，
--       后台切换即时热生效（app.ReloadStorage），yaml storage 节仅作为首次启动播种来源与 local 兜底。
-- 旧表说明：sys_storage_config 旧表为遗留表（2026-08 后台测试遗留 1 行，代码无消费方），
--       已于 2026-11 存储配置化改造时 DROP 重造（v2 增加 name/is_active/双桶与 S3 兼容字段）。
-- ID 区间：
--       sys_api  859-865（7 条：列表/新建/更新/删除/启用/测试连接/文件列表）
--       sys_menu 2353（页面菜单「文件存储」，挂 876 系统配置下，sort=4）
--                2354 保存配置 / 2355 删除配置 / 2356 启用配置 / 2357 测试连接（按钮）
--       本文件不写任何含密钥的存储配置种子行（密钥由启动时从 yaml 播种或后台录入）。
-- 执行方式：通过 DBX MCP 或手动 mysql 连 qztgo 库执行（幂等：先 DELETE 固定 ID 区间再 INSERT）。
-- 外键依赖顺序：先 sys_menu_api / sys_role_menu，再 sys_menu / sys_api。

-- ============================================================
-- 1. sys_storage_config v2 —— DROP 旧遗留表 + CREATE v2
-- ============================================================
DROP TABLE IF EXISTS `sys_storage_config`;

CREATE TABLE `sys_storage_config` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '自定义名称',
  `driver` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local' COMMENT '存储驱动(local/oss/s3)',
  `is_active` tinyint NOT NULL DEFAULT '0' COMMENT '是否当前生效(全表仅一条为1)',
  `max_upload_mb` bigint NOT NULL DEFAULT '50' COMMENT '单文件上传大小上限(MB)',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '备注',
  -- local 驱动
  `local_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '本地公共存储根目录(driver=local)',
  `private_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '本地私有存储根目录(driver=local)',
  `resource_domain` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '公共资源访问域名(driver=local 拼 URL)',
  `download_prefix` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '私有文件代理下载URL前缀(driver=local)',
  -- oss 驱动(阿里云原生,双桶共用 AK/SK)
  `oss_endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'OSS Endpoint',
  `oss_access_key_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'OSS AccessKeyID',
  `oss_access_key_secret` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'OSS AccessKeySecret(列表脱敏只回尾4位)',
  `oss_bucket_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'OSS 公共桶名称',
  `oss_custom_domain` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'OSS 公共桶自定义域名/CDN',
  `oss_private_bucket_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'OSS 私有桶名称(留空禁用私有附件)',
  `oss_private_custom_domain` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'OSS 私有桶自定义域名(一般留空)',
  -- s3 兼容驱动(七牛/MinIO/RustFS/COS/OSS-S3端点等,双桶)
  `s3_endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'S3 兼容 Endpoint',
  `s3_region` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'S3 Region(部分厂商可空)',
  `s3_bucket_public` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'S3 公共桶名称',
  `s3_domain_public` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'S3 公共桶访问域名/CDN(拼URL,空则 endpoint/bucket)',
  `s3_bucket_private` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'S3 私有桶名称(留空禁用私有附件)',
  `s3_domain_private` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'S3 私有桶自定义域名(签名URL用,一般留空)',
  `s3_access_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'S3 AccessKey',
  `s3_secret_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'S3 SecretKey(列表脱敏只回尾4位)',
  `s3_path_style` tinyint NOT NULL DEFAULT '0' COMMENT '是否 path-style 寻址(MinIO/RustFS 常为1)',
  `created_at` datetime(3) DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime(3) DEFAULT NULL COMMENT '更新时间',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_sys_storage_config_created_at` (`created_at`),
  KEY `idx_sys_storage_config_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='存储配置(local/oss/s3,单条生效可热切换)';

-- ============================================================
-- 2. sys_api —— 文件存储配置接口(859-865)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2353 AND 2357;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2353 AND 2357;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2353 AND 2357;
DELETE FROM `sys_api` WHERE `id` BETWEEN 859 AND 865;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (859, '/system/storage/configs',            'GET',    '文件存储', '存储配置列表',   NOW(3), NOW(3)),
  (860, '/system/storage/configs',            'POST',   '文件存储', '新建存储配置',   NOW(3), NOW(3)),
  (861, '/system/storage/configs/:id',        'PUT',    '文件存储', '更新存储配置',   NOW(3), NOW(3)),
  (862, '/system/storage/configs/:id',        'DELETE', '文件存储', '删除存储配置',   NOW(3), NOW(3)),
  (863, '/system/storage/configs/:id/activate', 'POST', '文件存储', '启用存储配置(热切换)', NOW(3), NOW(3)),
  (864, '/system/storage/configs/:id/test',   'POST',   '文件存储', '测试存储配置连接', NOW(3), NOW(3)),
  (865, '/system/storage/files',              'GET',    '文件存储', '存储文件列表(全量)', NOW(3), NOW(3));

-- ============================================================
-- 3. sys_menu —— 「文件存储」页面菜单(2353, 挂 876 系统配置, sort=4) + 按钮(2354-2357)
-- ============================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2353, 876, '文件存储', '/system/storage', 'system/storage/index', 'FolderOpenOutlined', 4, 1, 'system:storage:list', 1, 1, NOW(3), NOW(3)),
  (2354, 2353, '保存配置', NULL, NULL, NULL, 1, 2, 'system:storage:save',     1, 1, NOW(3), NOW(3)),
  (2355, 2353, '删除配置', NULL, NULL, NULL, 2, 2, 'system:storage:delete',   1, 1, NOW(3), NOW(3)),
  (2356, 2353, '启用配置', NULL, NULL, NULL, 3, 2, 'system:storage:activate', 1, 1, NOW(3), NOW(3)),
  (2357, 2353, '测试连接', NULL, NULL, NULL, 4, 2, 'system:storage:test',     1, 1, NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu_api —— 菜单(含按钮)与 API 关联(全绑)
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2353, 859),  -- 列表页 → GET /system/storage/configs
  (2353, 865),  -- 列表页文件Tab → GET /system/storage/files
  (2354, 860),  -- 保存(新建) → POST /system/storage/configs
  (2354, 861),  -- 保存(更新) → PUT /system/storage/configs/:id
  (2355, 862),  -- 删除 → DELETE /system/storage/configs/:id
  (2356, 863),  -- 启用 → POST /system/storage/configs/:id/activate
  (2357, 864);  -- 测试连接 → POST /system/storage/configs/:id/test

-- ============================================================
-- 5. sys_role_menu —— 授超管(role id=1)菜单链 876 → 2353(含按钮)
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id IN (876, 2353, 2354, 2355, 2356, 2357)
WHERE r.id = 1
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- 验证：菜单/API 各 5/7 条，role_menu 6 条
-- SELECT COUNT(*) FROM sys_menu WHERE id BETWEEN 2353 AND 2357;
-- SELECT COUNT(*) FROM sys_api WHERE id BETWEEN 859 AND 865;
-- SELECT COUNT(*) FROM sys_role_menu WHERE sys_menu_id IN (876,2353,2354,2355,2356,2357) AND sys_role_id = 1;
