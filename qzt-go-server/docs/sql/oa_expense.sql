-- oa_expense.sql OA 报销模块:建表 + 菜单 + 权限 + 字典。
-- 幂等:可重复执行。
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行。
-- ID 区间:sys_menu 800-820,sys_dict 自动。

-- ======================================================================
-- 1. 建表:oa_expense(主表) + oa_expense_item(明细行)
-- ======================================================================

CREATE TABLE IF NOT EXISTS `oa_expense` (
  `id`              bigint unsigned NOT NULL AUTO_INCREMENT,
  `expense_no`      varchar(64)  NOT NULL COMMENT '报销单号',
  `title`           varchar(200) NOT NULL COMMENT '报销标题',
  `applicant_id`    bigint unsigned NOT NULL COMMENT '申请人ID',
  `dept_id`         bigint unsigned DEFAULT NULL COMMENT '部门ID',
  `expense_type`    varchar(32)  NOT NULL COMMENT '费用类型(TRAVEL/OFFICE/HOSPITALITY/TRANSPORT/COMMUNICATION/OTHER)',
  `amount`          decimal(14,2) NOT NULL COMMENT '报销总额',
  `occur_date`      date DEFAULT NULL COMMENT '费用发生日期',
  `description`     varchar(1000) DEFAULT '' COMMENT '说明',
  `approval_status` varchar(20)  NOT NULL DEFAULT 'NONE' COMMENT '审批状态(NONE/APPROVING/APPROVED/REJECTED/REVOKED)',
  `payment_status`  tinyint      NOT NULL DEFAULT 0 COMMENT '打款状态(0未打款1已打款)',
  `created_at`      datetime(3)  DEFAULT NULL,
  `updated_at`      datetime(3)  DEFAULT NULL,
  `deleted_at`      datetime(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_expense_no` (`expense_no`),
  KEY `idx_oa_expense_applicant` (`applicant_id`),
  KEY `idx_oa_expense_type` (`expense_type`),
  KEY `idx_oa_expense_approval` (`approval_status`),
  KEY `idx_oa_expense_payment` (`payment_status`),
  KEY `idx_oa_expense_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 报销单';

CREATE TABLE IF NOT EXISTS `oa_expense_item` (
  `id`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `expense_id`  bigint unsigned NOT NULL COMMENT '报销单ID',
  `item_type`   varchar(32)  DEFAULT '' COMMENT '明细类型',
  `amount`      decimal(14,2) NOT NULL COMMENT '金额',
  `occur_date`  date DEFAULT NULL COMMENT '发生日期',
  `invoice_no`  varchar(64)  DEFAULT '' COMMENT '发票号',
  `remark`      varchar(500) DEFAULT '' COMMENT '备注',
  `created_at`  datetime(3)  DEFAULT NULL,
  `updated_at`  datetime(3)  DEFAULT NULL,
  `deleted_at`  datetime(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_oa_expense_item_expense` (`expense_id`),
  KEY `idx_oa_expense_item_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 报销明细行';

-- ======================================================================
-- 2. 菜单:OA 目录(id=800) + 报销单(id=801)
-- ======================================================================

-- OA 目录(顶级目录,与 CRM/系统管理 平级)
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 800, 0, 'OA 办公', '/oa', NULL, 'FileTextOutline', 3, 0, '', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 800);

-- 报销单菜单
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 801, 800, '报销管理', '/oa/expense', 'oa/expense/index', 'AuditOutline', 1, 1, 'oa:expense:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 801);

-- 报销单按钮权限
INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 802, 801, '新增报销', '', NULL, 1, 2, 'oa:expense:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 802);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 803, 801, '编辑报销', '', NULL, 2, 2, 'oa:expense:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 803);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 804, 801, '删除报销', '', NULL, 3, 2, 'oa:expense:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 804);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 805, 801, '打款标记', '', NULL, 4, 2, 'oa:expense:pay', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 805);

-- ======================================================================
-- 3. Casbin API 权限(超管自动有,这里补 role=1 的 API 规则,与现有模块一致)
--    注:超管(*)自动有全部权限,这里主要为非超管角色预留
-- ======================================================================

-- ======================================================================
-- 4. 字典:费用类型 EXPENSE_TYPE (sys_dict 父 + sys_dict_item 子)
-- ======================================================================

-- 字典父项(若不存在则创建)
INSERT INTO `sys_dict` (`name`, `code`, `sort`, `status`, `created_at`, `updated_at`)
SELECT '费用类型', 'EXPENSE_TYPE', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_dict` WHERE `code` = 'EXPENSE_TYPE');

-- 字典子项(用子查询定位 dict_id)
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '差旅', 'TRAVEL', 1, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'EXPENSE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'TRAVEL');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '办公', 'OFFICE', 2, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'EXPENSE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'OFFICE');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '招待', 'HOSPITALITY', 3, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'EXPENSE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'HOSPITALITY');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '交通', 'TRANSPORT', 4, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'EXPENSE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'TRANSPORT');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '通讯', 'COMMUNICATION', 5, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'EXPENSE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'COMMUNICATION');

INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `created_at`, `updated_at`)
SELECT d.id, '其他', 'OTHER', 6, 1, NOW(), NOW()
FROM `sys_dict` d WHERE d.code = 'EXPENSE_TYPE' AND NOT EXISTS (SELECT 1 FROM `sys_dict_item` di WHERE di.dict_id = d.id AND di.value = 'OTHER');
