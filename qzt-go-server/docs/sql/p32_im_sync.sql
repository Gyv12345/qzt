-- ======================================================================
-- p32_im_sync.sql — P32 钉钉/飞书集成:通讯录同步 + 扫码登录 + 通知通道路由
--
-- 用途:
--   1. sys_user / hrm_department 加外部绑定列(external_id/id_source;sys_user 另加 remark)
--   2. sys_api 881-884(通讯录同步手动触发 + 状态查询,4 条)
--   3. sys_menu 2367/2368 按钮「钉钉同步」「飞书同步」挂「第三方应用」页(menu id=204)
--   4. sys_config notify.external_channel(外部 IM 工作通知路由,默认 wecom)
--   5. sys_job 30/31(contact.sync.dingtalk 每日 02:00 / contact.sync.feishu 每日 02:30)
--
-- 同步/登录的配置存储(管理员后台「第三方应用」页录入,禁止种子写真实凭据):
--   sys_oauth_config provider='dingtalk':app_id=AppKey, app_secret=AppSecret,
--     extra={"agent_id":"..."}(兼容直接填 agent_id 列),redirect_uri=任意前端页地址
--     (后端从中取 origin 拼回调:origin + /prod-api/enterprise/oauth/dingtalk/callback,
--     该地址需同步登记到钉钉开放平台应用的重定向域名)。
--   sys_oauth_config provider='feishu':app_id=AppID, app_secret=AppSecret,
--     redirect_uri 同上(origin 拼出 /prod-api/enterprise/oauth/feishu/callback,
--     需登记到飞书开放平台重定向 URL)。
--   读写端点复用既有 /system/oauth-configs CRUD(GET 脱敏/PUT 保存,frozen 组,
--   provider 白名单已含 dingtalk/feishu),无需本脚本注册。
--
-- 扫码登录端点(公开,login-only,不进 RBAC,照企微口径不登记 sys_api):
--   GET /enterprise/oauth/dingtalk/qr|callback
--   GET /enterprise/oauth/feishu/qr|callback
--
-- ID 分配(2026-11-14 DBX 复核:sys_api MAX=880,sys_menu MAX=2366,sys_job MAX=29):
--   sys_api  881-884(4 条)
--   sys_menu 2367/2368(按钮,挂 204)
--   sys_job  30/31(若届时被其他任务占用,请顺延调整 DELETE/INSERT 里的固定 id)
--   sys_config 按 key 幂等守卫(不占固定 id)
--
-- 执行方式:
--   ALTER 为普通语句逐条(已存在同名列时报 Duplicate column,属正常,跳过该条即可);
--   其余 INSERT 幂等(固定 ID DELETE+INSERT / NOT EXISTS 守卫)。
--   通过 DBX MCP(逐条执行)或手动 mysql 连 qztgo 库执行。
-- casbin 策略插库后运行期不生效,须重启 qzt-server。
-- 外键依赖顺序:先 sys_menu_api / sys_role_menu,再 sys_menu / sys_api。
-- ======================================================================

-- ============================================================
-- 1. ALTER —— 外部绑定列(普通语句逐条;已存在则跳过该条)
-- ============================================================
ALTER TABLE `sys_user` ADD COLUMN `external_id` varchar(64) DEFAULT '' COMMENT '外部平台用户ID(钉钉userid/飞书open_id)';
ALTER TABLE `sys_user` ADD COLUMN `id_source` varchar(20) DEFAULT '' COMMENT '来源(local/wecom/dingtalk/feishu)';
ALTER TABLE `sys_user` ADD COLUMN `remark` varchar(255) DEFAULT '' COMMENT '备注(通讯录同步自动创建时标来源)';
ALTER TABLE `sys_user` ADD INDEX `idx_sys_user_id_source` (`id_source`);
ALTER TABLE `sys_user` ADD INDEX `idx_sys_user_external_id` (`external_id`);

ALTER TABLE `hrm_department` ADD COLUMN `external_id` varchar(64) DEFAULT '' COMMENT '外部平台部门ID';
ALTER TABLE `hrm_department` ADD COLUMN `id_source` varchar(20) DEFAULT '' COMMENT '来源(local/wecom/dingtalk/feishu)';
ALTER TABLE `hrm_department` ADD INDEX `idx_hrm_department_id_source` (`id_source`);
ALTER TABLE `hrm_department` ADD INDEX `idx_hrm_department_external_id` (`external_id`);

