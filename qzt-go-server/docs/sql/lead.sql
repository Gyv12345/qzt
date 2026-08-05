-- ============================================================
-- lead.sql — CRM 线索(Lead) + 线索公海池 + 字典 + 权限种子
-- ------------------------------------------------------------
-- 作用:
--   1. 建 5 张业务表(crm_lead / crm_lead_pool / crm_lead_pool_pick_rule
--      / crm_lead_pool_recycle_rule / crm_lead_owner_history)
--   2. 线索相关字典(LEAD_STATUS / LEAD_SOURCE / LEAD_LEVEL / LEAD_POOL_REASON)
--   3. sys_api(操作日志元数据 + Casbin obj)
--   4. sys_menu(CRM 目录下新增「线索」分组 → 线索管理 + 线索池菜单 + 按钮权限)
--   5. sys_menu_api 关联 + 授权给 super_admin
--
-- 遵循工作区 AGENTS.md「种子数据与建表」约定:业务建表 DDL + 种子一律走 SQL,
-- Go 代码不登记到 allModels()(AutoMigrate 仅管系统表)。
--
-- 幂等:CREATE TABLE IF NOT EXISTS + 固定 ID 区间先 DELETE 再 INSERT,可重复执行。
--
-- 执行方式(用户手动):
--   mysql -h <host> -P 3306 -u <user> -p qztgo < docs/sql/lead.sql
-- 或 DBX 逐段运行。
--
-- ID 分配(避开现有数据,当前 max(api)=308, max(menu)=323, max(dict)=23):
--   sys_api  : 350~373 (线索 17 + 线索池 7 = 24 个接口)
--   sys_menu : 350 线索分组目录; 351/352 两个菜单; 360~375 按钮节点
--   sys_dict : 按 code 幂等(LEAD_*)
-- ============================================================

-- ============================================================
-- 1. 建表 DDL(镜像 crm_customer / crm_customer_pool 体系)
-- ============================================================

-- 线索主表
CREATE TABLE IF NOT EXISTS `crm_lead` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '线索名称',
  `lead_no` varchar(64) DEFAULT NULL COMMENT '线索编号',
  `contact_name` varchar(255) DEFAULT NULL COMMENT '联系人姓名',
  `phone` varchar(30) DEFAULT NULL COMMENT '电话',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `company` varchar(255) DEFAULT NULL COMMENT '公司',
  `level` varchar(32) DEFAULT NULL COMMENT '线索级别(字典LEAD_LEVEL)',
  `source` varchar(32) DEFAULT NULL COMMENT '线索来源(字典LEAD_SOURCE)',
  `status` tinyint DEFAULT 1 COMMENT '1新建 2跟进中 3已转化 4无效',
  `industry` varchar(64) DEFAULT NULL COMMENT '行业(字典INDUSTRY)',
  `owner_id` bigint unsigned DEFAULT NULL COMMENT '负责人ID(公海时NULL)',
  `follower_id` bigint unsigned DEFAULT NULL COMMENT '最新跟进人ID',
  `follow_time` datetime DEFAULT NULL COMMENT '最新跟进时间',
  `in_pool` tinyint DEFAULT 0 COMMENT '0私海 1公海',
  `pool_id` bigint unsigned DEFAULT NULL COMMENT '线索公海ID',
  `collection_time` datetime DEFAULT NULL COMMENT '领取时间',
  `pool_reason` varchar(64) DEFAULT NULL COMMENT '进公海原因',
  `converted_customer_id` bigint unsigned DEFAULT NULL COMMENT '转化后的客户ID',
  `converted_at` datetime DEFAULT NULL COMMENT '转化时间',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lead_lead_level` (`level`),
  KEY `idx_lead_industry` (`industry`),
  KEY `idx_lead_owner` (`owner_id`),
  KEY `idx_lead_pool` (`in_pool`,`pool_id`),
  KEY `idx_lead_converted_customer_id` (`converted_customer_id`),
  KEY `idx_crm_lead_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CRM 线索';

