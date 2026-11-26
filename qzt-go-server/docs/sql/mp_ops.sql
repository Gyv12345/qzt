-- ======================================================================
-- mp_ops.sql — 公众号运营中心（多号管理 + 菜单编辑 + AI 文章创作推草稿）
--
-- 用途:
--   1. 建表(IF NOT EXISTS 幂等): mp_account(公众号账号) / mp_article(文章)
--   2. sys_api 900-913(14 条: 账号 CRUD 900-903 + 文章 CRUD/AI 生成/推草稿 904-910 + 菜单读写删 911-913)
--      sys_menu 2390-2403(14 条: 顶级目录 2390 + 文章创作页/按钮 2391-2396
--      + 菜单设置页/按钮 2397-2399 + 账号管理页/按钮 2400-2403)
--      + sys_menu_api 绑定 + sys_role_menu 仅授 super_admin(role 1)
--   3. sys_config 预置 mp.article_prompt(公众号写稿提示词, 空=用后端内置提示词)
--
-- ID 分配(2026-11-20 DBX 复核: sys_api MAX=899, sys_menu MAX=2389):
--   sys_api 900-913 | sys_menu 2390-2403
-- 执行方式: DBX MCP「我的阿里云数据库」database=qztgo 逐段执行(幂等);
--   插库后 systemctl restart qzt-server 刷新 Casbin。
-- 基线同步说明: 后续维护 docs/sql/qztgo.sql 基线时, 需把本文件的建表与
--   sys_api/sys_menu/sys_menu_api/sys_role_menu/sys_config 各段并入基线(同 mall-marketing.sql 流程, 见文件末注释)。
-- ======================================================================

-- ============================================================
-- 1. 建表 —— mp_account / mp_article(IF NOT EXISTS 幂等)
-- ============================================================
CREATE TABLE IF NOT EXISTS `mp_account` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '账号名(如 行简订阅号)',
  `account_type` varchar(10) NOT NULL DEFAULT 'sub' COMMENT '类型:sub=订阅号,srv=服务号',
  `app_id` varchar(64) NOT NULL DEFAULT '' COMMENT 'AppID',
  `app_secret` text NOT NULL COMMENT 'AppSecret(明文落库,接口层脱敏)',
  `extra` text NULL COMMENT '扩展配置JSON(预留:thumb_media_id 等)',
  `enabled` int NOT NULL DEFAULT '1' COMMENT '是否启用:1启用 0停用',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mp_account_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公众号账号(mp 运营中心)';

CREATE TABLE IF NOT EXISTS `mp_article` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint unsigned NOT NULL COMMENT '所属公众号账号',
  `title` varchar(192) NOT NULL DEFAULT '' COMMENT '文章标题(微信限 64 字)',
  `digest` varchar(255) NOT NULL DEFAULT '' COMMENT '摘要(微信 120 字节,超长推送时截断)',
  `author` varchar(64) NOT NULL DEFAULT '行简' COMMENT '作者',
  `cover_url` varchar(500) NOT NULL DEFAULT '' COMMENT '封面图 URL(空=推送时自动取正文首图)',
  `theme` varchar(255) NOT NULL DEFAULT '' COMMENT 'AI 生成:主题',
  `points` text NULL COMMENT 'AI 生成:要点(换行分隔)',
  `content_md` longtext NULL COMMENT '正文 Markdown',
  `status` varchar(16) NOT NULL DEFAULT 'draft' COMMENT 'draft=草稿,pushed=已推草稿箱,failed=推送失败',
  `wx_media_id` varchar(128) NOT NULL DEFAULT '' COMMENT '微信草稿 media_id',
  `error_msg` varchar(500) NOT NULL DEFAULT '' COMMENT '最近一次推送错误',
  `pushed_at` datetime(3) DEFAULT NULL COMMENT '最近推送成功时间',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mp_article_account_status` (`account_id`,`status`),
  KEY `idx_mp_article_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公众号文章(mp 运营中心)';

