-- ============================================================
-- deploy.sql —— 静态站一键发布模块 sys_api 登记(无新表、无菜单/按钮)
--
-- 用途:
--   1. sys_api 848/849:POST /deploy/static + GET /deploy/status
--      仅供接口清单/审计;超管 Casbin 内存短路放行(internal/middleware/casbin_rbac.go),
--      不绑菜单/按钮、普通角色无策略,天然仅超管可用。
--   2. 配套重建脚本模板见 docs/deploy/rebuild_static.sh,
--      部署时拷到服务器 /opt/qzt-server/bin/rebuild_static.sh 并 chmod +x。
--
-- ID 分配区间:sys_api 848-849(storefront.sql 原在 848 预留,已改派本模块并同步其注释,实际此前最大 847)
-- 执行方式:通过 DBX MCP 或 mysql 客户端逐段执行(DBX 多语句须拆单条);幂等可重复执行。
-- 依赖:后端需部署含 deploy 模块(cmd/server/main.go 20 模块注册)的版本。
-- ============================================================

DELETE FROM `sys_api` WHERE `id` BETWEEN 848 AND 849;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (848, '/deploy/static', 'POST', '静态站发布', '一键重新生成并发布静态站(cms/storefront,异步)', NOW(3), NOW(3)),
  (849, '/deploy/status', 'GET',  '静态站发布', '静态站重建状态与日志尾查询', NOW(3), NOW(3));
