-- ============================================================
-- demo_hrm_seed.sql —— EP04 HRM 演示集(行简功能课堂系列,2026-11-16)
--
-- 用途: 人事模块演示数据(岗位/员工) + sale/demo 角色 HRM 浏览授权
--       + hr 角色薪酬排班页授权。幂等(INSERT IGNORE+定点 DELETE),
--       随基线重放自动恢复。**本文件内容已 append 到服务器
--       /opt/qzt-server/bin/demo_baseline.sql 尾部**(与 R65 的 OA
--       授权固化段并存,append-only 勿整文件覆盖)。
-- 依赖: sys_user 3=zhangsan/5=wangwu/7=sunqi;
--       部门 5 销售部/6 销售一组/8 人事部/2 研发部/3 市场部。
-- 执行: DBX 逐条执行或 mysql 直灌;重放基线时自动生效。
-- ============================================================

-- ── 定点清理(固定 ID 区间,不碰真实数据) ──
DELETE FROM hrm_employee WHERE id BETWEEN 1 AND 6;
DELETE FROM hrm_position WHERE id BETWEEN 10 AND 13;
DELETE FROM hrm_department WHERE id IN (9,10) AND name IN ('走查测试部-改','1');

-- ── 岗位 ×4(固定 ID 10~13) ──
INSERT IGNORE INTO hrm_position (id,code,name,department_id,created_at,updated_at) VALUES
  (10,'SALES_REP','销售代表',6,NOW(3),NOW(3)),
  (11,'SALES_DIR','销售总监',5,NOW(3),NOW(3)),
  (12,'HR_SPEC','人事专员',8,NOW(3),NOW(3)),
  (13,'DEV','研发工程师',2,NOW(3),NOW(3));

-- ── 员工 ×5(3 个关联系统用户 zhangsan/wangwu/sunqi + 2 个静态档案) ──
INSERT IGNORE INTO hrm_employee (id,emp_no,name,gender,department_id,position_id,user_id,entry_date,status,created_at,updated_at) VALUES
  (1,'EMP001','张三',1,6,10,3,'2025-03-01',1,NOW(3),NOW(3)),
  (2,'EMP002','王五',1,5,10,5,'2024-06-01',1,NOW(3),NOW(3)),
  (3,'EMP003','孙七',1,8,12,7,'2024-01-15',1,NOW(3),NOW(3)),
  (4,'EMP004','李四',1,2,13,NULL,'2025-08-01',1,NOW(3),NOW(3)),
  (5,'EMP005','赵六',2,3,10,NULL,'2025-05-20',1,NOW(3),NOW(3)),
  (6,'EMP013','普通员工',1,6,10,13,'2025-06-01',1,NOW(3),NOW(3));

-- ── 授权:demo 角色(zhangsan) HRM 自助+浏览 / hr 角色(sunqi) 薪酬排班页 ──
INSERT IGNORE INTO sys_role_menu (sys_role_id,sys_menu_id) VALUES
  (14,157),(14,873),(14,158),(14,166),(14,874),(14,880),(14,850),(14,870),
  (6,874),(6,2252),(6,2256);
INSERT IGNORE INTO casbin_rule (ptype,v0,v1,v2) VALUES
  ('p','demo','/hrm/departments','GET'),
  ('p','demo','/hrm/employees','GET'),
  ('p','sale','/hrm/departments','GET'),
  ('p','sale','/hrm/employees','GET');

-- ── EP04 补充(2026-11-16 下午,录制期实证缺授权):新增职位按钮菜单 2380 +
--    hr 角色新建考核 931 + demo 角色新增请假 851 + demo 请假 API casbin ──
INSERT IGNORE INTO sys_menu (id,name,parent_id,type,permission,sort,visible,status,created_at,updated_at)
  SELECT 2380,'新增职位',881,2,'hrm:recruitment:add',1,1,1,NOW(3),NOW(3)
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id=2380);
INSERT IGNORE INTO sys_role_menu (sys_role_id,sys_menu_id) VALUES (6,2380),(6,931),(14,851);
INSERT IGNORE INTO casbin_rule (ptype,v0,v1,v2) VALUES
  ('p','demo','/hrm/attendance/leaves','GET'),
  ('p','demo','/hrm/attendance/leaves','POST');
