-- oa_form.sql OA 自定义表单引擎 + 公告迁移 + 请假菜单。
-- 幂等:可重复执行。
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行。
-- ID 区间:sys_menu 850-870。

-- ======================================================================
-- 1. 建表:oa_form_template + oa_form_data
-- ======================================================================

CREATE TABLE IF NOT EXISTS `oa_form_template` (
  `id`            bigint unsigned NOT NULL AUTO_INCREMENT,
  `form_key`      varchar(64)  NOT NULL COMMENT '表单标识',
  `name`          varchar(100) NOT NULL COMMENT '表单名称',
  `icon`          varchar(50)  DEFAULT '' COMMENT '图标',
  `description`   varchar(500) DEFAULT '' COMMENT '描述',
  `fields_config` longtext     COMMENT '字段定义JSON',
  `category`      varchar(20)  NOT NULL DEFAULT 'non-business' COMMENT '分类(business/non-business)',
  `status`        tinyint      NOT NULL DEFAULT 1 COMMENT '状态(0停用1启用)',
  `sort`          int          NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at`    datetime(3)  DEFAULT NULL,
  `updated_at`    datetime(3)  DEFAULT NULL,
  `deleted_at`    datetime(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_form_template_key` (`form_key`),
  KEY `idx_oa_form_template_category` (`category`),
  KEY `idx_oa_form_template_status` (`status`),
  KEY `idx_oa_form_template_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 自定义表单模板';

CREATE TABLE IF NOT EXISTS `oa_form_data` (
  `id`              bigint unsigned NOT NULL AUTO_INCREMENT,
  `data_no`         varchar(64)  NOT NULL COMMENT '数据单号',
  `template_id`     bigint unsigned NOT NULL COMMENT '表单模板ID',
  `template_key`    varchar(64)  DEFAULT '' COMMENT '表单标识(冗余)',
  `template_name`   varchar(100) DEFAULT '' COMMENT '表单名称(冗余)',
  `submitter_id`    bigint unsigned NOT NULL COMMENT '提交人ID',
  `dept_id`         bigint unsigned DEFAULT NULL COMMENT '部门ID',
  `field_values`    longtext     COMMENT '填写数据JSON',
  `approval_status` varchar(20)  NOT NULL DEFAULT 'NONE' COMMENT '审批状态',
  `created_at`      datetime(3)  DEFAULT NULL,
  `updated_at`      datetime(3)  DEFAULT NULL,
  `deleted_at`      datetime(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_form_data_no` (`data_no`),
  KEY `idx_oa_form_data_template` (`template_id`),
  KEY `idx_oa_form_data_key` (`template_key`),
  KEY `idx_oa_form_data_submitter` (`submitter_id`),
  KEY `idx_oa_form_data_approval` (`approval_status`),
  KEY `idx_oa_form_data_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 自定义表单数据';

-- ======================================================================
-- 2. 菜单:请假(850) + 表单管理(860) + 表单提交(865)
-- ======================================================================

-- 请假管理
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 850, 800, '请假管理', '/oa/leave', 'oa/leave/index', 'CoffeeOutlined', 10, 1, 'oa:leave:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 850);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 851, 850, '新增请假', '', NULL, 1, 2, 'oa:leave:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 851);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 852, 850, '编辑请假', '', NULL, 2, 2, 'oa:leave:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 852);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 853, 850, '删除请假', '', NULL, 3, 2, 'oa:leave:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 853);

-- 表单管理(管理员)
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 860, 800, '表单管理', '/oa/form-template', 'oa/form-template/index', 'FormOutlined', 11, 1, 'oa:form:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 860);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 861, 860, '新建表单', '', NULL, 1, 2, 'oa:form:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 861);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 862, 860, '编辑表单', '', NULL, 2, 2, 'oa:form:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 862);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 863, 860, '删除表单', '', NULL, 3, 2, 'oa:form:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 863);

-- 表单提交(用户)
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 865, 800, '表单提交', '/oa/form-data', 'oa/form-data/index', 'FileTextOutlined', 12, 1, 'oa:formdata:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 865);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 866, 865, '填写表单', '', NULL, 1, 2, 'oa:formdata:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 866);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 867, 865, '编辑数据', '', NULL, 2, 2, 'oa:formdata:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 867);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 868, 865, '删除数据', '', NULL, 3, 2, 'oa:formdata:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 868);

-- ======================================================================
-- 3. 内置表单模板:用印申请 / 车辆预订 / 办公用品领用
-- ======================================================================

INSERT INTO `oa_form_template` (`form_key`, `name`, `icon`, `description`, `fields_config`, `category`, `status`, `sort`, `created_at`, `updated_at`)
SELECT 'seal_apply', '用印申请', 'SafetyCertificateOutlined', '申请使用公司印章(公章/合同章/财务章)',
'[{"key":"seal_type","title":"印章类型","type":"select","required":true,"options":[{"label":"公章","value":"公章"},{"label":"合同章","value":"合同章"},{"label":"财务章","value":"财务章"}]},{"key":"doc_name","title":"文件名称","type":"text","required":true},{"key":"copies","title":"盖章份数","type":"number","required":true,"default":1},{"key":"purpose","title":"用途说明","type":"textarea","required":true},{"key":"remark","title":"备注","type":"textarea","required":false}]',
'non-business', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `oa_form_template` WHERE `form_key` = 'seal_apply');

INSERT INTO `oa_form_template` (`form_key`, `name`, `icon`, `description`, `fields_config`, `category`, `status`, `sort`, `created_at`, `updated_at`)
SELECT 'vehicle_booking', '车辆预订', 'CarOutlined', '申请使用公司车辆',
'[{"key":"vehicle","title":"车辆","type":"select","required":true,"options":[{"label":"商务车-A12345","value":"商务车-A12345"},{"label":"轿车-B67890","value":"轿车-B67890"},{"label":"面包车-C11111","value":"面包车-C11111"}]},{"key":"use_date","title":"使用日期","type":"date","required":true},{"key":"return_date","title":"归还日期","type":"date","required":true},{"key":"reason","title":"用车事由","type":"text","required":true},{"key":"passengers","title":"同行人员","type":"text","required":false}]',
'non-business', 1, 2, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `oa_form_template` WHERE `form_key` = 'vehicle_booking');

INSERT INTO `oa_form_template` (`form_key`, `name`, `icon`, `description`, `fields_config`, `category`, `status`, `sort`, `created_at`, `updated_at`)
SELECT 'supply_request', '办公用品领用', 'ShoppingOutlined', '申请领用办公用品',
'[{"key":"item_name","title":"物品名称","type":"text","required":true},{"key":"quantity","title":"数量","type":"number","required":true,"default":1},{"key":"purpose","title":"用途","type":"textarea","required":true},{"key":"remark","title":"备注","type":"textarea","required":false}]',
'non-business', 1, 3, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `oa_form_template` WHERE `form_key` = 'supply_request');
