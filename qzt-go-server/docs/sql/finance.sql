-- ============================================================
-- finance.sql — 财务管理模块(finance)权限种子
-- ------------------------------------------------------------
-- 作用:登记 finance 模块的 sys_api(操作日志元数据 + Casbin obj)
--      与 sys_menu(目录/菜单/按钮 + sys_menu_api 关联),使财务模块
--      在 admin 后台可见、可分配权限。
--
-- 业务代码:internal/module/finance/(router/handler/service/repo)已实现,
--          本文件仅补 DB 权限元数据。Go 代码不写业务种子(见工作区 AGENTS.md)。
--
-- 幂等:每段先 DELETE 已存在的 finance 数据再 INSERT,可重复执行。
--      (仅清理本文件登记的固定 ID 区间 300~349,不影响其它数据。)
--
-- 执行方式:用户手动执行
--   mysql -h <host> -P 3306 -u <user> -p qztgo < docs/sql/finance.sql
-- 或在 DBX / 客户端里逐段运行。
--
-- ID 分配(避开现有数据,当前库 max(api.id)=246, max(menu.id)=213):
--   sys_api : 300~309 (finance 10 个接口)
--   sys_menu: 300 财务目录; 310~313 四个菜单; 320~345 按钮节点
-- ============================================================

START TRANSACTION;

-- ------------------------------------------------------------
-- 0. 清理本文件的历史数据(固定 ID 区间,幂等重跑安全)
-- ------------------------------------------------------------
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 300 AND 349;
DELETE FROM `sys_menu_api`  WHERE `sys_menu_id` BETWEEN 300 AND 349;
DELETE FROM `sys_menu`      WHERE `id`         BETWEEN 300 AND 349;
DELETE FROM `sys_api`       WHERE `id`         BETWEEN 300 AND 309;

-- ------------------------------------------------------------
-- 1. sys_api —— finance 受保护接口全集
--    path 与 Casbin obj 一致(无 /api 前缀)
-- ------------------------------------------------------------
INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  -- 会计科目 (300-301)
  (300, '/finance/accounts',                'GET',  '会计科目', '科目列表',     NOW(3), NOW(3)),
  (301, '/finance/accounts',                'POST', '会计科目', '创建科目',     NOW(3), NOW(3)),
  -- 记账凭证 (302-304)
  (302, '/finance/vouchers',                'GET',  '记账凭证', '凭证列表',     NOW(3), NOW(3)),
  (303, '/finance/vouchers',                'POST', '记账凭证', '创建凭证',     NOW(3), NOW(3)),
  (304, '/finance/vouchers/:id/confirm',    'PUT',  '记账凭证', '确认凭证',     NOW(3), NOW(3)),
  -- 发票管理 (305-306)
  (305, '/finance/invoices',                'GET',  '发票管理', '发票列表',     NOW(3), NOW(3)),
  (306, '/finance/invoices',                'POST', '发票管理', '创建发票',     NOW(3), NOW(3)),
  -- 财务报表 (307-308)
  (307, '/finance/reports/income-statement','GET',  '财务报表', '利润表',       NOW(3), NOW(3)),
  (308, '/finance/reports/balance-sheet',   'GET',  '财务报表', '资产负债表',   NOW(3), NOW(3));