-- 线索公海池配置
CREATE TABLE IF NOT EXISTS `crm_lead_pool` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '公海名称',
  `scope_dept_ids` text COMMENT '可见部门ID集合(JSON数组)',
  `scope_role_ids` text COMMENT '可见角色ID集合(JSON数组)',
  `admin_user_ids` text COMMENT '管理员用户ID集合(JSON数组)',
  `enabled` tinyint DEFAULT NULL COMMENT '1启用 0禁用',
  `auto_recycle` tinyint DEFAULT NULL COMMENT '1开启自动回收 0关闭',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_crm_lead_pool_enabled` (`enabled`),
  KEY `idx_crm_lead_pool_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CRM 线索公海池';

-- 线索领取规则(1:1,pool_id 主键)
CREATE TABLE IF NOT EXISTS `crm_lead_pool_pick_rule` (
  `pool_id` bigint unsigned NOT NULL,
  `limit_daily` tinyint DEFAULT 0 COMMENT '1限制每日领取数',
  `daily_limit` bigint DEFAULT 0 COMMENT '每日领取上限',
  `limit_prev_owner` tinyint DEFAULT 0 COMMENT '1限制前归属人领取',
  `prev_owner_interval` bigint DEFAULT 0 COMMENT '前归属人重新领取间隔天数',
  `limit_new_data` tinyint DEFAULT 0 COMMENT '1限制新数据冷却期',
  `new_data_interval` bigint DEFAULT 0 COMMENT '新数据冷却天数',
  PRIMARY KEY (`pool_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CRM 线索领取规则';

-- 线索回收规则(1:1,pool_id 主键;conditions 为 JSON 数组,复用 RecycleCondition)
CREATE TABLE IF NOT EXISTS `crm_lead_pool_recycle_rule` (
  `pool_id` bigint unsigned NOT NULL,
  `operator` varchar(3) DEFAULT 'AND' COMMENT '多条件组合 AND/OR',
  `conditions` text COMMENT '回收条件JSON数组',
  PRIMARY KEY (`pool_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CRM 线索回收规则';

-- 线索归属变更历史(追加写,不软删除)
CREATE TABLE IF NOT EXISTS `crm_lead_owner_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` bigint unsigned NOT NULL COMMENT '线索ID',
  `owner_id` bigint unsigned DEFAULT NULL COMMENT '当时的负责人(进公海时NULL)',
  `action` varchar(20) NOT NULL COMMENT 'TAKE/RELEASE/TRANSFER/RECYCLE',
  `operator_id` bigint unsigned NOT NULL COMMENT '操作人',
  `reason` varchar(100) DEFAULT NULL COMMENT '原因',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_crm_lead_owner_history_lead_id` (`lead_id`),
  KEY `idx_crm_lead_owner_history_owner_id` (`owner_id`),
  KEY `idx_crm_lead_owner_history_action` (`action`),
  KEY `idx_crm_lead_owner_history_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CRM 线索归属历史';

-- ============================================================
-- 2. 字典(幂等:按 code 跳过)
-- ============================================================

-- LEAD_STATUS
INSERT INTO `sys_dict` (`name`, `code`, `status`, `remark`)
SELECT '线索状态', 'LEAD_STATUS', 1, '线索流转状态'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE code='LEAD_STATUS');
SET @did = (SELECT id FROM sys_dict WHERE code='LEAD_STATUS');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did, '新建', '1', 1, 1, '' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='1');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did, '跟进中', '2', 2, 1, '' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='2');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did, '已转化', '3', 3, 1, '' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='3');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did, '无效', '4', 4, 1, '' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='4');

-- LEAD_SOURCE
INSERT INTO `sys_dict` (`name`, `code`, `status`, `remark`)
SELECT '线索来源', 'LEAD_SOURCE', 1, '线索来源渠道'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE code='LEAD_SOURCE');
SET @did = (SELECT id FROM sys_dict WHERE code='LEAD_SOURCE');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'主动开发','1',1,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='1');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'客户介绍','2',2,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='2');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'营销活动','3',3,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='3');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'网络推广','4',4,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='4');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'其他','99',99,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='99');

