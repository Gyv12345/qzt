-- ============================================================================
-- rbac_role_sales_director.sql
-- 角色维度测试用例配套种子:新建「销售总监」「普通员工」两个测试角色 + 两个测试账号,
-- 并按菜单树授权(销售总监 = CRM 全模块含设置 + 审批中心 + 办公中心全 + 知识库 + 进销存;
-- 普通员工 = 审批三件套 + 工作日志/日程/站内信 + OA 各类申请)。
--
-- ID 分配区间(勿与既有数据冲突):
--   sys_role      9=销售总监(sales_director) 10=普通员工(employee)
--   sys_user     12=salesdir 13=emp01(密码均为 123456,哈希取自 zhangsan)
--
-- 执行方式:逐条单语句执行(DBX 每次只执行第一条);执行完必须重启 qzt-server
--   (casbin enforcer 启动时加载;运行期插入的规则不重启不生效)。
--   ⚠ casbin_rule 插入必须带 ptype='p',否则 gorm-adapter 启动 Preview panic、服务崩溃循环。
-- 回滚:文末 rollback 段。
-- ============================================================================

-- 1. 角色(幂等:先删后插固定 ID)
DELETE FROM sys_role WHERE id IN (9, 10);
INSERT INTO sys_role (id, name, code, data_scope, status, created_at, updated_at)
VALUES
  (9, '销售总监', 'sales_director', 4, 1, NOW(), NOW()),
  (10, '普通员工', 'employee', 5, 1, NOW(), NOW());

-- 2. 测试账号(密码 123456,与 zhangsan 同哈希)
DELETE FROM sys_user_role WHERE sys_user_id IN (12, 13);
DELETE FROM sys_user WHERE id IN (12, 13);
INSERT INTO sys_user (id, username, password, nickname, dept_id, status, token_version, created_at, updated_at)
VALUES
  (12, 'salesdir', '$2a$10$aoTWLnvgUFlpJDFPYAowEeAXfoCnIbpI5uLcZp8ZnmjWY2f9MBElq', '销售总监测试', 5, 1, 0, NOW(), NOW()),
  (13, 'emp01',    '$2a$10$aoTWLnvgUFlpJDFPYAowEeAXfoCnIbpI5uLcZp8ZnmjWY2f9MBElq', '普通员工测试', 6, 1, 0, NOW(), NOW());
INSERT INTO sys_user_role (sys_user_id, sys_role_id) VALUES (12, 9), (13, 10);

-- 3a. 销售总监菜单授权:CRM(73)/审批(131)/知识库(740)/办公(800)/进销存(170) 五棵子树全量(目录+页面+按钮)
DELETE FROM sys_role_menu WHERE sys_role_id = 9;
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id)
SELECT 9, id FROM (
  WITH RECURSIVE tree AS (
    SELECT id FROM sys_menu WHERE id IN (73, 131, 740, 800, 170) AND deleted_at IS NULL
    UNION ALL
    SELECT m.id FROM sys_menu m JOIN tree t ON m.parent_id = t.id
    WHERE m.deleted_at IS NULL AND m.status = 1
  )
  SELECT id FROM tree
) x;

-- 3b. 普通员工菜单授权:页面 = 审批三件套(132/135/136) + 工作日志(830) + 日程(835) + 站内信(143)
--     + OA 申请五页(801/810/820/850/865);含各自父级链与按钮子孙
DELETE FROM sys_role_menu WHERE sys_role_id = 10;
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id)
SELECT 10, id FROM (
  WITH RECURSIVE grp AS (
    SELECT id, parent_id FROM sys_menu
    WHERE id IN (132, 135, 136, 830, 835, 143, 801, 810, 820, 850, 865) AND deleted_at IS NULL
    UNION ALL
    SELECT m.id, m.parent_id FROM sys_menu m JOIN grp g ON m.id = g.parent_id WHERE m.deleted_at IS NULL
  ),
  up AS (SELECT id FROM grp),
  down AS (
    SELECT id FROM sys_menu WHERE id IN (132, 135, 136, 830, 835, 143, 801, 810, 820, 850, 865)
    UNION ALL
    SELECT m.id FROM sys_menu m JOIN down d ON m.parent_id = d.id
    WHERE m.deleted_at IS NULL AND m.status = 1
  )
  SELECT DISTINCT id FROM (SELECT id FROM up UNION SELECT id FROM down) s
) x;

