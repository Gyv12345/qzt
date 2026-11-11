-- =====================================================================
-- oa_vehicle_seal.sql
-- 用途:P24 OA 用车/印章管理 —— 四张业务表(车辆台账/用车申请/印章台账/用印申请)
--      + 菜单(用车管理/印章管理及按钮) + API 登记 + 菜单-API 绑定 + casbin 策略 + 角色授权。
-- 幂等:CREATE TABLE IF NOT EXISTS + INSERT 均带 NOT EXISTS 防重,可重复执行。
-- ID 区间:
--   sys_menu 2300~2308 (父菜单:OA 目录 id=800)
--   sys_api  796~816   (21 个端点)
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,逐段执行。
-- 注意:casbin_rule 直插后必须重启 qzt-server 才生效(Casbin enforcer 启动时加载策略);
--      菜单/角色授权实时生效(前端重新登录/刷新菜单即可)。
-- 角色集合:与「出差申请」模块同口径(sys_role_menu 中出差管理菜单 810 及按钮 811~813
--      授权给角色 3销售/4销售经理/5财务/6人事/7采购/9销售总监/10普通员工),
--      菜单与按钮另加角色 1(超级管理员);casbin 同集合。
-- 关联代码:
--   qzt-go-server internal/model/oa/vehicle_seal.go(模型)
--   qzt-go-server internal/repository/oa/vehicle.go / seal.go(仓储)
--   qzt-go-server internal/module/oa/service/vehicle.go / seal.go(服务)
--   qzt-go-server internal/module/oa/handler/vehicle_seal.go(路由)
-- =====================================================================

-- ======================================================================
-- 1. 建表:oa_vehicle + oa_vehicle_application + oa_seal + oa_seal_application
-- ======================================================================

