-- hrm_attendance_v2.sql P14 考勤排班 v2:班次/节假日/考勤组/排班 4 张新表
-- + 月度汇总加迟到早退缺卡列 + 「排班管理」页面菜单/API。
-- 幂等:CREATE TABLE IF NOT EXISTS + 固定 ID + information_schema 守卫 ALTER。
-- ID 分配:sys_menu 2252~2255;sys_api 736~750。
-- 执行方式:DBX MCP database=qztgo 逐段执行;casbin 授权段重启后生效。

-- ======================================================================
-- 1. 建表(4 张)
-- ======================================================================

CREATE TABLE IF NOT EXISTS `hrm_shift` (
  `id`           bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`         varchar(64)  NOT NULL COMMENT '班次名称',
  `start_time`   varchar(8)   NOT NULL COMMENT '上班时间 HH:mm:ss',
  `end_time`     varchar(8)   NOT NULL COMMENT '下班时间 HH:mm:ss',
  `flex_minutes` int          NOT NULL DEFAULT 0 COMMENT '弹性分钟数(迟到判定宽限)',
  `cross_day`    tinyint      NOT NULL DEFAULT 0 COMMENT '是否跨天(1= endTime<startTime)',
  `status`       tinyint      NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `created_at`   datetime(3)  DEFAULT NULL,
  `updated_at`   datetime(3)  DEFAULT NULL,
  `deleted_at`   datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤班次';

CREATE TABLE IF NOT EXISTS `hrm_holiday` (
  `id`           bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `holiday_date` date         NOT NULL COMMENT '日期',
  `name`         varchar(64)  NOT NULL COMMENT '名称(如 国庆节/调休补班)',
  `type`         varchar(16)  NOT NULL COMMENT 'HOLIDAY放假 / WORKDAY调休补班',
  `created_at`   datetime(3)  DEFAULT NULL,
  `updated_at`   datetime(3)  DEFAULT NULL,
  `deleted_at`   datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date` (`holiday_date`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='节假日(法定假日+调休补班)';

CREATE TABLE IF NOT EXISTS `hrm_attendance_group` (
  `id`         bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`       varchar(64) NOT NULL COMMENT '考勤组名称',
  `dept_id`    bigint unsigned DEFAULT NULL COMMENT '绑定部门(NULL=不绑定仅手动指派)',
  `shift_id`   bigint unsigned NOT NULL COMMENT '默认班次ID',
  `status`     tinyint     NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_dept` (`dept_id`),
  KEY `idx_shift` (`shift_id`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤组(按部门绑定默认班次)';

CREATE TABLE IF NOT EXISTS `hrm_schedule` (
  `id`            bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `employee_id`   bigint unsigned NOT NULL COMMENT '员工ID',
  `schedule_date` date        NOT NULL COMMENT '排班日期',
  `shift_id`      bigint unsigned NOT NULL COMMENT '班次ID',
  `source`        varchar(16) NOT NULL DEFAULT 'MANUAL' COMMENT '来源(MANUAL手动/GROUP考勤组推导)',
  `created_at`   datetime(3)  DEFAULT NULL,
  `updated_at`   datetime(3)  DEFAULT NULL,
  `deleted_at`   datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_emp_date` (`employee_id`, `schedule_date`),
  KEY `idx_date` (`schedule_date`),
  KEY `idx_shift` (`shift_id`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排班日历(员工×日期×班次)';

-- ======================================================================
-- 2. hrm_attendance_summary 加迟到/早退/缺卡列(information_schema 守卫,可重复执行)
-- ======================================================================

SET @has_late = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hrm_attendance_summary' AND COLUMN_NAME='late_count');
SET @ddl = IF(@has_late=0,
  'ALTER TABLE `hrm_attendance_summary` ADD COLUMN `late_count` int NOT NULL DEFAULT 0 COMMENT ''迟到次数'' AFTER `overtime_hours`',
  'SELECT ''late_count exists'' AS note');
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @has_early = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hrm_attendance_summary' AND COLUMN_NAME='early_count');
SET @ddl = IF(@has_early=0,
  'ALTER TABLE `hrm_attendance_summary` ADD COLUMN `early_count` int NOT NULL DEFAULT 0 COMMENT ''早退次数'' AFTER `late_count`',
  'SELECT ''skip'' AS note');
PREPARE s2 FROM @ddl; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @has_missing = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hrm_attendance_summary' AND COLUMN_NAME='missing_days');
SET @ddl = IF(@has_missing=0,
  'ALTER TABLE `hrm_attendance_summary` ADD COLUMN `missing_days` int NOT NULL DEFAULT 0 COMMENT ''缺卡天数'' AFTER `early_count`',
  'SELECT ''skip'' AS note');
PREPARE s3 FROM @ddl; EXECUTE s3; DEALLOCATE PREPARE s3;

-- ======================================================================
-- 3. sys_menu「排班管理」页(挂人事管理 874 下,含班次/节假日/考勤组/排班四 Tab)
-- ======================================================================

DELETE FROM `sys_menu` WHERE `id` BETWEEN 2252 AND 2255 AND `permission` NOT LIKE 'hrm:schedule%';
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`, `deleted_at`)
VALUES
  (2252, 874, '排班管理', '/hrm/schedule', 'hrm/schedule/index', 'CalendarOutlined', 2, 1, 'hrm:schedule:list', 1, 1, NOW(3), NOW(3), NULL),
  (2253, 2252, '排班维护', '', '', '', 0, 2, 'hrm:schedule:add', 1, 1, NOW(3), NOW(3), NULL),
  (2254, 2252, '排班编辑', '', '', '', 0, 2, 'hrm:schedule:edit', 1, 1, NOW(3), NOW(3), NULL),
  (2255, 2252, '排班删除', '', '', '', 0, 2, 'hrm:schedule:delete', 1, 1, NOW(3), NOW(3), NULL);

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
VALUES (1,2252),(1,2253),(1,2254),(1,2255),(9,2252),(9,2253),(9,2254),(9,2255)
ON DUPLICATE KEY UPDATE `sys_role_id`=`sys_role_id`;

-- ======================================================================
-- 4. sys_api(736~750) + casbin 授权(super_admin + hr + sales_director)
-- ======================================================================

DELETE FROM `sys_api` WHERE `id` BETWEEN 736 AND 750 AND `path` NOT LIKE '/hrm/shifts%' AND `path` NOT LIKE '/hrm/holidays%' AND `path` NOT LIKE '/hrm/attendance-groups%' AND `path` NOT LIKE '/hrm/schedules%';
INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
  (736, '/hrm/shifts', 'GET',    'HRM', '班次列表',   NOW(3), NOW(3), NULL),
  (737, '/hrm/shifts', 'POST',   'HRM', '新建班次',   NOW(3), NOW(3), NULL),
  (738, '/hrm/shifts/:id', 'PUT', 'HRM', '更新班次',   NOW(3), NOW(3), NULL),
  (739, '/hrm/shifts/:id', 'DELETE', 'HRM', '删除班次', NOW(3), NOW(3), NULL),
  (740, '/hrm/holidays', 'GET',  'HRM', '节假日列表', NOW(3), NOW(3), NULL),
  (741, '/hrm/holidays', 'POST', 'HRM', '新建节假日', NOW(3), NOW(3), NULL),
  (742, '/hrm/holidays/:id', 'PUT', 'HRM', '更新节假日', NOW(3), NOW(3), NULL),
  (743, '/hrm/holidays/:id', 'DELETE', 'HRM', '删除节假日', NOW(3), NOW(3), NULL),
  (744, '/hrm/attendance-groups', 'GET', 'HRM', '考勤组列表', NOW(3), NOW(3), NULL),
  (745, '/hrm/attendance-groups', 'POST', 'HRM', '新建考勤组', NOW(3), NOW(3), NULL),
  (746, '/hrm/attendance-groups/:id', 'PUT', 'HRM', '更新考勤组', NOW(3), NOW(3), NULL),
  (747, '/hrm/attendance-groups/:id', 'DELETE', 'HRM', '删除考勤组', NOW(3), NOW(3), NULL),
  (748, '/hrm/schedules/month', 'GET', 'HRM', '排班月视图', NOW(3), NOW(3), NULL),
  (749, '/hrm/schedules/batch', 'POST', 'HRM', '整月批量排班', NOW(3), NOW(3), NULL),
  (750, '/hrm/schedules/:id', 'DELETE', 'HRM', '删除排班', NOW(3), NOW(3), NULL);

INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`)
SELECT 'p', rc.code, a.path, a.method FROM
  (SELECT 'super_admin' AS code UNION SELECT 'hr') rc
  JOIN sys_api a ON a.id BETWEEN 736 AND 750
WHERE NOT EXISTS (
  SELECT 1 FROM casbin_rule cr
  WHERE cr.ptype='p' AND cr.v0=rc.code AND cr.v1=a.path AND cr.v2=a.method
);
