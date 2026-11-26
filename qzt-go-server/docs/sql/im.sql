-- =====================================================================
-- im.sql
-- 用途:即时通讯(IM)模块 —— 三张业务表(会话/会话成员/消息)
--      + 菜单(顶级叶菜单「即时通讯」) + 角色授权。
--      IM 全部接口走 JWT-only 层级(同 OA 站内信),无 sys_api / casbin 行。
-- 幂等:CREATE TABLE IF NOT EXISTS;菜单先 DELETE(子表在前)再 INSERT,
--      角色授权带 NOT EXISTS 防重,可重复执行。
-- ID 区间:
--   sys_menu 2381 (顶级叶菜单「即时通讯」;2026-11-16 DBX 复核 MAX=2380)
--   im_conversation / im_conversation_member / im_message 自增,不占固定 ID
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行。
-- 注意:本文件无 casbin_rule 插入,无需重启 qzt-server;菜单实时生效
--      (前端重新登录/刷新菜单即可)。
-- 角色集合:IM 为全员沟通能力 —— 授权给
--   1(super_admin)/3(销售)/4(销售经理)/5(销售专员)/6(售后)/7(财务)/9(销售总监)/10(人事)/14(demo)
-- 关联代码:
--   qzt-go-server internal/model/im/im.go(模型)
--   qzt-go-server internal/repository/im.go(仓储)
--   qzt-go-server internal/module/im/(router/handler/service)
-- =====================================================================

-- ======================================================================
-- 1. 建表:im_conversation + im_conversation_member + im_message
-- ======================================================================

-- 会话(单聊/群聊)
CREATE TABLE IF NOT EXISTS `im_conversation` (
  `id`              bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `type`            varchar(16)  NOT NULL COMMENT '会话类型:single/group',
  `name`            varchar(64)  DEFAULT '' COMMENT '会话名称(群名;单聊为空,前端按对端昵称展示)',
  `owner_id`        bigint unsigned NOT NULL DEFAULT 0 COMMENT '所有者用户ID(单聊=发起人,群聊=创建人)',
  `conv_key`        varchar(64)  DEFAULT NULL COMMENT '会话幂等键(single=min_max,group=NULL;唯一索引对 NULL 不去重)',
  `last_message_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '最新消息ID(列表冗余展示)',
  `last_message_at` datetime(3)  DEFAULT NULL COMMENT '最新消息时间(会话列表排序字段,无消息为NULL排最后)',
  `created_at`      datetime(3)  DEFAULT NULL,
  `updated_at`      datetime(3)  DEFAULT NULL,
  `deleted_at`      datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conv_key` (`conv_key`),
  KEY `idx_im_conversation_type` (`type`),
  KEY `idx_im_conversation_owner` (`owner_id`),
  KEY `idx_im_conversation_last_message_at` (`last_message_at`),
  KEY `idx_im_conversation_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IM 会话';

-- 会话成员(成员行退出/移除即硬删除:软删除行仍占用唯一索引,
-- 会导致同一用户被移除后无法重新加入,故本表退出走硬删)
CREATE TABLE IF NOT EXISTS `im_conversation_member` (
  `id`                   bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `conversation_id`      bigint unsigned NOT NULL COMMENT '会话ID',
  `user_id`              bigint unsigned NOT NULL COMMENT '成员用户ID(sys_user)',
  `last_read_message_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '已读游标(已读到的最大消息ID)',
  `created_at`           datetime(3)  DEFAULT NULL,
  `updated_at`           datetime(3)  DEFAULT NULL,
  `deleted_at`           datetime(3)  DEFAULT NULL COMMENT '删除时间(预留规范列;成员退出实际走硬删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conv_member` (`conversation_id`,`user_id`),
  KEY `idx_im_conversation_member_user` (`user_id`),
  KEY `idx_im_conversation_member_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IM 会话成员(退出即硬删,保证唯一索引可重进)';

-- 消息
CREATE TABLE IF NOT EXISTS `im_message` (
  `id`              bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `conversation_id` bigint unsigned NOT NULL COMMENT '会话ID',
  `sender_id`       bigint unsigned NOT NULL COMMENT '发送人用户ID(sys_user)',
  `content_type`    varchar(16) NOT NULL DEFAULT 'text' COMMENT '内容类型(v1 仅 text)',
  `content`         text COMMENT '消息内容',
  `created_at`      datetime(3)  DEFAULT NULL,
  `updated_at`      datetime(3)  DEFAULT NULL,
  `deleted_at`      datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_im_message_conv` (`conversation_id`,`id`),
  KEY `idx_im_message_sender` (`sender_id`),
  KEY `idx_im_message_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IM 消息';

-- ======================================================================
-- 2. sys_menu 2381 —— 顶级叶菜单「即时通讯」(先删子表再删主表,幂等重放)
-- ======================================================================

DELETE FROM `sys_role_menu` WHERE `sys_menu_id` = 2381;
DELETE FROM `sys_menu` WHERE `id` = 2381;

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2381, 0, '即时通讯', '/im/chat', 'im/chat/index', 'MessageOutlined', 25, 1, '', 1, 1, NOW(3), NOW(3));

-- ======================================================================
-- 3. sys_role_menu —— 菜单 2381 授权给全员角色(NOT EXISTS 防重)
-- ======================================================================

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id = 2381
WHERE r.id IN (1, 3, 4, 5, 6, 7, 9, 10, 14)
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- ======================================================================
-- 验证(执行后自查)
-- ======================================================================
-- SELECT id, name, path, component, icon, sort, type, visible, status FROM sys_menu WHERE id = 2381;  -- 1 行
-- SELECT COUNT(*) FROM sys_role_menu WHERE sys_menu_id = 2381 AND sys_role_id IN (1,3,4,5,6,7,9,10,14);  -- 9
-- SHOW TABLES LIKE 'im_%';  -- 3 张(im_conversation / im_conversation_member / im_message)
-- SHOW INDEX FROM im_conversation WHERE Key_name = 'uk_conv_key';  -- 1 行
-- SHOW INDEX FROM im_conversation_member WHERE Key_name = 'uk_conv_member';  -- 1 行
