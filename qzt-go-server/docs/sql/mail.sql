-- ============================================================
-- mail.sql — 邮件(外发)模块种子(sys_config + 菜单 + API)
-- ------------------------------------------------------------
-- 作用: 1. 写入 SMTP 连接配置(sys_config group=mail)
--       2. 写入菜单(sys_menu): 邮件配置页
--       3. 写入 API(sys_api): 发送邮件 / 测试连接
-- 遵循工作区 AGENTS.md「种子数据与建表」约定:种子一律走 SQL。
-- 本模块不发信日志,故不建业务表(发信即走)。
-- 幂等: sys_config 按 key 不存在才插入; sys_api/sys_menu 固定区间先 DELETE 再 INSERT。
-- 执行方式(用户手动):
--   mysql -h <host> - <database> < docs/sql/mail.sql
-- ID 分配(执行前: max(api)=433, max(menu)=943):
--   sys_api  : 440~441 (邮件模块接口)
--   sys_menu : 950~952 (邮件配置菜单 + 保存按钮 + 发信按钮)
-- ============================================================

-- ── 1. SMTP 全局配置(sys_config group=mail) ──
-- 幂等: 按 key 不存在才插入;敏感字段 is_public=0(不对外暴露)
INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'mail', 'mail.enabled', '邮件功能开关', 'false', 'boolean', 0, 1, 1, 1, '是否启用邮件外发功能'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'mail.enabled');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'mail', 'mail.host', 'SMTP 服务器', '', 'string', 0, 1, 1, 2, '如 smtp.exmail.qq.com / smtp.163.com'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'mail.host');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'mail', 'mail.port', 'SMTP 端口', '465', 'int', 0, 1, 1, 3, 'SSL 默认 465;STARTTLS 用 587'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'mail.port');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'mail', 'mail.username', '发信账号', '', 'string', 0, 1, 1, 4, 'SMTP 登录用户名(通常即发件邮箱)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'mail.username');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'mail', 'mail.password', 'SMTP 授权码/密码', '', 'string', 0, 1, 1, 5, '邮箱服务商生成的授权码或登录密码'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'mail.password');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'mail', 'mail.from', '发件人地址', '', 'string', 0, 1, 1, 6, '发件人邮箱(留空则用发信账号)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'mail.from');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'mail', 'mail.from_name', '发件人名称', 'qzt 系统', 'string', 0, 1, 1, 7, '收件人看到的发件人显示名'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'mail.from_name');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'mail', 'mail.encryption', '加密方式', 'ssl', 'select', 0, 1, 1, 8, 'ssl(隐式SSL,默认)/tls(STARTTLS)/none(明文)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'mail.encryption');

-- ── 2. sys_api 种子(固定 ID 440-441,幂等:先 DELETE 再 INSERT) ──
DELETE FROM `sys_menu_api` WHERE `sys_api_id` BETWEEN 440 AND 441;
DELETE FROM `sys_api` WHERE `id` BETWEEN 440 AND 441;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
(440, '/mail/send', 'POST', '邮件', '发送邮件',     NOW(3), NOW(3)),
(441, '/mail/test', 'POST', '邮件', '测试SMTP连接', NOW(3), NOW(3));

-- ── 3. sys_menu 种子(固定 ID 950-952,幂等:先 DELETE 再 INSERT) ──
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 950 AND 952;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 950 AND 952;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 950 AND 952;

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `type`, `permission`, `sort`, `visible`, `status`, `created_at`, `updated_at`) VALUES
-- 950 邮件配置页(挂在「系统管理」id=1 下)
(950, 1,   '邮件配置', '/system/mail-config', 'system/mail-config/index', 'MailOutlined', 1, 'system:config:list', 11, 1, 1, NOW(3), NOW(3)),
-- 951 保存配置按钮(复用通用 system:config:edit 权限)
(951, 950, '保存配置', '', NULL, NULL, 2, 'system:config:edit', 1, 1, 1, NOW(3), NOW(3)),
-- 952 发邮件按钮(各业务详情页的发信入口权限)
(952, 950, '发送邮件', '', NULL, NULL, 2, 'mail:send', 2, 1, 1, NOW(3), NOW(3));

-- ── 4. 菜单-API 关联(sys_menu_api) ──
-- 发邮件按钮 → POST /mail/send; 测试连接 → POST /mail/test
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
(950, 441), -- 邮件配置页 → 测试连接(配置页用)
(952, 440); -- 发送邮件按钮 → 发信

-- ── 5. 给超管角色(super_admin)授权新菜单(幂等) ──
-- super_admin 通过 Casbin 策略短路自动放行所有接口,但菜单可见性仍需 sys_role_menu 关联。
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM `sys_role` r JOIN `sys_menu` m ON m.id BETWEEN 950 AND 952
WHERE r.code = 'super_admin'
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id);

-- ── 完成 ──
SELECT 'mail.sql 执行完成: 8 条 SMTP 配置 + 邮件配置菜单/API 已写入' AS result;
