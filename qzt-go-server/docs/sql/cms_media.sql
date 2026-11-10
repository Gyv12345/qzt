-- ============================================================
-- cms_media.sql — P22 CMS 媒体库（开源 CMS 对标 C4）
-- 用途：admin 媒体库页(浏览/检索/复制直链/删除公共桶对象)。
--       上传不新增端点——复用 /api/upload 与 /api/upload/sts(登录即可用)。
-- ID 区间：sys_api 794~795、sys_menu 2298(页面)/2299(删除按钮)（当前最大 2297）。
-- 幂等：固定 ID 先 DELETE 再 INSERT。
-- 执行方式：DBX MCP（database=qztgo）或手动 mysql；casbin 随重启重建生效。
-- ============================================================

-- 1. sys_api
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2298 AND 2299;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2298 AND 2299;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2298 AND 2299;
DELETE FROM `sys_api` WHERE `id` BETWEEN 794 AND 795;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (794, '/cms/media', 'GET', '官网内容', '媒体库列表', NOW(3), NOW(3)),
  (795, '/cms/media/delete', 'POST', '官网内容', '删除媒体对象', NOW(3), NOW(3));

-- 2. sys_menu 2298 媒体库页面（挂官网内容 111 下）+ 2299 删除按钮
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2298, 111, '媒体库', '/cms/media', 'cms/media/index', 'PictureOutlined', 4, 1, 'cms:media:list', 1, 1, NOW(3), NOW(3)),
  (2299, 2298, '删除媒体', '', '', '', 1, 2, 'cms:media:delete', 1, 1, NOW(3), NOW(3));

-- 3. sys_menu_api 关联
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2298, 794),
  (2299, 795);

-- 4. 授权给超级管理员
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m ON m.id BETWEEN 2298 AND 2299
WHERE r.code = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );
