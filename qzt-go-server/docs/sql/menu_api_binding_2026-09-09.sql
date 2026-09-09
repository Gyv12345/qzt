-- =====================================================================
-- menu_api_binding_2026-09-09.sql
-- 用途:补齐「菜单→API」绑定,消除孤儿接口,使角色权限完全由菜单分配驱动
--      (客户在界面上自配角色即可获得完整权限,不再依赖直插 casbin_rule)
-- 背景:2026-09-09 第十二轮回归修复中发现——
--   ① 一批 :id 详情 GET 未绑菜单(列表可看、详情 403);
--   ② 11 个 BI 仪表盘接口未绑菜单且 9 个未登记 sys_api,自定义角色永远拿不到
--     (admin 首页固定加载财务概览卡片,无权限即 403 弹错);
--   ③ 移动端个人自助接口(打卡/加班)已改纯登录分组(见 hrmmodule 路由),
--     不再依赖 casbin,相关直插策略可删。
-- 执行方式:DBX MCP 逐条执行或手动 mysql。幂等:NOT EXISTS 防重。
-- 关联代码:qzt-go-server internal/module/hrm/router.go(自助接口移出 RBAC 组)
--          qzt-go-admin src/utils/request.ts + src/services/dashboard.ts(403 静默)
-- =====================================================================

-- ── 一、登记缺失的 BI 仪表盘 API(sys_api,group=dashboard) ──
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, 'GET', 'dashboard', x.descr FROM (
  SELECT '/api/dashboard/contract-trend' AS path, '合同趋势' AS descr UNION ALL
  SELECT '/api/dashboard/sales-ranking', '销售业绩排行' UNION ALL
  SELECT '/api/dashboard/lead-source-distribution', '线索来源分布' UNION ALL
  SELECT '/api/dashboard/attendance-summary', '考勤汇总(BI)' UNION ALL
  SELECT '/api/dashboard/employee-distribution', '员工分布' UNION ALL
  SELECT '/api/dashboard/headcount-trend', '入职人数趋势' UNION ALL
  SELECT '/api/dashboard/finance-trend', '收支趋势' UNION ALL
  SELECT '/api/dashboard/stock-value-by-warehouse', '仓库库存货值' UNION ALL
  SELECT '/api/dashboard/sales-vs-purchase', '购销对比'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method='GET' AND a.deleted_at IS NULL);

-- ── 二、:id 详情 GET 绑到同域菜单(列表在哪,详情就能看) ──
-- 联系人详情 → 联系人管理(630)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 630, a.id FROM sys_api a
WHERE a.path='/crm/contacts/:id' AND a.method='GET' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=630 AND m.sys_api_id=a.id);

-- 跟进计划/跟进记录详情 → 编辑跟进(83)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 83, a.id FROM sys_api a
WHERE a.path IN ('/crm/follow-plans/:id','/crm/follow-records/:id') AND a.method='GET' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=83 AND m.sys_api_id=a.id);

-- 回款计划/回款记录详情 → 编辑回款(94)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 94, a.id FROM sys_api a
WHERE a.path IN ('/crm/payment-plans/:id','/crm/payment-records/:id') AND a.method='GET' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=94 AND m.sys_api_id=a.id);

-- CMS 分类详情 → 分类管理(116)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 116, a.id FROM sys_api a
WHERE a.path='/cms/categories/:id' AND a.method='GET' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=116 AND m.sys_api_id=a.id);

-- ── 三、BI 仪表盘接口按业务域绑到顶级目录(勾目录即含 BI) ──
-- CRM 类 → 客户管理(73)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 73, a.id FROM sys_api a
WHERE a.path IN ('/api/dashboard/sales-trend','/api/dashboard/contract-trend',
                 '/api/dashboard/sales-ranking','/api/dashboard/lead-source-distribution')
  AND a.method='GET' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=73 AND m.sys_api_id=a.id);

-- 财务类 → 财务管理(300)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 300, a.id FROM sys_api a
WHERE a.path IN ('/api/dashboard/finance-summary','/api/dashboard/finance-trend')
  AND a.method='GET' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=300 AND m.sys_api_id=a.id);

-- 人事类 → 人事管理(157)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 157, a.id FROM sys_api a
WHERE a.path IN ('/api/dashboard/attendance-summary','/api/dashboard/employee-distribution',
                 '/api/dashboard/headcount-trend')
  AND a.method='GET' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=157 AND m.sys_api_id=a.id);

-- 进销存类 → 进销存(170)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 170, a.id FROM sys_api a
WHERE a.path IN ('/api/dashboard/stock-value-by-warehouse','/api/dashboard/sales-vs-purchase')
  AND a.method='GET' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=170 AND m.sys_api_id=a.id);

-- ── 四、验证:孤儿接口应只剩「纯登录分组/仅超管」的无害项 ──
-- SELECT a.path, a.method FROM sys_api a
-- WHERE NOT EXISTS (SELECT 1 FROM sys_menu_api ma WHERE ma.sys_api_id=a.id) ORDER BY a.path;