-- LEAD_LEVEL
INSERT INTO `sys_dict` (`name`, `code`, `status`, `remark`)
SELECT '线索级别', 'LEAD_LEVEL', 1, '线索级别 A/B/C'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE code='LEAD_LEVEL');
SET @did = (SELECT id FROM sys_dict WHERE code='LEAD_LEVEL');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'高','A',1,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='A');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'中','B',2,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='B');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'低','C',3,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='C');

-- LEAD_POOL_REASON
INSERT INTO `sys_dict` (`name`, `code`, `status`, `remark`)
SELECT '线索公海原因', 'LEAD_POOL_REASON', 1, '线索进入公海的原因'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE code='LEAD_POOL_REASON');
SET @did = (SELECT id FROM sys_dict WHERE code='LEAD_POOL_REASON');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'主动放弃','GIVE_UP',1,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='GIVE_UP');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'联系不上','UNREACHABLE',2,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='UNREACHABLE');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'需求不匹配','NO_DEMAND',3,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='NO_DEMAND');
INSERT INTO `sys_dict_item` (`dict_id`, `label`, `value`, `sort`, `status`, `remark`)
SELECT @did,'自动回收','AUTO_RECYCLE',99,1,'' FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE dict_id=@did AND value='AUTO_RECYCLE');

