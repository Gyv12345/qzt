-- ======================================================================
-- wecom_clock.sql — 考勤打卡来源字段 + 企微打卡数据同步定时任务
--
-- 用途:
--   1. hrm_attendance_clock 加 source 列(区分 APP 打卡 / 企微同步)
--   2. 注册「企微打卡数据同步」定时任务(每小时整点)
--
-- 执行方式:
--   DBX MCP 禁止 DDL/ALTER,请在生产 RDS 上用 mysql-client 直连执行。
--   生产 DSN 见 qzt-go-server/.env 的 MYSQL_DSN:
--     mysql -h <host> -P <port> -u <user> -p<pwd> qztgo < wecom_clock.sql
--   本地/测试库可直接用 DBX MCP 跑(只含 INSERT 的部分)。
--
-- ID 分配:无固定 ID 段(ALTER 无 ID;sys_job 自增)。
-- ======================================================================

-- ── 1. 打卡记录表增加 source 列(来源:APP / WECOM) ──
-- 幂等:先判断列是否存在(MySQL 8 用 information_schema)。
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_clock' AND COLUMN_NAME = 'source'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `hrm_attendance_clock` ADD COLUMN `source` varchar(20) NOT NULL DEFAULT ''APP'' COMMENT ''打卡来源(APP/WECOM)''',
  'SELECT ''source 列已存在,跳过'' AS msg');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 2. 企微打卡数据同步定时任务(bean_class 必须与 Go 代码 RegisterJobHandler 一致) ──
-- cron 6 段式:0 0 * * * * = 每小时整点(秒0 分0)
INSERT INTO `sys_job` (`job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`)
SELECT '企微打卡数据同步', 'hrm', '0 0 * * * *', 'hrm.wecom.clock_sync', 1, '每小时同步企微打卡记录到本地 hrm_attendance_clock(source=WECOM)'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sys_job` WHERE `bean_class` = 'hrm.wecom.clock_sync');

-- ======================================================================
-- 配置说明(手动执行,非本脚本自动跑):
--
-- 企微打卡数据用「打卡应用」的独立 Secret(不是当前通讯录/自建应用 Secret)。
-- 在 sys_oauth_config 表 provider='wecom' 记录的 extra 字段(JSON)里配置:
--
--   UPDATE sys_oauth_config
--   SET extra = JSON_OBJECT('checkin_secret', '你的企微打卡应用Secret')
--   WHERE provider = 'wecom';
--
-- 获取 Secret:企微管理后台 → 应用管理 → 打卡应用 → Secret。
-- 注意:打卡应用需在企微后台开通「打卡数据」API 权限。
-- 配置后无需重启,定时任务下次执行会读取新 Secret。
-- ======================================================================
