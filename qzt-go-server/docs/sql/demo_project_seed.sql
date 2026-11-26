-- ============================================================
-- EP07 项目与甘特图 演示种子 + salesdir 资产盘点权限固化
-- 2026-11-17 | 幂等:固定 id 区间(项目7001/任务7101-7106/资产7301-7304)
-- 执行方式:DBX MCP 或 mysql 客户端;已同步服务器 demo_baseline.sql 尾部
-- 内容:
--   1. 软删 QA 遗留测试项目(proj_project id 8,9)
--   2. DEMO 项目 7001「智慧仓储平台一期」(客户232苏州精工,经理 salesdir=12)
--   3. DEMO 任务 7101-7106(含里程碑 7106,甘特图 Month 视图数据)
--   4. DEMO 资产 7301-7304(盘点+折旧画面)
--   5. salesdir(role 9)补资产盘点+折旧权限:sys_role_menu 2369-2373
--      + casbin p 行(sys_api 885-891 七条)
-- ============================================================

-- 1. QA 遗留测试项目软删(可恢复)
UPDATE proj_project SET deleted_at = NOW() WHERE id IN (8, 9) AND deleted_at IS NULL;

-- 2. DEMO 项目
DELETE FROM proj_project WHERE id = 7001;
INSERT INTO proj_project (id, project_no, name, description, customer_id, customer_name, contract_id, manager_id, member_ids, status, priority, start_date, end_date, progress, tags, created_at, updated_at)
VALUES (7001, 'XMDEMO7001', 'DEMO-智慧仓储平台一期', '为苏州精工建设仓储管理系统一期:入库/出库/库存/PDA 联调', 232, 'DEMO-苏州精工科技有限公司(测试)', NULL, 12, '3,5,6', 2, 3, '2026-11-01', '2026-12-15', 35, '一期,仓储', NOW(), NOW());

-- 3. DEMO 任务(状态:1待办 2进行 3完成;7106 里程碑单日=甘特菱形)
DELETE FROM proj_task WHERE project_id = 7001;
INSERT INTO proj_task (id, project_id, title, description, assignee_id, status, priority, sort_order, due_date, done_at, start_date, progress, is_milestone, created_at, updated_at) VALUES
(7101, 7001, '需求评审与范围确认', '与客户确认一期范围:入库/出库/库存三模块', 3, 3, 2, 1, '2026-11-05', NOW(), '2026-11-01', 100, 0, NOW(), NOW()),
(7102, 7001, '仓储布局原型设计', '库区/库位/通道布局原型与评审', 5, 2, 2, 2, '2026-11-14', NULL, '2026-11-05', 60, 0, NOW(), NOW()),
(7103, 7001, 'WMS 核心模块开发', '入库单/出库单/库存台账核心服务开发', 3, 2, 3, 3, '2026-11-25', NULL, '2026-11-10', 30, 0, NOW(), NOW()),
(7104, 7001, 'PDA 联调测试', '扫码枪与 WMS 接口联调测试', 6, 1, 2, 4, '2026-11-30', NULL, '2026-11-20', 0, 0, NOW(), NOW()),
(7105, 7001, '客户 UAT 验收', '客户现场 UAT 验收与问题修复', 5, 1, 2, 5, '2026-12-10', NULL, '2026-12-01', 0, 0, NOW(), NOW()),
(7106, 7001, '一期上线验收里程碑', '一期整体上线验收', 12, 1, 3, 6, '2026-12-15', NULL, '2026-12-15', 0, 1, NOW(), NOW());

-- 4. DEMO 资产(折旧=0 净值=原值,录制时手动计提折旧看变化)
DELETE FROM psi_asset WHERE id BETWEEN 7301 AND 7304;
INSERT INTO psi_asset (id, asset_no, name, category, spec, serial_no, dept_id, owner_id, purchase_date, purchase_price, depreciation, net_value, useful_life, status, location, created_at, updated_at) VALUES
(7301, 'ZC20261117001', 'ThinkPad X1 Carbon', '电脑', 'i7/32G/1T', 'PF-3XK7Q21', 5, 3, '2025-06-10', '8500', '0', '8500', 36, 1, '销售部-工位B', NOW(), NOW()),
(7302, 'ZC20261117002', '会议室投影仪', '办公设备', 'EPSON CB-X06', 'SN-EP20250320', 2, NULL, '2025-03-20', '4200', '0', '4200', 60, 1, '研发部-会议室1', NOW(), NOW()),
(7303, 'ZC20261117003', 'Dell R740 服务器', '服务器', '2×Xeon/64G/4×1.2T', 'SN-DL7401188', 2, NULL, '2024-11-01', '45000', '0', '45000', 60, 1, '机房-A01', NOW(), NOW()),
(7304, 'ZC20261117004', '会议室大屏', '办公设备', 'MAXHUB 75寸', 'SN-MH75202509', 2, NULL, '2025-09-15', '12000', '0', '12000', 60, 1, '研发部-会议室2', NOW(), NOW());

-- 5. salesdir 资产盘点+折旧权限(菜单即见,casbin 即通;改 casbin 须 restart)
INSERT IGNORE INTO sys_role_menu (sys_role_id, sys_menu_id) VALUES (9,2369),(9,2370),(9,2371),(9,2372),(9,2373);
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT 'p','sales_director',t.p,t.m FROM (
  SELECT '/psi/assets/stocktakes' p,'POST' m UNION ALL
  SELECT '/psi/assets/stocktakes','GET' UNION ALL
  SELECT '/psi/assets/stocktakes/:id','GET' UNION ALL
  SELECT '/psi/assets/stocktakes/:id/items/:itemId','PUT' UNION ALL
  SELECT '/psi/assets/stocktakes/:id/finish','POST' UNION ALL
  SELECT '/psi/assets/depreciate/run','POST' UNION ALL
  SELECT '/psi/assets/:id/depreciation-logs','GET'
) t
WHERE NOT EXISTS (SELECT 1 FROM casbin_rule c WHERE c.ptype='p' AND c.v0='sales_director' AND c.v1=t.p AND c.v2=t.m);

-- 6. salesdir 新建项目按钮权限(录制期补授,menu 902 project:add)
INSERT IGNORE INTO sys_role_menu (sys_role_id, sys_menu_id) VALUES (9, 902);
