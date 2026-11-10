-- finance_expense_read_20261028.sql 财务角色补报销详情只读权限。
--
-- 背景: R40~R48 回归连续 9 轮发现财务(zhaoliu/finance 角色)可执行
-- POST /oa/expenses/:id/mark-paid 打款, 但 GET /oa/expenses/:id 详情 403,
-- 打款后无法复核打款状态。本种子为 finance 角色补一条报销详情只读规则。
--
-- 授权口径(只读最小集, 创建/编辑/删除仍不授):
--   + p, finance, /oa/expenses/:id, GET   (报销单详情, 含 items)
-- 不授: GET /oa/expenses(列表)、POST(创建)、PUT(编辑)、DELETE(删除)。
--
-- 生效方式: casbin_rule 直接插入不会热加载(Enforcer 启动时一次性 LoadPolicy)。
-- 生产 2026-10-28 已通过后台「角色管理→API 授权」(system SetAPIs, 覆盖式重建
-- 该角色 49 条策略并 SavePolicy+清权限缓存)热生效, 本文件用于全新部署复现:
-- 在 qztgo.sql 之后执行即可。若在存量运行实例上执行本文件, 需重启服务或在
-- 后台把该角色的 API 授权重新保存一次才会生效。
-- 幂等(NOT EXISTS 防重); DBX MCP 或 mysql 客户端单条执行。
-- 时间: 2026-10-28

INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT 'p', 'finance', '/oa/expenses/:id', 'GET' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM casbin_rule
  WHERE ptype = 'p' AND v0 = 'finance' AND v1 = '/oa/expenses/:id' AND v2 = 'GET'
);
