-- wechat_mp.sql 微信服务号接入(通知推送 + 微信内免登录)
-- 用途:
--   1. sys_user 增加 wechat_openid 列(用户绑定服务号后的 openid)
--   2. sys_oauth_config 预置 provider=wechat_mp 的配置行(默认禁用,管理员在
--      「系统管理-第三方登录」页填写 AppID/AppSecret/回调地址后启用;
--      Extra JSON 填 {"template_id":"xxx"} 开通模板消息通知)
-- 执行方式: DBX MCP 或手动 mysql(单条执行)
-- 依赖: 无

ALTER TABLE `sys_user`
  ADD COLUMN `wechat_openid` VARCHAR(64) NULL COMMENT '微信服务号openid' AFTER `wecom_user_id`,
  ADD INDEX `idx_sys_user_wechat_openid` (`wechat_openid`);

-- 预置服务号配置行(禁用态;provider 唯一索引,重复执行会冲突,先 DELETE 再 INSERT)
DELETE FROM `sys_oauth_config` WHERE `provider` = 'wechat_mp';
INSERT INTO `sys_oauth_config` (`provider`, `name`, `enabled`, `app_id`, `app_secret`, `redirect_uri`, `extra`, `sort`, `remark`, `created_at`, `updated_at`)
VALUES ('wechat_mp', '微信服务号(通知+免登录)', 0, '', '', 'https://m.devlovecode.com/auth/wechat/callback', '{}', 20, '已认证服务号:网页授权免登录+模板消息通知;Extra 填 {"template_id":"模板ID"}', NOW(3), NOW(3));
