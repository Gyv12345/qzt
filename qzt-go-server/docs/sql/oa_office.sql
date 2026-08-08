-- oa_office.sql OA 日常办公:工作日志 + 日程日历 + 会议室 + 会议预订。
-- 幂等:可重复执行。
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行。
-- ID 区间:sys_menu 830-879,sys_dict 自动。

-- ======================================================================
-- 1. 建表:oa_work_log + oa_schedule + oa_meeting_room + oa_meeting_booking
-- ======================================================================

-- 工作日志
CREATE TABLE IF NOT EXISTS `oa_work_log` (
  `id`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `log_no`      varchar(64)  NOT NULL COMMENT '日志单号',
  `log_type`    varchar(16)  NOT NULL DEFAULT 'DAILY' COMMENT '类型(DAILY/WEEKLY/MONTHLY)',
  `log_date`    date         NOT NULL COMMENT '日志日期',
  `content`     text         COMMENT '今日完成',
  `plan`        text         COMMENT '明日计划',
  `problems`    text         COMMENT '遇到问题',
  `creator_id`  bigint unsigned NOT NULL COMMENT '填写人ID',
  `dept_id`     bigint unsigned DEFAULT NULL COMMENT '部门ID',
  `created_at`  datetime(3)  DEFAULT NULL,
  `updated_at`  datetime(3)  DEFAULT NULL,
  `deleted_at`  datetime(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_work_log_no` (`log_no`),
  KEY `idx_oa_work_log_creator` (`creator_id`),
  KEY `idx_oa_work_log_dept` (`dept_id`),
  KEY `idx_oa_work_log_type` (`log_type`),
  KEY `idx_oa_work_log_date` (`log_date`),
  KEY `idx_oa_work_log_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 工作日志';

-- 日程安排
CREATE TABLE IF NOT EXISTS `oa_schedule` (
  `id`           bigint unsigned NOT NULL AUTO_INCREMENT,
  `schedule_no`  varchar(64)  NOT NULL COMMENT '日程单号',
  `title`        varchar(200) NOT NULL COMMENT '标题',
  `event_type`   varchar(16)  NOT NULL DEFAULT 'OTHER' COMMENT '类型(MEETING/TASK/REMINDER/OUT/OTHER)',
  `start_time`   datetime     NOT NULL COMMENT '开始时间',
  `end_time`     datetime     NOT NULL COMMENT '结束时间',
  `location`     varchar(200) DEFAULT '' COMMENT '地点',
  `content`      text         COMMENT '内容',
  `remind_type`  varchar(16)  NOT NULL DEFAULT 'NONE' COMMENT '提醒(NONE/MIN5/MIN15/HOUR1/DAY1)',
  `status`       varchar(16)  NOT NULL DEFAULT 'PENDING' COMMENT '状态(PENDING/DONE/CANCELED)',
  `creator_id`   bigint unsigned NOT NULL COMMENT '创建人ID',
  `created_at`   datetime(3)  DEFAULT NULL,
  `updated_at`   datetime(3)  DEFAULT NULL,
  `deleted_at`   datetime(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_schedule_no` (`schedule_no`),
  KEY `idx_oa_schedule_creator` (`creator_id`),
  KEY `idx_oa_schedule_type` (`event_type`),
  KEY `idx_oa_schedule_status` (`status`),
  KEY `idx_oa_schedule_time` (`start_time`, `end_time`),
  KEY `idx_oa_schedule_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 日程安排';

-- 会议室
CREATE TABLE IF NOT EXISTS `oa_meeting_room` (
  `id`         bigint unsigned NOT NULL AUTO_INCREMENT,
  `name`       varchar(100) NOT NULL COMMENT '会议室名称',
  `location`   varchar(200) DEFAULT '' COMMENT '位置',
  `capacity`   int          NOT NULL DEFAULT 0 COMMENT '容纳人数',
  `equipment`  varchar(500) DEFAULT '' COMMENT '设备(逗号分隔)',
  `status`     varchar(16)  NOT NULL DEFAULT 'ENABLED' COMMENT '状态(ENABLED/DISABLED/MAINTENANCE)',
  `remark`     varchar(500) DEFAULT '' COMMENT '备注',
  `created_at` datetime(3)  DEFAULT NULL,
  `updated_at` datetime(3)  DEFAULT NULL,
  `deleted_at` datetime(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_oa_meeting_room_status` (`status`),
  KEY `idx_oa_meeting_room_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 会议室';

-- 会议预订
CREATE TABLE IF NOT EXISTS `oa_meeting_booking` (
  `id`              bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_no`      varchar(64)  NOT NULL COMMENT '预订单号',
  `title`           varchar(200) NOT NULL COMMENT '会议标题',
  `room_id`         bigint unsigned NOT NULL COMMENT '会议室ID',
  `organizer_id`    bigint unsigned NOT NULL COMMENT '预订人ID',
  `dept_id`         bigint unsigned DEFAULT NULL COMMENT '部门ID',
  `start_time`      datetime     NOT NULL COMMENT '开始时间',
  `end_time`        datetime     NOT NULL COMMENT '结束时间',
  `attendees`       int          NOT NULL DEFAULT 0 COMMENT '参会人数',
  `topic`           varchar(500) DEFAULT '' COMMENT '会议主题/议程',
  `approval_status` varchar(20)  NOT NULL DEFAULT 'NONE' COMMENT '审批状态(NONE/APPROVING/APPROVED/REJECTED/REVOKED)',
  `remark`          varchar(500) DEFAULT '' COMMENT '备注',
  `created_at`      datetime(3)  DEFAULT NULL,
  `updated_at`      datetime(3)  DEFAULT NULL,
  `deleted_at`      datetime(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_meeting_booking_no` (`booking_no`),
  KEY `idx_oa_meeting_booking_room` (`room_id`),
  KEY `idx_oa_meeting_booking_organizer` (`organizer_id`),
  KEY `idx_oa_meeting_booking_approval` (`approval_status`),
  KEY `idx_oa_meeting_booking_time` (`start_time`, `end_time`),
  KEY `idx_oa_meeting_booking_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 会议预订';

-- ======================================================================
-- 2. 菜单:工作日志(830) + 日程(835) + 会议室(840) + 会议预订(845)
-- ======================================================================

-- 工作日志菜单
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 830, 800, '工作日志', '/oa/work-log', 'oa/work-log/index', 'FileTextOutlined', 5, 1, 'oa:worklog:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 830);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 831, 830, '新增日志', '', NULL, 1, 2, 'oa:worklog:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 831);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 832, 830, '编辑日志', '', NULL, 2, 2, 'oa:worklog:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 832);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 833, 830, '删除日志', '', NULL, 3, 2, 'oa:worklog:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 833);

-- 日程安排菜单
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 835, 800, '日程安排', '/oa/schedule', 'oa/schedule/index', 'CalendarOutlined', 6, 1, 'oa:schedule:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 835);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 836, 835, '新增日程', '', NULL, 1, 2, 'oa:schedule:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 836);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 837, 835, '编辑日程', '', NULL, 2, 2, 'oa:schedule:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 837);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 838, 835, '删除日程', '', NULL, 3, 2, 'oa:schedule:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 838);

-- 会议室管理菜单
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 840, 800, '会议室管理', '/oa/meeting-room', 'oa/meeting-room/index', 'HomeOutlined', 7, 1, 'oa:meetingroom:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 840);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 841, 840, '新增会议室', '', NULL, 1, 2, 'oa:meetingroom:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 841);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 842, 840, '编辑会议室', '', NULL, 2, 2, 'oa:meetingroom:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 842);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 843, 840, '删除会议室', '', NULL, 3, 2, 'oa:meetingroom:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 843);

-- 会议预订菜单
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 845, 800, '会议预订', '/oa/meeting-booking', 'oa/meeting-booking/index', 'TeamOutlined', 8, 1, 'oa:meeting:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 845);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 846, 845, '新增预订', '', NULL, 1, 2, 'oa:meeting:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 846);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 847, 845, '编辑预订', '', NULL, 2, 2, 'oa:meeting:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 847);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 848, 845, '删除预订', '', NULL, 3, 2, 'oa:meeting:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 848);

-- ======================================================================
-- 3. 字典:日志类型 + 日程类型 + 提醒类型 + 日程状态 + 会议室状态 + 会议预订设备
-- ======================================================================

-- 日志类型 LOG_TYPE
INSERT INTO `sys_dict` (`name`, `code`, `sort`, `status`, `created_at`, `updated_at`)
SELECT '日志类型', 'LOG_TYPE', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_dict` WHERE `code` = 'LOG_TYPE');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '日报', 'DAILY', 1, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'LOG_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'DAILY');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '周报', 'WEEKLY', 2, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'LOG_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'WEEKLY');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '月报', 'MONTHLY', 3, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'LOG_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'MONTHLY');

-- 日程类型 SCHEDULE_TYPE
INSERT INTO `sys_dict` (`name`, `code`, `sort`, `status`, `created_at`, `updated_at`)
SELECT '日程类型', 'SCHEDULE_TYPE', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_dict` WHERE `code` = 'SCHEDULE_TYPE');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '会议', 'MEETING', 1, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'MEETING');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '任务', 'TASK', 2, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'TASK');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '提醒', 'REMINDER', 3, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'REMINDER');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '外出', 'OUT', 4, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'OUT');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '其他', 'OTHER', 5, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'OTHER');

-- 提醒类型 SCHEDULE_REMIND
INSERT INTO `sys_dict` (`name`, `code`, `sort`, `status`, `created_at`, `updated_at`)
SELECT '日程提醒', 'SCHEDULE_REMIND', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_dict` WHERE `code` = 'SCHEDULE_REMIND');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '不提醒', 'NONE', 1, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_REMIND' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'NONE');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '提前5分钟', 'MIN5', 2, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_REMIND' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'MIN5');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '提前15分钟', 'MIN15', 3, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_REMIND' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'MIN15');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '提前1小时', 'HOUR1', 4, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_REMIND' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'HOUR1');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '提前1天', 'DAY1', 5, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_REMIND' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'DAY1');

-- 日程状态 SCHEDULE_STATUS
INSERT INTO `sys_dict` (`name`, `code`, `sort`, `status`, `created_at`, `updated_at`)
SELECT '日程状态', 'SCHEDULE_STATUS', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_dict` WHERE `code` = 'SCHEDULE_STATUS');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '待处理', 'PENDING', 1, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_STATUS' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'PENDING');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '已完成', 'DONE', 2, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_STATUS' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'DONE');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '已取消', 'CANCELED', 3, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'SCHEDULE_STATUS' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'CANCELED');

-- 会议室状态 MEETING_ROOM_STATUS
INSERT INTO `sys_dict` (`name`, `code`, `sort`, `status`, `created_at`, `updated_at`)
SELECT '会议室状态', 'MEETING_ROOM_STATUS', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_dict` WHERE `code` = 'MEETING_ROOM_STATUS');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '可用', 'ENABLED', 1, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'MEETING_ROOM_STATUS' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'ENABLED');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '停用', 'DISABLED', 2, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'MEETING_ROOM_STATUS' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'DISABLED');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '维护中', 'MAINTENANCE', 3, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'MEETING_ROOM_STATUS' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'MAINTENANCE');