-- ============================================================
-- 2. sys_api —— 4 条接口(881-884)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_api_id` BETWEEN 881 AND 884;
DELETE FROM `sys_api` WHERE `id` BETWEEN 881 AND 884;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (881, '/enterprise/contact-sync/dingtalk',         'POST', '通讯录同步', '手动触发钉钉通讯录同步(全量对账:部门树+用户 upsert,消失置停用)', NOW(3), NOW(3)),
  (882, '/enterprise/contact-sync/feishu',           'POST', '通讯录同步', '手动触发飞书通讯录同步(全量对账:部门树+用户 upsert,消失置停用)', NOW(3), NOW(3)),
  (883, '/enterprise/contact-sync/dingtalk/status',  'GET',  '通讯录同步', '钉钉通讯录最近一次同步状态(统计摘要)', NOW(3), NOW(3)),
  (884, '/enterprise/contact-sync/feishu/status',    'GET',  '通讯录同步', '飞书通讯录最近一次同步状态(统计摘要)', NOW(3), NOW(3));

-- ============================================================
-- 3. sys_menu —— 按钮(2367 钉钉同步 / 2368 飞书同步,挂 204 第三方应用)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2367 AND 2368;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2367 AND 2368;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2367 AND 2368;

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2367, 204, '钉钉同步', NULL, NULL, NULL, 5, 2, 'enterprise:contact-sync:dingtalk', 1, 1, NOW(3), NOW(3)),
  (2368, 204, '飞书同步', NULL, NULL, NULL, 6, 2, 'enterprise:contact-sync:feishu',  1, 1, NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu_api —— 按钮↔API 关联(触发+状态同卡)
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2367, 881),  -- 钉钉同步 → POST /enterprise/contact-sync/dingtalk
  (2367, 883),  -- 钉钉同步 → GET  /enterprise/contact-sync/dingtalk/status
  (2368, 882),  -- 飞书同步 → POST /enterprise/contact-sync/feishu
  (2368, 884);  -- 飞书同步 → GET  /enterprise/contact-sync/feishu/status

-- ============================================================
-- 5. sys_role_menu —— 超管(role id=1)UI 可见新按钮
--    不授 demo 演示角色(14),防演示访客消耗钉钉/飞书 API 配额。
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id IN (2367, 2368)
WHERE r.id = 1
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- ============================================================
-- 6. sys_config —— 外部 IM 通知通道路由(按 key 幂等守卫)
-- ============================================================
INSERT INTO `sys_config`
  (`group`, `key`, `name`, `value`, `type`, `options`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'notify', 'notify.external_channel', '外部通知渠道', 'wecom', 'select',
       '["wecom","dingtalk","feishu","none"]', 0, 1, 1, 1,
       '外部 IM 工作通知路由:接收人按 sys_user 外部绑定 id 推送,未绑定的仅收站内信;wecom=企业微信应用消息(默认),dingtalk=钉钉工作通知,feishu=飞书消息,none=关闭外推;微信服务号模板消息为独立通道不受此开关影响;改后无需重启,下一次 Dispatch 即生效'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'notify.external_channel' AND `deleted_at` IS NULL);

UPDATE `sys_config`
SET `name` = '外部通知渠道',
    `options` = '["wecom","dingtalk","feishu","none"]',
    `remark` = '外部 IM 工作通知路由:接收人按 sys_user 外部绑定 id 推送,未绑定的仅收站内信;wecom=企业微信应用消息(默认),dingtalk=钉钉工作通知,feishu=飞书消息,none=关闭外推;微信服务号模板消息为独立通道不受此开关影响;改后无需重启,下一次 Dispatch 即生效',
    `updated_at` = NOW(3)
WHERE `key` = 'notify.external_channel' AND `deleted_at` IS NULL;

-- ============================================================
-- 7. sys_job —— 30/31(每日 02:00 钉钉 / 02:30 飞书,6 段式 cron)
--    DELETE 带 bean_class 守卫:固定 id 被其他任务占用时不误删。
-- ============================================================
DELETE FROM `sys_job` WHERE `id` IN (30, 31)
  AND `bean_class` IN ('contact.sync.dingtalk', 'contact.sync.feishu');

INSERT INTO `sys_job` (`id`, `job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`, `created_at`, `updated_at`) VALUES
  (30, '钉钉通讯录同步', 'enterprise', '0 0 2 * * *', 'contact.sync.dingtalk', 1, '每日 02:00 拉取钉钉部门树+用户,幂等对账到 hrm_department/sys_user(消失置停用;需在「第三方应用」启用钉钉)', NOW(3), NOW(3)),
  (31, '飞书通讯录同步', 'enterprise', '0 30 2 * * *', 'contact.sync.feishu', 1, '每日 02:30 拉取飞书部门树+用户,幂等对账到 hrm_department/sys_user(消失置停用;需在「第三方应用」启用飞书)', NOW(3), NOW(3));

-- ============================================================
-- 验证(执行后自查)
-- ============================================================
-- SELECT COUNT(*) FROM sys_api      WHERE id BETWEEN 881 AND 884;                 -- 4
-- SELECT COUNT(*) FROM sys_menu     WHERE id BETWEEN 2367 AND 2368;               -- 2
-- SELECT COUNT(*) FROM sys_menu_api WHERE sys_menu_id IN (2367,2368);             -- 4
-- SELECT COUNT(*) FROM sys_role_menu WHERE sys_menu_id IN (2367,2368) AND sys_role_id = 1;  -- 2
-- SELECT `key`, `value` FROM sys_config WHERE `key` = 'notify.external_channel';  -- 1 行 wecom
-- SELECT id, job_name, bean_class, cron_expression FROM sys_job WHERE id IN (30,31);  -- 2 行
-- SHOW COLUMNS FROM sys_user LIKE '%external%'; SHOW COLUMNS FROM sys_user WHERE Field='id_source';
-- SHOW COLUMNS FROM hrm_department WHERE Field IN ('external_id','id_source');
