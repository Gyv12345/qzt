-- ════════════════════════════════════════════════════════════════════════════
-- demo_reset.sql 演示数据每周重置定时任务(sys_job 种子,id=27)
--
-- 用途:公开演示模式下,每周一 03:00 将全库恢复到「干净演示基线」——处理器
--   (bean_class=demoWeeklyReset,注册于 internal/module/system/service/demo_reset.go
--   的 init(),重启服务生效)会先用 mysqldump 备份 6 张运营配置表
--   (sys_oauth_config/sys_storage_config/sys_api_key/marketing_account/
--   open_webhook/console_accounts,基线文件刻意不落其密钥数据),再经 mysql 客户端
--   整文件重放服务器上的 /opt/qzt-server/bin/demo_baseline.sql
--   (= docs/sql/qztgo.sql 的拷贝,DROP+CREATE+INSERT 全量风格),最后回填运营配置
--   并企微通知超管 admin。执行细节与设计取舍见 demo_reset.go 文件头注释。
--
-- ID 区间:sys_job id=27(2026-11-12 实查生产 max id=26)。
-- 执行方式:DBX MCP 连「我的阿里云数据库」(database=qztgo)手动执行本文件;幂等。
-- 同步要求:qztgo.sql 的 sys_job 种子已同步补 id=27 行——否则每周基线重放会把
--   本任务自身的 sys_job 记录一并清掉(重放后需重启服务才能恢复调度)。
-- 上线前置:
--   ① 将 docs/sql/qztgo.sql 拷贝到生产 /opt/qzt-server/bin/demo_baseline.sql;
--   ② 服务器确认 mysql 与 mysqldump 客户端存在(which mysql;无则安装 mysql
--      客户端包)——备份/重放均走子进程直灌 SQL 文件,不做 gorm 劈 SQL 降级,
--      客户端缺失时任务按失败落 sys_job_log。
-- ════════════════════════════════════════════════════════════════════════════

DELETE FROM `sys_job` WHERE `bean_class` = 'demoWeeklyReset';

INSERT INTO `sys_job` (`id`, `job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`, `created_at`, `updated_at`, `deleted_at`) VALUES
(27, '演示数据每周重置', '系统', '0 0 3 * * 1', 'demoWeeklyReset', 1, '每周一 03:00 重放演示基线恢复干净数据;运营配置表(企微/OSS/API Key 等)自动备份回填;完成后企微通知 admin;基线文件=/opt/qzt-server/bin/demo_baseline.sql', NOW(), NOW(), NULL);
