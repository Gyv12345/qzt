-- demo_mode.sql 公开演示模式开关(sys_config demo.mode)。
-- 用途:生产 admin 以简单密码公开试用时的后端护栏总开关。
--   value='1' 演示模式开启(护栏生效);'0'/缺失 = 关闭(全部放行,行为与改造前一致)。
--   读写链路见 internal/pkg/demoguard/demoguard.go(setting.Get 缓存口径)。
-- 开启方式:执行本文件后,把 value 手动改为 '1',再调 POST /system/configs/refresh
--   (或 admin 系统配置页「刷新缓存」)同步 Redis;该 refresh 接口未被演示护栏冻结。
-- 关闭方式:UPDATE value='0' 后同样刷新缓存即可(演示模式下配置写接口被冻结,
--   不能走后台改回,务必走 SQL + refresh)。
-- ID 区间:sys_config 自定义 key(idx_sys_config_key 唯一),按 key 幂等守卫,不占固定 id。
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,或手动 mysql。可重复执行。

INSERT INTO `sys_config`
  (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'system', 'demo.mode', '公开演示模式', '0', 'bool', 0, 1, 1, 0,
       '开启后进入公开演示护栏:禁用系统重置、冻结系统管理写接口与 API Key 管理、外部推送通道(企微/服务号)降级为仅站内信、超管告警按 IP 去重、登录锁定放宽为账号+IP 20 次'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'demo.mode');

-- 开启演示模式(确认要公开后再执行):
-- UPDATE `sys_config` SET `value` = '1' WHERE `key` = 'demo.mode';