-- 4a. 销售总监 casbin 策略:按授权菜单经 sys_menu_api 关联生成(与 SetMenus 重建等价)
--     ⚠ ptype 必须为 'p':gorm-adapter 启动加载时空 ptype 会 Preview panic 导致服务起不来
DELETE FROM casbin_rule WHERE v0 IN ('sales_director', 'employee');
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT DISTINCT 'p', 'sales_director', a.path, a.method
FROM sys_role_menu rm
JOIN sys_menu_api ma ON ma.sys_menu_id = rm.sys_menu_id
JOIN sys_api a ON a.id = ma.sys_api_id AND a.deleted_at IS NULL
WHERE rm.sys_role_id = 9;

-- 4b. 工作台(非菜单驱动):沿用销售经理的 dashboard 规则
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT DISTINCT 'p', 'sales_director', v1, v2 FROM casbin_rule
WHERE v0 = 'sales_manager' AND v1 LIKE '/api/dashboard%';

-- 4c. 普通员工 casbin 策略
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT DISTINCT 'p', 'employee', a.path, a.method
FROM sys_role_menu rm
JOIN sys_menu_api ma ON ma.sys_menu_id = rm.sys_menu_id
JOIN sys_api a ON a.id = ma.sys_api_id AND a.deleted_at IS NULL
WHERE rm.sys_role_id = 10;
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT DISTINCT 'p', 'employee', v1, v2 FROM casbin_rule
WHERE v0 = 'sales_manager' AND v1 LIKE '/api/dashboard%';

-- ============================================================================
-- 5. 授权链补全(存量缺口,惠及所有角色):
--    OA 申请类/日程/会议/表单 + KB 文档分类 + 请假 接口是 Casbin 保护,
--    但从未注册 sys_api/未挂 sys_menu_api —— 非超管角色授权对应菜单后仍 403。
--    此处注册接口(ID 453-501,不含 mark-paid/mark-repaid/请假直接审批等管理动作,
--    那些走审批中心)并挂到对应菜单;随后 6) 重建两角色 casbin 自动带上。
-- ============================================================================
DELETE FROM sys_menu_api WHERE sys_menu_id IN (741, 745, 801, 810, 820, 830, 835, 840, 845, 860, 865, 850)
  AND sys_api_id IN (SELECT id FROM sys_api WHERE id BETWEEN 453 AND 501);
DELETE FROM sys_api WHERE id BETWEEN 453 AND 501;

