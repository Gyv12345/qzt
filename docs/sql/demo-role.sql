-- =============================================================
-- demo-role.sql — 演示账号标记角色 + 绑定
-- 用途：合规收敛（2026-10-12）。为对外公开的演示账号挂 demo 标记角色，
--       后端据此拒绝其签发 API Key 与调用 MCP（业务登录演示不受影响）：
--       internal/mcp/server.go mcpAuthMiddleware、
--       internal/module/system/service/api_key.go Create。
-- ID 区间：sys_role id=14（demo）；sys_user_role 绑定 user_id IN (3,5,6,7,8,12,13)。
-- 设计说明：多角色数据权限取最宽松（middleware.InjectDataScope），
--       故 demo 角色 data_scope 取最严的 5（仅本人），不扩大演示账号可见范围；
--       demo 角色不分配任何 Casbin API 策略，不影响 RBAC 授权。
-- 执行方式：DBX MCP 或 mysql 客户端手动执行（可重复执行，幂等）。
-- =============================================================

-- 1. 演示标记角色（code 唯一索引，幂等）
INSERT INTO sys_role (id, name, code, sort, status, data_scope, remark, created_at, updated_at)
VALUES (14, '演示账号', 'demo', 99, 1, 5, '公开演示账号标记：禁止签发 API Key 与 MCP 调用', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), sort = 99, status = 1, data_scope = 5, remark = VALUES(remark);

-- 2. 绑定 7 个公开演示账号（幂等：先删后插）
DELETE FROM sys_user_role WHERE sys_role_id = 14;
INSERT INTO sys_user_role (sys_user_id, sys_role_id) VALUES
  (3, 14), (5, 14), (6, 14), (7, 14), (8, 14), (12, 14), (13, 14);
