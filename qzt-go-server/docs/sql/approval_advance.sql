-- ======================================================================
-- approval_advance.sql — 审批引擎 BPM 高级操作地基(加签/减签/退回/超时提醒)
--
-- 用途:
--   1. approval_task 加 reminded_at 列(超时提醒时间,定时任务 approvalTimeoutRemind 每轮置位)
--   2. approval_add_sign_task 加 initiator_id 列(加签发起人,减签权限判定依据)
--   3. sys_config 种子: approval.timeout_hours(超时阈值,默认 48 小时)
--   4. sys_job 种子: id=28 approvalTimeoutRemind(每小时 0 分扫描超时待办发提醒)
--
-- 配套代码(本文件执行后即生效,无需重启注册):
--   - 加签 POST /approval/actions/add-sign、减签 POST /approval/actions/remove-sign、
--     退回 POST /approval/actions/return-back(审批路由 login-only,不登记 sys_api/菜单,历史口径)
--   - 定时任务处理器 service/timeout.go init() 注册 bean_class=approvalTimeoutRemind
--
-- 执行方式:
--   DBX MCP 禁止 DDL/ALTER,请在生产 RDS 上用 mysql-client 直连执行。
--   生产 DSN 见 qzt-go-server/.env 的 MYSQL_DSN:
--     mysql -h <host> -P <port> -u <user> -p<pwd> qztgo < approval_advance.sql
--   本地/测试库可直接用 DBX MCP 跑(只含 INSERT 的段落)。
--
-- ID 分配:ALTER 无 ID;sys_config 自增;sys_job 固定 id=28(紧邻 27 demoWeeklyReset)。
-- 幂等性:ALTER 走 information_schema 列存在判断;INSERT 均 WHERE NOT EXISTS。
-- ======================================================================

-- ── 1. approval_task 加 reminded_at 列(最近一次超时提醒时间,空=未提醒) ──
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_task' AND COLUMN_NAME = 'reminded_at'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `approval_task` ADD COLUMN `reminded_at` datetime(3) DEFAULT NULL COMMENT ''最近一次超时提醒时间(空=未提醒;定时任务 approvalTimeoutRemind 发送后置位)''',
  'SELECT ''reminded_at 列已存在,跳过'' AS msg');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 2. approval_add_sign_task 加 initiator_id 列(加签发起人ID,减签权限依据) ──
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_add_sign_task' AND COLUMN_NAME = 'initiator_id'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `approval_add_sign_task` ADD COLUMN `initiator_id` bigint unsigned NOT NULL DEFAULT ''0'' COMMENT ''加签发起人ID(减签权限判定:仅发起人可撤回自己发起的加签)''',
  'SELECT ''initiator_id 列已存在,跳过'' AS msg');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 3. sys_config 种子: 审批超时阈值(小时) ──
INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'approval', 'approval.timeout_hours', '审批超时提醒阈值(小时)', '48', 'int', 0, 1, 1, 1, '定时任务 approvalTimeoutRemind 每小时扫描,待办等待超过该阈值且未提醒过时通知当前审批人;改后无需重启,任务下一轮生效'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'approval.timeout_hours');

-- ── 4. sys_job 种子: 审批超时提醒(bean_class 必须与 Go 代码 RegisterJobHandler 一致) ──
-- cron 6段式(秒 分 时 日 月 周,与调度器 robfig/cron WithSeconds 一致): 0 0 * * * * = 每小时 0 分
-- 注:调度器 JobScheduler 用 6 段式解析,7 段表达式会注册失败,故与 wecom_clock/demoWeeklyReset 同口径。
INSERT INTO `sys_job` (`id`, `job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`, `created_at`, `updated_at`)
SELECT 28, '审批超时提醒', 'approval', '0 0 * * * *', 'approvalTimeoutRemind', 1,
       '每小时 0 分扫描等待超过 approval.timeout_hours(默认48)且未提醒过的待办,通知当前审批人并置 reminded_at;每任务只提醒一次'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sys_job` WHERE `bean_class` = 'approvalTimeoutRemind')
  AND NOT EXISTS (SELECT 1 FROM `sys_job` WHERE `id` = 28);
