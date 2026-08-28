-- ============================================================================
-- fix_full_regression_20260828.sql — 第一次全流程回归缺陷修复(数据部分)
-- ----------------------------------------------------------------------------
-- ① 合同审批流「经理审批」节点 approver_list='1' 为非法 JSON(应为数组),
--   引擎解析失败→无可用审批人→自动驳回。改为 [5](wangwu 销售经理)。
-- ② casbin 补授:sale 首页财务摘要;合同产品明细 items GET/POST。
-- ⑧ 撤销 employee 角色的「打款标记」按钮权限(打款属财务动作)。
-- ⑦ 存量工单 customer_name 回填。
-- ⑥ 脏数据:fin_receivable/payable party_name 存了内部 ID,按单号订正。
-- 执行:DBX 逐条执行;casbin 变更后需重启 qzt-server 生效。
-- ============================================================================

-- ① 审批人修复(合法 JSON 数组)
UPDATE approval_node_approver SET approver_list = '[5]' WHERE id = 62 AND approver_list = '1';

-- ② casbin 补授(INSERT IGNORE 幂等)
INSERT IGNORE INTO casbin_rule (ptype, v0, v1, v2, v3, v4, v5) VALUES
('p', 'sale', '/api/dashboard/finance-summary', 'GET', '', '', ''),
('p', 'sale', '/crm/contracts/:id/items', 'GET', '', '', ''),
('p', 'sales_director', '/crm/contracts/:id/items', 'GET', '', '', ''),
('p', 'sales_director', '/crm/contracts/:id/items', 'POST', '', '', ''),
('p', 'sales_manager', '/crm/contracts/:id/items', 'GET', '', '', ''),
('p', 'sales_manager', '/crm/contracts/:id/items', 'POST', '', '', '');

-- ⑧ 打款权限回收(employee 不应有财务打款动作)
DELETE FROM sys_role_menu WHERE sys_menu_id = 805 AND sys_role_id = (SELECT id FROM sys_role WHERE code = 'employee');

-- ⑦ 存量工单客户名回填
UPDATE crm_ticket t
JOIN crm_customer c ON c.id = t.customer_id
SET t.customer_name = c.name
WHERE t.customer_id IS NOT NULL AND (t.customer_name IS NULL OR t.customer_name = '');

-- ⑥ 脏数据订正(YS20260821001 party_name='1'→客户名;YF20260821001 party_name='2'→供应商名)
UPDATE fin_receivable SET party_name = (SELECT name FROM crm_customer WHERE id = 1)
WHERE doc_no = 'YS20260821001' AND party_name = '1';
UPDATE fin_receivable SET party_name = (SELECT name FROM psi_supplier WHERE id = 2)
WHERE doc_no = 'YF20260821001' AND party_name = '2';

-- ⑪ sale 角色补授「配置」父目录(线索池菜单 352 的父级 130),
--    父目录缺失导致前端路由树丢弃该页面,销售访问 /crm/lead-pool 直接 404
INSERT IGNORE INTO sys_role_menu (sys_role_id, sys_menu_id) VALUES (3, 130);

-- ⑫ sales_director 补授商城订单管理(确认/完成/取消/生成销售单),使商城订单确认无需超管
INSERT IGNORE INTO sys_role_menu (sys_role_id, sys_menu_id) VALUES
(9, 1000), (9, 1001), (9, 1002), (9, 1003), (9, 1004), (9, 1005);

-- ⑫ casbin:sales_director 商城订单查看/确认/完成/取消/生成销售单
INSERT IGNORE INTO casbin_rule (ptype, v0, v1, v2, v3, v4, v5) VALUES
('p', 'sales_director', '/mall/orders', 'GET', '', '', ''),
('p', 'sales_director', '/mall/orders/:id', 'GET', '', '', ''),
('p', 'sales_director', '/mall/orders/:id/status', 'PUT', '', '', ''),
('p', 'sales_director', '/mall/orders/:id/generate-sales-order', 'POST', '', '', '');