-- ============================================================
-- 2. sys_api —— 900-913(账号 CRUD + 文章 CRUD/AI 生成/推草稿 + 菜单读写删)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_api_id` BETWEEN 900 AND 913;
DELETE FROM `sys_api` WHERE `id` BETWEEN 900 AND 913;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (900, '/mp/accounts',               'GET',    '公众号运营-账号', '账号列表(secret 脱敏)', NOW(3), NOW(3)),
  (901, '/mp/accounts',               'POST',   '公众号运营-账号', '新建账号', NOW(3), NOW(3)),
  (902, '/mp/accounts/:id',           'PUT',    '公众号运营-账号', '更新账号', NOW(3), NOW(3)),
  (903, '/mp/accounts/:id',           'DELETE', '公众号运营-账号', '删除账号', NOW(3), NOW(3)),
  (904, '/mp/articles',               'GET',    '公众号运营-文章', '文章分页列表', NOW(3), NOW(3)),
  (905, '/mp/articles',               'POST',   '公众号运营-文章', '新建文章草稿', NOW(3), NOW(3)),
  (906, '/mp/articles/:id',           'GET',    '公众号运营-文章', '文章详情', NOW(3), NOW(3)),
  (907, '/mp/articles/:id',           'PUT',    '公众号运营-文章', '更新文章', NOW(3), NOW(3)),
  (908, '/mp/articles/:id',           'DELETE', '公众号运营-文章', '删除文章', NOW(3), NOW(3)),
  (909, '/mp/articles/:id/generate',  'POST',   '公众号运营-文章', 'AI 生成/重写文章', NOW(3), NOW(3)),
  (910, '/mp/articles/:id/push-draft','POST',   '公众号运营-文章', '推送微信草稿箱', NOW(3), NOW(3)),
  (911, '/mp/accounts/:id/menu',      'GET',    '公众号运营-菜单', '拉取当前菜单', NOW(3), NOW(3)),
  (912, '/mp/accounts/:id/menu',      'PUT',    '公众号运营-菜单', '保存并发布菜单', NOW(3), NOW(3)),
  (913, '/mp/accounts/:id/menu',      'DELETE', '公众号运营-菜单', '删除菜单', NOW(3), NOW(3));

-- ============================================================
-- 3. sys_menu —— 2390 顶级目录 + 文章创作页/按钮 + 菜单设置页/按钮 + 账号管理页/按钮
--    component 与 admin 前端 src/pages 路径对应:
--    mp/article/index → src/pages/mp/article/index.tsx
--    mp/menu/index    → src/pages/mp/menu/index.tsx
--    mp/account/index → src/pages/mp/account/index.tsx
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2390 AND 2403;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2390 AND 2403;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2390 AND 2403;

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2390, 0,    '公众号运营', '',            '',                 'MessageOutlined', 55, 0, '',                    1, 1, NOW(3), NOW(3)),
  (2391, 2390, '文章创作',   '/mp/article', 'mp/article/index', '',                10, 1, '',                    1, 1, NOW(3), NOW(3)),
  (2392, 2391, '新增文章',   NULL, NULL, NULL, 1, 2, 'mp:article:add',      1, 1, NOW(3), NOW(3)),
  (2393, 2391, '编辑文章',   NULL, NULL, NULL, 2, 2, 'mp:article:edit',     1, 1, NOW(3), NOW(3)),
  (2394, 2391, '删除文章',   NULL, NULL, NULL, 3, 2, 'mp:article:delete',   1, 1, NOW(3), NOW(3)),
  (2395, 2391, 'AI 生成',    NULL, NULL, NULL, 4, 2, 'mp:article:generate', 1, 1, NOW(3), NOW(3)),
  (2396, 2391, '推送草稿',   NULL, NULL, NULL, 5, 2, 'mp:article:push',     1, 1, NOW(3), NOW(3)),
  (2397, 2390, '菜单设置',   '/mp/menu',    'mp/menu/index',    '',                20, 1, '',                    1, 1, NOW(3), NOW(3)),
  (2398, 2397, '保存菜单',   NULL, NULL, NULL, 1, 2, 'mp:menu:edit',        1, 1, NOW(3), NOW(3)),
  (2399, 2397, '删除菜单',   NULL, NULL, NULL, 2, 2, 'mp:menu:delete',      1, 1, NOW(3), NOW(3)),
  (2400, 2390, '账号管理',   '/mp/account', 'mp/account/index', '',                30, 1, '',                    1, 1, NOW(3), NOW(3)),
  (2401, 2400, '新增账号',   NULL, NULL, NULL, 1, 2, 'mp:account:add',      1, 1, NOW(3), NOW(3)),
  (2402, 2400, '更新账号',   NULL, NULL, NULL, 2, 2, 'mp:account:edit',     1, 1, NOW(3), NOW(3)),
  (2403, 2400, '删除账号',   NULL, NULL, NULL, 3, 2, 'mp:account:delete',   1, 1, NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu_api —— 页面/按钮 ↔ API 关联
--    2391 文章创作页(list GET);2392/2393/2394/2395/2396 → 新建/更新/删除/AI 生成/推草稿;
--    2397 菜单设置页(menu GET);2398/2399 → 保存并发布/删除;
--    2400 账号管理页(list GET);2401/2402/2403 → 新建/更新/删除账号。
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2390 AND 2403;

INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2391, 904),
  (2392, 905),
  (2393, 907),
  (2394, 908),
  (2395, 909),
  (2396, 910),
  (2397, 911),
  (2398, 912),
  (2399, 913),
  (2400, 900),
  (2401, 901),
  (2402, 902),
  (2403, 903);

-- ============================================================
-- 5. sys_role_menu —— 仅授 super_admin(role 1)
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM `sys_role` r
JOIN `sys_menu` m ON m.id BETWEEN 2390 AND 2403
WHERE r.id = 1
ON DUPLICATE KEY UPDATE `sys_role_id` = VALUES(`sys_role_id`);

-- ============================================================
-- 6. sys_config —— 预置 mp.article_prompt(空=用后端内置提示词)
-- ============================================================
DELETE FROM `sys_config` WHERE `key` = 'mp.article_prompt';

INSERT INTO `sys_config` (`key`, `name`, `value`, `remark`, `deleted_at`) VALUES
  ('mp.article_prompt', '公众号写稿提示词', '', '空=用后端内置提示词;定制文风在此覆盖,POST /system/configs/refresh 生效', NULL);

-- ============================================================
-- 7. 结尾验证(逐条执行核对)
-- ============================================================
-- mp_account / mp_article 为 0 行种子(纯结构建表, IF NOT EXISTS 幂等), 无行数可验。
-- SELECT COUNT(*) FROM sys_api WHERE id BETWEEN 900 AND 913;               -- 期望 14
-- SELECT COUNT(*) FROM sys_menu WHERE id BETWEEN 2390 AND 2403;            -- 期望 14
-- SELECT COUNT(*) FROM sys_menu_api WHERE sys_menu_id BETWEEN 2390 AND 2403;  -- 期望 13
-- SELECT sys_role_id, COUNT(*) FROM sys_role_menu
--   WHERE sys_menu_id BETWEEN 2390 AND 2403 GROUP BY sys_role_id;          -- 期望 role 1 共 14

-- ============================================================
-- 8. 基线 qztgo.sql 同步说明(仅注释,不产生数据)
--    后续维护 docs/sql/qztgo.sql 基线时需手工同步:
--    ① mp_account / mp_article 建表语句;
--    ② sys_api 900-913 / sys_menu 2390-2403 / sys_menu_api / sys_role_menu
--       对应段并入基线;
--    ③ sys_config 的 mp.article_prompt 行并入基线;
--    ④ 不加演示数据(mp_account/mp_article 均为空表,无种子行)。
-- ============================================================
