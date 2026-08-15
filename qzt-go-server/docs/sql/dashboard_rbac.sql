-- dashboard_rbac.sql 全公司口径 BI 看板接口的 Casbin 授权种子。
--
-- 用途:配合 api 模块路由调整——sales-trend/sales-ranking/contract-trend/
-- lead-source-distribution/employee-distribution/headcount-trend/
-- attendance-summary/finance-summary/finance-trend/stock-value-by-warehouse/
-- sales-vs-purchase 共 11 个全公司经营口径接口从「仅登录」挪入 Casbin RBAC
-- 组,任何角色需显式授权方可访问(此前任意登录用户可看全员业绩与财务总额)。
-- overview / customer-distribution / opportunity-funnel 已在 service 层叠加
-- datascope,保持仅登录。
--
-- 角色分配口径(按业务归属):
--   sale, sales_manager → CRM 类 4 个(sales-trend/contract-trend/sales-ranking/lead-source-distribution)
--   sales_manager, finance → 财务类 2 个(finance-summary/finance-trend)
--   finance, purchaser → 进销存 2 个(stock-value-by-warehouse/sales-vs-purchase)
--   hr → HRM 类 3 个(employee-distribution/headcount-trend/attendance-summary)
--
-- super_admin 走代码级绕过,无需规则。
-- 执行方式:必须在服务**停止窗口**执行(先 systemctl stop 再执行本脚本,然后 start)——
-- 旧版应用停机时会 Enforce.SavePolicy 把内存策略写回 casbin_rule,运行中插入会被抹掉
-- (2026-08-16 起 Close 已移除该写回,但存量部署首次执行时仍按停机窗口操作最稳)。
-- 另注意:管理员在后台调整某角色的菜单/API 授权会全量重建该角色策略,
-- 重建后需重跑本脚本(或在该角色的 API 授权页重新勾选 dashboard 接口)。
-- 幂等(先删后插固定 (v0,v1) 组合);DBX MCP 或 mysql 客户端单条执行。
-- 时间:2026-08-16

DELETE FROM casbin_rule WHERE ptype = 'p' AND v1 LIKE '/api/dashboard/%'
  AND v2 = 'GET' AND v0 IN ('sale','sales_manager','finance','purchaser','hr');

INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
-- CRM 类
('p','sale','/api/dashboard/sales-trend','GET'),
('p','sale','/api/dashboard/contract-trend','GET'),
('p','sale','/api/dashboard/sales-ranking','GET'),
('p','sale','/api/dashboard/lead-source-distribution','GET'),
('p','sales_manager','/api/dashboard/sales-trend','GET'),
('p','sales_manager','/api/dashboard/contract-trend','GET'),
('p','sales_manager','/api/dashboard/sales-ranking','GET'),
('p','sales_manager','/api/dashboard/lead-source-distribution','GET'),
-- 财务类
('p','sales_manager','/api/dashboard/finance-summary','GET'),
('p','finance','/api/dashboard/finance-summary','GET'),
('p','finance','/api/dashboard/finance-trend','GET'),
-- 进销存类
('p','finance','/api/dashboard/stock-value-by-warehouse','GET'),
('p','purchaser','/api/dashboard/stock-value-by-warehouse','GET'),
('p','finance','/api/dashboard/sales-vs-purchase','GET'),
('p','purchaser','/api/dashboard/sales-vs-purchase','GET'),
-- HRM 类
('p','hr','/api/dashboard/employee-distribution','GET'),
('p','hr','/api/dashboard/headcount-trend','GET'),
('p','hr','/api/dashboard/attendance-summary','GET');