INSERT INTO sys_api (id, path, method, `group`, description, created_at, updated_at) VALUES
-- 报销 /oa/expenses
(453, '/oa/expenses', 'GET', '办公', '报销单列表', NOW(), NOW()),
(454, '/oa/expenses', 'POST', '办公', '创建报销单', NOW(), NOW()),
(455, '/oa/expenses/:id', 'GET', '办公', '报销单详情', NOW(), NOW()),
(456, '/oa/expenses/:id', 'PUT', '办公', '更新报销单', NOW(), NOW()),
(457, '/oa/expenses/:id', 'DELETE', '办公', '删除报销单', NOW(), NOW()),
-- 出差 /oa/trips
(458, '/oa/trips', 'GET', '办公', '出差申请列表', NOW(), NOW()),
(459, '/oa/trips', 'POST', '办公', '创建出差申请', NOW(), NOW()),
(460, '/oa/trips/:id', 'GET', '办公', '出差申请详情', NOW(), NOW()),
(461, '/oa/trips/:id', 'PUT', '办公', '更新出差申请', NOW(), NOW()),
(462, '/oa/trips/:id', 'DELETE', '办公', '删除出差申请', NOW(), NOW()),
-- 借款 /oa/loans
(463, '/oa/loans', 'GET', '办公', '借款单列表', NOW(), NOW()),
(464, '/oa/loans', 'POST', '办公', '创建借款单', NOW(), NOW()),
(465, '/oa/loans/:id', 'GET', '办公', '借款单详情', NOW(), NOW()),
(466, '/oa/loans/:id', 'PUT', '办公', '更新借款单', NOW(), NOW()),
(467, '/oa/loans/:id', 'DELETE', '办公', '删除借款单', NOW(), NOW()),
-- 工作日志 /oa/work-logs
(468, '/oa/work-logs', 'GET', '办公', '工作日志列表', NOW(), NOW()),
(469, '/oa/work-logs', 'POST', '办公', '创建工作日志', NOW(), NOW()),
(470, '/oa/work-logs/:id', 'GET', '办公', '工作日志详情', NOW(), NOW()),
(471, '/oa/work-logs/:id', 'PUT', '办公', '更新工作日志', NOW(), NOW()),
(472, '/oa/work-logs/:id', 'DELETE', '办公', '删除工作日志', NOW(), NOW()),
-- 日程 /oa/schedules
(473, '/oa/schedules', 'GET', '办公', '日程列表', NOW(), NOW()),
(474, '/oa/schedules/calendar', 'GET', '办公', '日程日历视图', NOW(), NOW()),
(475, '/oa/schedules', 'POST', '办公', '创建日程', NOW(), NOW()),
(476, '/oa/schedules/:id', 'GET', '办公', '日程详情', NOW(), NOW()),
(477, '/oa/schedules/:id', 'PUT', '办公', '更新日程', NOW(), NOW()),
(478, '/oa/schedules/:id', 'DELETE', '办公', '删除日程', NOW(), NOW()),
-- 会议室 /oa/meeting-rooms
(479, '/oa/meeting-rooms', 'GET', '办公', '会议室列表', NOW(), NOW()),
(480, '/oa/meeting-rooms', 'POST', '办公', '创建会议室', NOW(), NOW()),
(481, '/oa/meeting-rooms/:id', 'GET', '办公', '会议室详情', NOW(), NOW()),
(482, '/oa/meeting-rooms/:id', 'PUT', '办公', '更新会议室', NOW(), NOW()),
(483, '/oa/meeting-rooms/:id', 'DELETE', '办公', '删除会议室', NOW(), NOW()),
-- 会议预订 /oa/meeting-bookings
(484, '/oa/meeting-bookings', 'GET', '办公', '会议预订列表', NOW(), NOW()),
(485, '/oa/meeting-bookings', 'POST', '办公', '创建会议预订', NOW(), NOW()),
(486, '/oa/meeting-bookings/:id', 'GET', '办公', '会议预订详情', NOW(), NOW()),
(487, '/oa/meeting-bookings/:id', 'PUT', '办公', '更新会议预订', NOW(), NOW()),
(488, '/oa/meeting-bookings/:id', 'DELETE', '办公', '删除会议预订', NOW(), NOW()),
-- 表单模板 /oa/forms
(489, '/oa/forms', 'GET', '办公', '表单模板列表', NOW(), NOW()),
(490, '/oa/forms', 'POST', '办公', '创建表单模板', NOW(), NOW()),
(491, '/oa/forms/:id', 'GET', '办公', '表单模板详情', NOW(), NOW()),
(492, '/oa/forms/:id', 'PUT', '办公', '更新表单模板', NOW(), NOW()),
(493, '/oa/forms/:id/toggle', 'PUT', '办公', '表单模板启停', NOW(), NOW()),
(494, '/oa/forms/:id', 'DELETE', '办公', '删除表单模板', NOW(), NOW()),
-- 表单数据 /oa/form-data
(495, '/oa/form-data', 'GET', '办公', '表单数据列表', NOW(), NOW()),
(496, '/oa/form-data', 'POST', '办公', '提交表单数据', NOW(), NOW()),
(497, '/oa/form-data/:id', 'GET', '办公', '表单数据详情', NOW(), NOW()),
(498, '/oa/form-data/:id', 'PUT', '办公', '更新表单数据', NOW(), NOW()),
(499, '/oa/form-data/:id', 'DELETE', '办公', '删除表单数据', NOW(), NOW()),
-- 请假(hrm 模块,挂在 OA 请假管理菜单下)
(500, '/hrm/attendance/leaves', 'GET', '办公', '请假单列表', NOW(), NOW()),
(501, '/hrm/attendance/leaves', 'POST', '办公', '提交请假申请', NOW(), NOW());

