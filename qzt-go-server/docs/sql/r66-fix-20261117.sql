-- A. D3: demo.mode 行补种(幂等)
INSERT INTO sys_config (`group`, `key`, name, value, type, is_public, editable, builtin, sort, remark)
SELECT 'demo', 'demo.mode', '演示模式开关', '1', 'bool', 0, 1, 1, 0, '演示模式总开关(demoguard 依赖, 11-17 R66 修复补种)'
WHERE NOT EXISTS (SELECT 1 FROM sys_config WHERE `key` = 'demo.mode');
-- B. D1: P-F2 营销 API casbin（8 端点×3 角色，NOT EXISTS 阾重）
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT 'p', r.code, x.path, x.method
FROM sys_role r
JOIN (SELECT '/mall/admin/coupons' AS path, 'GET' AS method
      UNION ALL SELECT '/mall/admin/coupons', 'POST'
      UNION ALL SELECT '/mall/admin/coupons/:id', 'PUT'
      UNION ALL SELECT '/mall/admin/coupons/:id', 'DELETE'
      UNION ALL SELECT '/mall/admin/promotions', 'GET'
      UNION ALL SELECT '/mall/admin/promotions', 'POST'
      UNION ALL SELECT '/mall/admin/promotions/:id', 'PUT'
      UNION ALL SELECT '/mall/admin/promotions/:id', 'DELETE') AS x
WHERE r.code IN ('sales_director', 'sales_manager', 'demo')
  AND NOT EXISTS (
    SELECT 1 FROM casbin_rule c
    WHERE c.ptype='p' AND c.v0=r.code AND c.v1=x.path AND c.v2=x.method);
-- D. emp01 员工档补种(幂等) + D1 菜单父目录 1000 授 role4/role14
INSERT IGNORE INTO hrm_employee (id,emp_no,name,gender,department_id,position_id,user_id,entry_date,status,created_at,updated_at) VALUES
  (6,'EMP013','普通员工',1,6,10,13,'2025-06-01',1,NOW(3),NOW(3));

INSERT INTO sys_role_menu (sys_role_id, sys_menu_id)
SELECT x.role_id, x.menu_id
FROM (SELECT 4 AS role_id, 1000 AS menu_id
      UNION ALL SELECT 14, 1000) x
WHERE NOT EXISTS (
  SELECT 1 FROM sys_role_menu m
  WHERE m.sys_role_id=x.role_id AND m.sys_menu_id=x.menu_id);
