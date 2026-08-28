-- ============================================================================
-- rbac_fix_nonadmin_20260828.sql — 非超管走查(2026-08-28)权限链缺口修复
-- ----------------------------------------------------------------------------
-- 用途: 补齐 6 个走查账号对应角色的 casbin p 规则。这些页面的菜单/按钮权限
--       (sys_role_menu)均已授予,但接口无 p 规则,导致非超管打开页面即 403:
--   sales_director(销售总监): 合同模板 CRUD+变量、售后工单 CRUD+状态、
--       固定资产 CRUD、CRM 配置读写+刷新缓存、进销存分析两张图表
--   sales_manager(销售经理): 合同模板 CRUD+变量
--   finance(财务): 应收应付列表/新增/详情/结算、合同页客户下拉、首页销售趋势图
--   hr(人事专员) / purchaser(采购专员): 首页销售趋势图 + 财务摘要图
-- 执行方式: DBX MCP 逐条执行(多语句只跑第一条)或 mysql 客户端整文件执行。
-- 幂等性: INSERT IGNORE + idx_casbin_rule 唯一键,重复执行无副作用。
-- 生效方式: casbin 规则在启动时加载,执行后需重启 qzt-server(systemctl restart)。
-- ============================================================================

-- 1) sales_director: 合同模板/售后工单/固定资产/CRM配置/进销存分析图表
INSERT IGNORE INTO casbin_rule (ptype, v0, v1, v2, v3, v4, v5) VALUES
('p', 'sales_director', '/crm/contract-templates', 'GET', '', '', ''),
('p', 'sales_director', '/crm/contract-templates', 'POST', '', '', ''),
('p', 'sales_director', '/crm/contract-templates/:id', 'GET', '', '', ''),
('p', 'sales_director', '/crm/contract-templates/:id', 'PUT', '', '', ''),
('p', 'sales_director', '/crm/contract-templates/:id', 'DELETE', '', '', ''),
('p', 'sales_director', '/crm/contract-templates/variables', 'GET', '', '', ''),
('p', 'sales_director', '/crm/tickets', 'GET', '', '', ''),
('p', 'sales_director', '/crm/tickets', 'POST', '', '', ''),
('p', 'sales_director', '/crm/tickets/:id', 'GET', '', '', ''),
('p', 'sales_director', '/crm/tickets/:id', 'PUT', '', '', ''),
('p', 'sales_director', '/crm/tickets/:id', 'DELETE', '', '', ''),
('p', 'sales_director', '/crm/tickets/:id/status', 'PUT', '', '', ''),
('p', 'sales_director', '/psi/assets', 'GET', '', '', ''),
('p', 'sales_director', '/psi/assets', 'POST', '', '', ''),
('p', 'sales_director', '/psi/assets/:id', 'GET', '', '', ''),
('p', 'sales_director', '/psi/assets/:id', 'PUT', '', '', ''),
('p', 'sales_director', '/psi/assets/:id', 'DELETE', '', '', ''),
('p', 'sales_director', '/system/configs', 'GET', '', '', ''),
('p', 'sales_director', '/system/configs', 'PUT', '', '', ''),
('p', 'sales_director', '/system/configs/refresh', 'POST', '', '', ''),
('p', 'sales_director', '/api/dashboard/sales-vs-purchase', 'GET', '', '', ''),
('p', 'sales_director', '/api/dashboard/stock-value-by-warehouse', 'GET', '', '', '');

-- 2) sales_manager: 合同模板 CRUD + 变量
INSERT IGNORE INTO casbin_rule (ptype, v0, v1, v2, v3, v4, v5) VALUES
('p', 'sales_manager', '/crm/contract-templates', 'GET', '', '', ''),
('p', 'sales_manager', '/crm/contract-templates', 'POST', '', '', ''),
('p', 'sales_manager', '/crm/contract-templates/:id', 'GET', '', '', ''),
('p', 'sales_manager', '/crm/contract-templates/:id', 'PUT', '', '', ''),
('p', 'sales_manager', '/crm/contract-templates/:id', 'DELETE', '', '', ''),
('p', 'sales_manager', '/crm/contract-templates/variables', 'GET', '', '', '');

-- 3) finance: 应收应付(菜单+新增往来+结算按钮)、合同页客户下拉、首页销售趋势图
INSERT IGNORE INTO casbin_rule (ptype, v0, v1, v2, v3, v4, v5) VALUES
('p', 'finance', '/finance/receivables', 'GET', '', '', ''),
('p', 'finance', '/finance/receivables', 'POST', '', '', ''),
('p', 'finance', '/finance/receivables/:id', 'GET', '', '', ''),
('p', 'finance', '/finance/receivables/:id/settle', 'POST', '', '', ''),
('p', 'finance', '/crm/customers', 'GET', '', '', ''),
('p', 'finance', '/api/dashboard/sales-trend', 'GET', '', '', '');

-- 4) hr / purchaser: 首页仪表盘两张图表(登录首页即加载,无权限则整页报错)
INSERT IGNORE INTO casbin_rule (ptype, v0, v1, v2, v3, v4, v5) VALUES
('p', 'hr', '/api/dashboard/sales-trend', 'GET', '', '', ''),
('p', 'hr', '/api/dashboard/finance-summary', 'GET', '', '', ''),
('p', 'purchaser', '/api/dashboard/sales-trend', 'GET', '', '', ''),
('p', 'purchaser', '/api/dashboard/finance-summary', 'GET', '', '', '');

-- 验证: 应返回 38
-- SELECT COUNT(*) FROM casbin_rule WHERE ptype='p' AND v0 IN ('sales_director','sales_manager','finance','hr','purchaser')
--   AND (v1 LIKE '/crm/contract-templates%' OR v1='/crm/tickets' OR v1 LIKE '/crm/tickets/%'
--        OR v1 LIKE '/psi/assets%' OR v1 LIKE '/system/configs%' OR v1 LIKE '/api/dashboard/%'
--        OR v1='/finance/receivables' OR v1 LIKE '/finance/receivables/%' OR v1='/crm/customers');

-- ============================================================================
-- 附:存量回款凭证备注修复(代码已改为用合同名,历史「合同#N」数据一次性订正)
-- ============================================================================
UPDATE fin_voucher v
JOIN crm_contract_payment_record pr ON pr.id = v.biz_id
JOIN crm_contract c ON c.id = pr.contract_id
SET v.remark = CONCAT(c.name, ' 回款自动生成')
WHERE v.biz_type = 'CONTRACT_PAYMENT' AND v.remark LIKE '合同#%';