-- 车辆台账
CREATE TABLE IF NOT EXISTS `oa_vehicle` (
  `id`            bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `plate_no`      varchar(20)  NOT NULL COMMENT '车牌号',
  `vehicle_model` varchar(100) DEFAULT '' COMMENT '车型',
  `seats`         int          NOT NULL DEFAULT 5 COMMENT '座位数',
  `status`        varchar(20)  NOT NULL DEFAULT 'IDLE' COMMENT '状态:IDLE空闲/IN_USE使用中/MAINTENANCE维修中/DISABLED停用',
  `owner_id`      bigint unsigned DEFAULT NULL COMMENT '责任人ID(sys_user)',
  `remark`        varchar(500) DEFAULT '' COMMENT '备注',
  `created_at`    datetime(3)  DEFAULT NULL,
  `updated_at`    datetime(3)  DEFAULT NULL,
  `deleted_at`    datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_vehicle_plate_no` (`plate_no`),
  KEY `idx_oa_vehicle_status` (`status`),
  KEY `idx_oa_vehicle_owner` (`owner_id`),
  KEY `idx_oa_vehicle_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 车辆台账';

-- 用车申请单
CREATE TABLE IF NOT EXISTS `oa_vehicle_application` (
  `id`              bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `application_no`  varchar(64)  NOT NULL COMMENT '用车申请单号',
  `title`           varchar(200) NOT NULL COMMENT '申请标题',
  `applicant_id`    bigint unsigned NOT NULL COMMENT '申请人ID',
  `dept_id`         bigint unsigned DEFAULT NULL COMMENT '部门ID',
  `vehicle_id`      bigint unsigned NOT NULL COMMENT '车辆ID',
  `reason`          varchar(500) NOT NULL COMMENT '用车事由',
  `start_time`      datetime     NOT NULL COMMENT '出发时间',
  `end_time`        datetime     NOT NULL COMMENT '预计归还时间',
  `passengers`      int          NOT NULL DEFAULT 1 COMMENT '随行人数',
  `destination`     varchar(200) DEFAULT '' COMMENT '目的地',
  `approval_status` varchar(20)  NOT NULL DEFAULT 'NONE' COMMENT '审批状态',
  `status`          tinyint      NOT NULL DEFAULT 1 COMMENT '业务状态:1用车中 2已归还',
  `created_at`      datetime(3)  DEFAULT NULL,
  `updated_at`      datetime(3)  DEFAULT NULL,
  `deleted_at`      datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_vehicle_application_no` (`application_no`),
  KEY `idx_oa_vehicle_application_approval` (`approval_status`),
  KEY `idx_oa_vehicle_application_applicant` (`applicant_id`),
  KEY `idx_oa_vehicle_application_vehicle` (`vehicle_id`),
  KEY `idx_oa_vehicle_application_dept` (`dept_id`),
  KEY `idx_oa_vehicle_application_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 用车申请单';

-- 印章台账
CREATE TABLE IF NOT EXISTS `oa_seal` (
  `id`          bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`        varchar(100) NOT NULL COMMENT '印章名称',
  `type`        varchar(20)  NOT NULL DEFAULT 'OFFICIAL' COMMENT '类型:OFFICIAL公章/CONTRACT合同章/FINANCE财务章/LEGAL法人章/OTHER其他',
  `keeper_id`   bigint unsigned DEFAULT NULL COMMENT '保管人ID(sys_user)',
  `status`      tinyint      NOT NULL DEFAULT 1 COMMENT '状态:1启用 2停用',
  `remark`      varchar(500) DEFAULT '' COMMENT '备注',
  `created_at`  datetime(3)  DEFAULT NULL,
  `updated_at`  datetime(3)  DEFAULT NULL,
  `deleted_at`  datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_seal_name` (`name`),
  KEY `idx_oa_seal_status` (`status`),
  KEY `idx_oa_seal_keeper` (`keeper_id`),
  KEY `idx_oa_seal_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 印章台账';

-- 用印申请单
CREATE TABLE IF NOT EXISTS `oa_seal_application` (
  `id`              bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `application_no`  varchar(64)  NOT NULL COMMENT '用印申请单号',
  `title`           varchar(200) NOT NULL COMMENT '申请标题',
  `applicant_id`    bigint unsigned NOT NULL COMMENT '申请人ID',
  `dept_id`         bigint unsigned DEFAULT NULL COMMENT '部门ID',
  `seal_id`         bigint unsigned NOT NULL COMMENT '印章ID',
  `reason`          varchar(500) NOT NULL COMMENT '用印事由',
  `document_name`   varchar(200) DEFAULT '' COMMENT '文件名称',
  `copies`          int          NOT NULL DEFAULT 1 COMMENT '份数',
  `seal_date`       datetime     NOT NULL COMMENT '用印日期',
  `approval_status` varchar(20)  NOT NULL DEFAULT 'NONE' COMMENT '审批状态',
  `created_at`      datetime(3)  DEFAULT NULL,
  `updated_at`      datetime(3)  DEFAULT NULL,
  `deleted_at`      datetime(3)  DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oa_seal_application_no` (`application_no`),
  KEY `idx_oa_seal_application_approval` (`approval_status`),
  KEY `idx_oa_seal_application_applicant` (`applicant_id`),
  KEY `idx_oa_seal_application_seal` (`seal_id`),
  KEY `idx_oa_seal_application_dept` (`dept_id`),
  KEY `idx_oa_seal_application_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OA 用印申请单';

-- ======================================================================
-- 2. sys_menu 2300~2308(父菜单 OA 目录 id=800)
--    2300 用车管理 / 2301 印章管理(type=1)
--    2302~2308 按钮(type=2)
-- ======================================================================

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2300, 800, '用车管理', '/oa/vehicle', 'oa/vehicle/index', 'CarOutlined', 13, 1, 'oa:vehicle:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2300);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2301, 800, '印章管理', '/oa/seal', 'oa/seal/index', 'StampOutlined', 14, 1, 'oa:seal:list', 1, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2301);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2302, 2300, '新增车辆', '', NULL, 1, 2, 'oa:vehicle:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2302);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2303, 2300, '编辑车辆', '', NULL, 2, 2, 'oa:vehicle:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2303);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2304, 2300, '删除车辆', '', NULL, 3, 2, 'oa:vehicle:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2304);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2305, 2300, '归还车辆', '', NULL, 4, 2, 'oa:vehicle:return', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2305);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2306, 2301, '新增印章', '', NULL, 1, 2, 'oa:seal:add', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2306);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2307, 2301, '编辑印章', '', NULL, 2, 2, 'oa:seal:edit', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2307);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
SELECT 2308, 2301, '删除印章', '', NULL, 3, 2, 'oa:seal:delete', 0, 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `id` = 2308);

-- ======================================================================
-- 3. sys_api 796~816(21 个端点,group='OA')
-- ======================================================================

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`)
SELECT x.id, x.path, x.method, 'OA', x.descr, NOW(3), NOW(3) FROM (
  SELECT 796 AS id, '/oa/vehicles'                   AS path, 'GET'    AS method, '车辆列表'     AS descr UNION ALL
  SELECT 797, '/oa/vehicles',                        'POST',   '新增车辆' UNION ALL
  SELECT 798, '/oa/vehicles/:id',                    'GET',    '车辆详情' UNION ALL
  SELECT 799, '/oa/vehicles/:id',                    'PUT',    '编辑车辆' UNION ALL
  SELECT 800, '/oa/vehicles/:id',                    'DELETE', '删除车辆' UNION ALL
  SELECT 801, '/oa/vehicle-applications',            'GET',    '用车申请列表' UNION ALL
  SELECT 802, '/oa/vehicle-applications',            'POST',   '新建用车申请' UNION ALL
  SELECT 803, '/oa/vehicle-applications/:id',        'GET',    '用车申请详情' UNION ALL
  SELECT 804, '/oa/vehicle-applications/:id',        'PUT',    '编辑用车申请' UNION ALL
  SELECT 805, '/oa/vehicle-applications/:id',        'DELETE', '删除用车申请' UNION ALL
  SELECT 806, '/oa/vehicle-applications/:id/return', 'POST',   '归还车辆' UNION ALL
  SELECT 807, '/oa/seals',                           'GET',    '印章列表' UNION ALL
  SELECT 808, '/oa/seals',                           'POST',   '新增印章' UNION ALL
  SELECT 809, '/oa/seals/:id',                       'GET',    '印章详情' UNION ALL
  SELECT 810, '/oa/seals/:id',                       'PUT',    '编辑印章' UNION ALL
  SELECT 811, '/oa/seals/:id',                       'DELETE', '删除印章' UNION ALL
  SELECT 812, '/oa/seal-applications',               'GET',    '用印申请列表' UNION ALL
  SELECT 813, '/oa/seal-applications',               'POST',   '新建用印申请' UNION ALL
  SELECT 814, '/oa/seal-applications/:id',           'GET',    '用印申请详情' UNION ALL
  SELECT 815, '/oa/seal-applications/:id',           'PUT',    '编辑用印申请' UNION ALL
  SELECT 816, '/oa/seal-applications/:id',           'DELETE', '删除用印申请'
) x
WHERE NOT EXISTS (SELECT 1 FROM `sys_api` a WHERE a.id = x.id AND a.deleted_at IS NULL);

-- ======================================================================
-- 4. sys_menu_api —— 菜单(含按钮)与 API 关联
--    列表/详情绑菜单,写操作绑对应按钮
-- ======================================================================

INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`)
SELECT m.menu_id, a.id FROM sys_api a JOIN (
  SELECT 2300 AS menu_id, 796 AS api_no UNION ALL
  SELECT 2300, 798 UNION ALL
  SELECT 2300, 801 UNION ALL
  SELECT 2300, 803 UNION ALL
  SELECT 2302, 797 UNION ALL
  SELECT 2302, 802 UNION ALL
  SELECT 2303, 799 UNION ALL
  SELECT 2303, 804 UNION ALL
  SELECT 2304, 800 UNION ALL
  SELECT 2304, 805 UNION ALL
  SELECT 2305, 806 UNION ALL
  SELECT 2301, 807 UNION ALL
  SELECT 2301, 809 UNION ALL
  SELECT 2301, 812 UNION ALL
  SELECT 2301, 814 UNION ALL
  SELECT 2306, 808 UNION ALL
  SELECT 2306, 813 UNION ALL
  SELECT 2307, 810 UNION ALL
  SELECT 2307, 815 UNION ALL
  SELECT 2308, 811 UNION ALL
  SELECT 2308, 816
) m ON a.id = m.api_no
WHERE a.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys_menu_api x WHERE x.sys_menu_id = m.menu_id AND x.sys_api_id = a.id
  );

-- ======================================================================
-- 5. casbin_rule —— p, 角色, 路径, 方法(与出差模块同角色集合)
--    角色:3销售(sale)/4销售经理(sales_manager)/5财务(finance)/6人事(hr)
--        /7采购(purchaser)/9销售总监(sales_director)/10普通员工(employee)
--    ⚠️ 直插后必须重启 qzt-server 才生效(enforcer 启动加载策略)。
-- ======================================================================

INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`)
SELECT 'p', r.code, x.path, x.method FROM sys_role r JOIN (
  SELECT '/oa/vehicles' AS path, 'GET' AS method UNION ALL
  SELECT '/oa/vehicles', 'POST' UNION ALL
  SELECT '/oa/vehicles/:id', 'GET' UNION ALL
  SELECT '/oa/vehicles/:id', 'PUT' UNION ALL
  SELECT '/oa/vehicles/:id', 'DELETE' UNION ALL
  SELECT '/oa/vehicle-applications', 'GET' UNION ALL
  SELECT '/oa/vehicle-applications', 'POST' UNION ALL
  SELECT '/oa/vehicle-applications/:id', 'GET' UNION ALL
  SELECT '/oa/vehicle-applications/:id', 'PUT' UNION ALL
  SELECT '/oa/vehicle-applications/:id', 'DELETE' UNION ALL
  SELECT '/oa/vehicle-applications/:id/return', 'POST' UNION ALL
  SELECT '/oa/seals', 'GET' UNION ALL
  SELECT '/oa/seals', 'POST' UNION ALL
  SELECT '/oa/seals/:id', 'GET' UNION ALL
  SELECT '/oa/seals/:id', 'PUT' UNION ALL
  SELECT '/oa/seals/:id', 'DELETE' UNION ALL
  SELECT '/oa/seal-applications', 'GET' UNION ALL
  SELECT '/oa/seal-applications', 'POST' UNION ALL
  SELECT '/oa/seal-applications/:id', 'GET' UNION ALL
  SELECT '/oa/seal-applications/:id', 'PUT' UNION ALL
  SELECT '/oa/seal-applications/:id', 'DELETE'
) x
WHERE r.code IN ('sale', 'sales_manager', 'finance', 'hr', 'purchaser', 'sales_director', 'employee')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM casbin_rule c
    WHERE c.ptype = 'p' AND c.v0 = r.code AND c.v1 = x.path AND c.v2 = x.method
      AND (c.v3 = '' OR c.v3 IS NULL) AND (c.v4 = '' OR c.v4 IS NULL) AND (c.v5 = '' OR c.v5 IS NULL)
  );

-- ======================================================================
-- 6. sys_role_menu —— 菜单 2300/2301 + 按钮 2302~2308
--    授权角色:1(super_admin) + 3/4/5/6/7/9/10(与出差模块同集合)
-- ======================================================================

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id BETWEEN 2300 AND 2308
WHERE r.id IN (1, 3, 4, 5, 6, 7, 9, 10)
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- ======================================================================
-- 7. OA 目录(id=800)授权 —— 子菜单授权必须连带父目录，否则菜单树成孤儿被丢弃
--    (角色 3/4/5/6/7/9/10；super_admin 走全量旁路无需授)
-- ======================================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, 800 FROM sys_role r
WHERE r.id IN (3, 4, 5, 6, 7, 9, 10) AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = 800);