-- 菜单↔接口关联(KB 用既有 sys_api,按 path 匹配;OA/请假用上面新注册的)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 741, id FROM sys_api WHERE path LIKE '/kb/documents%' AND deleted_at IS NULL
UNION ALL SELECT 745, id FROM sys_api WHERE path LIKE '/kb/categories%' AND deleted_at IS NULL
UNION ALL SELECT 801, id FROM sys_api WHERE id BETWEEN 453 AND 457
UNION ALL SELECT 810, id FROM sys_api WHERE id BETWEEN 458 AND 462
UNION ALL SELECT 820, id FROM sys_api WHERE id BETWEEN 463 AND 467
UNION ALL SELECT 830, id FROM sys_api WHERE id BETWEEN 468 AND 472
UNION ALL SELECT 835, id FROM sys_api WHERE id BETWEEN 473 AND 478
UNION ALL SELECT 840, id FROM sys_api WHERE id BETWEEN 479 AND 483
UNION ALL SELECT 845, id FROM sys_api WHERE id BETWEEN 484 AND 488
UNION ALL SELECT 860, id FROM sys_api WHERE id BETWEEN 489 AND 494
UNION ALL SELECT 865, id FROM sys_api WHERE id BETWEEN 495 AND 499
UNION ALL SELECT 850, id FROM sys_api WHERE id BETWEEN 500 AND 501;

-- ============================================================================
-- 6. 重建两角色 casbin(在 5) 补全关联之后执行;与 4) 相同语句,带上新关联的接口)
-- ============================================================================
DELETE FROM casbin_rule WHERE v0 IN ('sales_director', 'employee');
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT DISTINCT 'p', 'sales_director', a.path, a.method
FROM sys_role_menu rm
JOIN sys_menu_api ma ON ma.sys_menu_id = rm.sys_menu_id
JOIN sys_api a ON a.id = ma.sys_api_id AND a.deleted_at IS NULL
WHERE rm.sys_role_id = 9;
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT DISTINCT 'p', 'sales_director', v1, v2 FROM casbin_rule
WHERE v0 = 'sales_manager' AND v1 LIKE '/api/dashboard%';
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT DISTINCT 'p', 'employee', a.path, a.method
FROM sys_role_menu rm
JOIN sys_menu_api ma ON ma.sys_menu_id = rm.sys_menu_id
JOIN sys_api a ON a.id = ma.sys_api_id AND a.deleted_at IS NULL
WHERE rm.sys_role_id = 10;
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT DISTINCT 'p', 'employee', v1, v2 FROM casbin_rule
WHERE v0 = 'sales_manager' AND v1 LIKE '/api/dashboard%';

-- ============================================================================
-- rollback(全部):
-- DELETE FROM casbin_rule WHERE v0 IN ('sales_director','employee');
-- DELETE FROM sys_role_menu WHERE sys_role_id IN (9,10);
-- DELETE FROM sys_user_role WHERE sys_user_id IN (12,13);
-- DELETE FROM sys_user WHERE id IN (12,13);
-- DELETE FROM sys_role WHERE id IN (9,10);
-- DELETE FROM sys_menu_api WHERE sys_api_id BETWEEN 453 AND 501
--   OR (sys_menu_id IN (741,745) AND sys_api_id IN (SELECT id FROM sys_api WHERE path LIKE '/kb/%'));
-- DELETE FROM sys_api WHERE id BETWEEN 453 AND 501;
-- (回滚后同样需重启 qzt-server 使 enforcer 重载)
-- ============================================================================
