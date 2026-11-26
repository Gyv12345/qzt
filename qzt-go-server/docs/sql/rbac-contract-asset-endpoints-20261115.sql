-- =====================================================================
-- 文件: rbac-contract-asset-endpoints-20261115.sql
-- 用途: D3 缺陷修复——P30-#2 合同生命周期与 P33 资产盘点/折旧共 10 个端点
--       的 casbin 授权种子（上线时 sys_api/sys_menu_api 已登记，但未重放
--       SetMenus，导致非超管全 403；本文件直插 casbin 行并要求重启服务生效）。
-- 端点/角色矩阵（与现有授权面对齐）:
--   合同读面(含 finance 只读): GET /crm/contracts/:id/changes
--     -> sale, sales_manager, sales_director, finance
--   合同写面: POST /crm/contracts/:id/changes
--             POST /crm/contracts/:id/archive
--             POST /crm/contracts/:id/unarchive
--     -> sale, sales_manager, sales_director
--   资产面(仅 sales_director,同 /psi/assets 授权口径):
--     POST /psi/assets/stocktakes
--     GET  /psi/assets/stocktakes/:id
--     PUT  /psi/assets/stocktakes/:id/items/:itemId
--     POST /psi/assets/stocktakes/:id/finish
--     POST /psi/assets/depreciate/run
--     GET  /psi/assets/:id/depreciation-logs
--     -> sales_director
-- 共 19 行 (ptype 恒为 'p';casbin 直插必须带 ptype,空值会崩溃循环)。
-- 幂等: 先 DELETE 同精确行再 INSERT(重复执行结果一致)。
-- 执行方式: DBX MCP 或手动 mysql 执行后,必须 systemctl restart qzt-server
--   (enforcer 为内存副本,仅在角色/菜单变更 API 里显式 LoadPolicy)。
-- 执行记录: 2026-11-15 R64 轮 D3 修复,已执行+重启+E2E 验证(见 docs/qa R64 附录)。
-- =====================================================================

-- 1) 清理同精确行(幂等前置,防重复执行产生重复行)
DELETE FROM casbin_rule WHERE ptype='p' AND (
  (v0='sale'            AND v1='/crm/contracts/:id/changes' AND v2='GET') OR
  (v0='sales_manager'   AND v1='/crm/contracts/:id/changes' AND v2='GET') OR
  (v0='sales_director'  AND v1='/crm/contracts/:id/changes' AND v2='GET') OR
  (v0='finance'         AND v1='/crm/contracts/:id/changes' AND v2='GET') OR
  (v0='sale'            AND v1='/crm/contracts/:id/changes' AND v2='POST') OR
  (v0='sales_manager'   AND v1='/crm/contracts/:id/changes' AND v2='POST') OR
  (v0='sales_director'  AND v1='/crm/contracts/:id/changes' AND v2='POST') OR
  (v0='sale'            AND v1='/crm/contracts/:id/archive' AND v2='POST') OR
  (v0='sales_manager'   AND v1='/crm/contracts/:id/archive' AND v2='POST') OR
  (v0='sales_director'  AND v1='/crm/contracts/:id/archive' AND v2='POST') OR
  (v0='sale'            AND v1='/crm/contracts/:id/unarchive' AND v2='POST') OR
  (v0='sales_manager'   AND v1='/crm/contracts/:id/unarchive' AND v2='POST') OR
  (v0='sales_director'  AND v1='/crm/contracts/:id/unarchive' AND v2='POST') OR
  (v0='sales_director'  AND v1='/psi/assets/stocktakes' AND v2='POST') OR
  (v0='sales_director'  AND v1='/psi/assets/stocktakes/:id' AND v2='GET') OR
  (v0='sales_director'  AND v1='/psi/assets/stocktakes/:id/items/:itemId' AND v2='PUT') OR
  (v0='sales_director'  AND v1='/psi/assets/stocktakes/:id/finish' AND v2='POST') OR
  (v0='sales_director'  AND v1='/psi/assets/depreciate/run' AND v2='POST') OR
  (v0='sales_director'  AND v1='/psi/assets/:id/depreciation-logs' AND v2='GET')
);

-- 2) 插入授权行
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
('p', 'sale',           '/crm/contracts/:id/changes', 'GET'),
('p', 'sales_manager',  '/crm/contracts/:id/changes', 'GET'),
('p', 'sales_director', '/crm/contracts/:id/changes', 'GET'),
('p', 'finance',        '/crm/contracts/:id/changes', 'GET'),
('p', 'sale',           '/crm/contracts/:id/changes', 'POST'),
('p', 'sales_manager',  '/crm/contracts/:id/changes', 'POST'),
('p', 'sales_director', '/crm/contracts/:id/changes', 'POST'),
('p', 'sale',           '/crm/contracts/:id/archive', 'POST'),
('p', 'sales_manager',  '/crm/contracts/:id/archive', 'POST'),
('p', 'sales_director', '/crm/contracts/:id/archive', 'POST'),
('p', 'sale',           '/crm/contracts/:id/unarchive', 'POST'),
('p', 'sales_manager',  '/crm/contracts/:id/unarchive', 'POST'),
('p', 'sales_director', '/crm/contracts/:id/unarchive', 'POST'),
('p', 'sales_director', '/psi/assets/stocktakes', 'POST'),
('p', 'sales_director', '/psi/assets/stocktakes/:id', 'GET'),
('p', 'sales_director', '/psi/assets/stocktakes/:id/items/:itemId', 'PUT'),
('p', 'sales_director', '/psi/assets/stocktakes/:id/finish', 'POST'),
('p', 'sales_director', '/psi/assets/depreciate/run', 'POST'),
('p', 'sales_director', '/psi/assets/:id/depreciation-logs', 'GET');

-- 3) 验证(执行后人工核对行数应为 19)
-- SELECT COUNT(*) FROM casbin_rule WHERE v1 IN
--   ('/crm/contracts/:id/changes','/crm/contracts/:id/archive','/crm/contracts/:id/unarchive',
--    '/psi/assets/stocktakes','/psi/assets/stocktakes/:id','/psi/assets/stocktakes/:id/items/:itemId',
--    '/psi/assets/stocktakes/:id/finish','/psi/assets/depreciate/run','/psi/assets/:id/depreciation-logs');