-- ------------------------------------------------------------
-- 2. sys_menu —— 财务菜单树
--    type: 0=目录 1=菜单 2=按钮; visible/status: 1=正常
--    component 路径需与 admin 前端 src/pages 下的文件对应
--      (finance/account/index → src/pages/finance/account/index.tsx)
-- ------------------------------------------------------------
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  -- 顶级目录:财务(sort=9,排在最后;现有模块 system=1/cms=2/...)
  (300, 0,   '财务管理', '/finance',         NULL,                  'Money',      9, 0, NULL,                 1, 1, NOW(3), NOW(3)),

  -- ── 会计科目 ──
  (310, 300, '会计科目', '/finance/account', 'finance/account/index','Coin',       1, 1, 'finance:account:list',1, 1, NOW(3), NOW(3)),
  (320, 310, '新增科目', NULL,                NULL,                  NULL,         1, 2, 'finance:account:add', 1, 1, NOW(3), NOW(3)),

  -- ── 记账凭证 ──
  (311, 300, '记账凭证', '/finance/voucher', 'finance/voucher/index','Tickets',    2, 1, 'finance:voucher:list',1, 1, NOW(3), NOW(3)),
  (321, 311, '新增凭证', NULL,                NULL,                  NULL,         1, 2, 'finance:voucher:add', 1, 1, NOW(3), NOW(3)),
  (322, 311, '确认凭证', NULL,                NULL,                  NULL,         2, 2, 'finance:voucher:confirm',1,1,NOW(3), NOW(3)),

  -- ── 发票管理 ──
  (312, 300, '发票管理', '/finance/invoice', 'finance/invoice/index','Document',   3, 1, 'finance:invoice:list',1, 1, NOW(3), NOW(3)),
  (323, 312, '新增发票', NULL,                NULL,                  NULL,         1, 2, 'finance:invoice:add', 1, 1, NOW(3), NOW(3)),

  -- ── 财务报表 ──
  (313, 300, '财务报表', '/finance/report',  'finance/report/index', 'DataAnalysis',4,1,'finance:report:list',1, 1, NOW(3), NOW(3));

-- ------------------------------------------------------------
-- 3. sys_menu_api —— 菜单(含按钮)与 API 的授权关联
--    Casbin 策略在角色绑定菜单后由 service 自动重建。
--    规则:list 菜单挂 GET;add 按钮挂 POST;confirm 按钮挂 confirm PUT;
--         report 菜单挂两个报表 GET(只读展示,无增删改)。
-- ------------------------------------------------------------
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  -- 会计科目
  (310, 300),  -- list 菜单 → GET /finance/accounts
  (320, 301),  -- 新增科目  → POST /finance/accounts
  -- 记账凭证
  (311, 302),  -- list 菜单 → GET /finance/vouchers
  (321, 303),  -- 新增凭证  → POST /finance/vouchers
  (322, 304),  -- 确认凭证  → PUT /finance/vouchers/:id/confirm
  -- 发票管理
  (312, 305),  -- list 菜单 → GET /finance/invoices
  (323, 306),  -- 新增发票  → POST /finance/invoices
  -- 财务报表
  (313, 307),  -- 报表菜单 → GET /finance/reports/income-statement
  (313, 308);  -- 报表菜单 → GET /finance/reports/balance-sheet

COMMIT;

-- ------------------------------------------------------------
-- 4.(可选)把财务菜单授权给超级管理员角色,使其立即可见
--    super_admin 在 CasbinRBAC 中间件里直接放行(无需 Casbin 策略),
--    但 /system/menus/user 的菜单树由 role↔menu 关联驱动,故需登记。
--    其它角色请在后台「角色管理」页面分配,勿在此硬编码 role id。
-- ------------------------------------------------------------
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id BETWEEN 300 AND 323
WHERE r.code = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- ------------------------------------------------------------
-- 核验(可选,手动执行查看结果)
-- ------------------------------------------------------------
-- SELECT id, path, method, `group`, description FROM sys_api  WHERE path LIKE '/finance%' ORDER BY id;
-- SELECT id, parent_id, name, path, component, type, permission FROM sys_menu WHERE path LIKE '/finance%' OR id BETWEEN 300 AND 349 ORDER BY id;
-- SELECT m.sys_menu_id, mu.name AS menu, m.sys_api_id, a.path, a.method
--   FROM sys_menu_api m JOIN sys_menu mu ON mu.id=m.sys_menu_id JOIN sys_api a ON a.id=m.sys_api_id
--   WHERE m.sys_menu_id BETWEEN 300 AND 349 ORDER BY m.sys_menu_id;