-- ============================================================
-- 3. sys_api —— 线索 + 线索公海接口(path 与 Casbin obj 一致)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 350 AND 379;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 350 AND 379;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 350 AND 379;
DELETE FROM `sys_api` WHERE `id` BETWEEN 350 AND 379;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  -- 线索管理 (350-358)
  (350, '/crm/leads',              'GET',    '线索管理', '线索列表',   NOW(3), NOW(3)),
  (351, '/crm/leads',              'POST',   '线索管理', '创建线索',   NOW(3), NOW(3)),
  (352, '/crm/leads/:id',          'GET',    '线索管理', '线索详情',   NOW(3), NOW(3)),
  (353, '/crm/leads/:id',          'PUT',    '线索管理', '更新线索',   NOW(3), NOW(3)),
  (354, '/crm/leads/:id',          'DELETE', '线索管理', '删除线索',   NOW(3), NOW(3)),
  (355, '/crm/leads/:id/release',  'POST',   '线索管理', '释放到公海', NOW(3), NOW(3)),
  (356, '/crm/leads/:id/pick',     'POST',   '线索管理', '从公海领取', NOW(3), NOW(3)),
  (357, '/crm/leads/:id/transfer', 'POST',   '线索管理', '转移线索',   NOW(3), NOW(3)),
  (358, '/crm/leads/:id/convert',  'POST',   '线索管理', '转化为客户', NOW(3), NOW(3)),
  -- 线索公海池 (359-365)
  (359, '/crm/lead-pools',              'GET',    '线索公海', '线索池列表',   NOW(3), NOW(3)),
  (360, '/crm/lead-pools',              'POST',   '线索公海', '创建线索池',   NOW(3), NOW(3)),
  (361, '/crm/lead-pools/:id',          'GET',    '线索公海', '线索池详情',   NOW(3), NOW(3)),
  (362, '/crm/lead-pools/:id',          'PUT',    '线索公海', '更新线索池',   NOW(3), NOW(3)),
  (363, '/crm/lead-pools/:id',          'DELETE', '线索公海', '删除线索池',   NOW(3), NOW(3)),
  (364, '/crm/lead-pools/:id/pick-rule',    'PUT',  '线索公海', '设置领取规则', NOW(3), NOW(3)),
  (365, '/crm/lead-pools/:id/recycle-rule', 'PUT',  '线索公海', '设置回收规则', NOW(3), NOW(3)),
  (366, '/crm/lead-pools/:id/recycle', 'POST',     '线索公海', '手动回收',     NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu —— CRM 目录(73)下新增「线索」分组
-- ============================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  -- 线索分组目录(挂在 CRM 目录 73 下,与「客户」分组 128 同级)
  (350, 73, '线索', '', NULL, NULL, 0, 0, '', 1, 1, NOW(3), NOW(3)),

  -- 线索管理菜单
  (351, 350, '线索管理', '/crm/lead', 'crm/lead/index', 'SolutionOutlined', 1, 1, 'crm:lead:list', 1, 1, NOW(3), NOW(3)),
  -- 线索管理按钮
  (360, 351, '新增线索', NULL, NULL, NULL, 1, 2, 'crm:lead:add',      1, 1, NOW(3), NOW(3)),
  (361, 351, '编辑线索', NULL, NULL, NULL, 2, 2, 'crm:lead:edit',     1, 1, NOW(3), NOW(3)),
  (362, 351, '删除线索', NULL, NULL, NULL, 3, 2, 'crm:lead:delete',   1, 1, NOW(3), NOW(3)),
  (363, 351, '领取线索', NULL, NULL, NULL, 4, 2, 'crm:lead:pick',     1, 1, NOW(3), NOW(3)),
  (364, 351, '释放线索', NULL, NULL, NULL, 5, 2, 'crm:lead:release',  1, 1, NOW(3), NOW(3)),
  (365, 351, '转移线索', NULL, NULL, NULL, 6, 2, 'crm:lead:transfer', 1, 1, NOW(3), NOW(3)),
  (366, 351, '转化为客户', NULL, NULL, NULL, 7, 2, 'crm:lead:convert', 1, 1, NOW(3), NOW(3)),

  -- 线索池菜单
  (352, 350, '线索池', '/crm/lead-pool', 'crm/lead-pool/index', 'DatabaseOutlined', 2, 1, 'crm:lead-pool:list', 1, 1, NOW(3), NOW(3)),
  -- 线索池按钮
  (370, 352, '新增线索池', NULL, NULL, NULL, 1, 2, 'crm:lead-pool:add',      1, 1, NOW(3), NOW(3)),
  (371, 352, '编辑线索池', NULL, NULL, NULL, 2, 2, 'crm:lead-pool:edit',     1, 1, NOW(3), NOW(3)),
  (372, 352, '删除线索池', NULL, NULL, NULL, 3, 2, 'crm:lead-pool:delete',   1, 1, NOW(3), NOW(3)),
  (373, 352, '手动回收',   NULL, NULL, NULL, 4, 2, 'crm:lead-pool:recycle',  1, 1, NOW(3), NOW(3));

-- ============================================================
-- 5. sys_menu_api —— 菜单(含按钮)与 API 关联
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  -- 线索管理
  (351, 350),  -- list 菜单 → GET /crm/leads
  (351, 352),  -- list 菜单 → GET /crm/leads/:id (详情)
  (360, 351),  -- 新增线索 → POST /crm/leads
  (361, 353),  -- 编辑线索 → PUT /crm/leads/:id
  (362, 354),  -- 删除线索 → DELETE /crm/leads/:id
  (363, 356),  -- 领取线索 → POST /crm/leads/:id/pick
  (364, 355),  -- 释放线索 → POST /crm/leads/:id/release
  (365, 357),  -- 转移线索 → POST /crm/leads/:id/transfer
  (366, 358),  -- 转化为客户 → POST /crm/leads/:id/convert
  -- 线索池
  (352, 359),  -- list 菜单 → GET /crm/lead-pools
  (352, 361),  -- list 菜单 → GET /crm/lead-pools/:id
  (370, 360),  -- 新增线索池 → POST /crm/lead-pools
  (371, 362),  -- 编辑线索池 → PUT /crm/lead-pools/:id
  (371, 364),  -- 编辑线索池 → PUT 领取规则
  (371, 365),  -- 编辑线索池 → PUT 回收规则
  (372, 363),  -- 删除线索池 → DELETE /crm/lead-pools/:id
  (373, 366);  -- 手动回收 → POST /crm/lead-pools/:id/recycle

-- ============================================================
-- 6. 授权给超级管理员(使其立即可见)
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id BETWEEN 350 AND 373
WHERE r.code = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );
