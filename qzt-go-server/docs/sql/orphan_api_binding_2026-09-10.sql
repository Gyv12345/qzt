-- =====================================================================
-- orphan_api_binding_2026-09-10.sql
-- 用途:修复 R13-①(P1)——全菜单化改造(5b6f380)后大量 RBAC 接口未登记 sys_api,
--      菜单无法绑定 → SetMenus 永远发不出授权 → 任何非超管角色恒 403。
--      本文件:①补登 84 条孤儿 sys_api;②新增 4 个审批类按钮菜单;
--      ③绑定「菜单→API」;④对相关角色做菜单授予增量。
--      执行后必须对各角色重放 PUT /system/roles/:id/menus(SetMenus)重建 casbin!
-- 背景:2026-09-10 第十三轮回归发现请假/加班审批、考勤汇总、应收应付、合同模板、
--      工单、资产、project 整模块、薪资、招聘、绩效、云盘、报销打款、借款还清、
--      官网首页配置等对全部非超管 403(R12 同链路通过,系改造回归)。
-- 执行方式:DBX MCP 逐条执行或手动 mysql。幂等:NOT EXISTS 防重。
-- 关联回归:docs/qa/2026-09-10-第十三轮-回归测试用例.md 缺陷 R13-①
-- =====================================================================

-- ── 一、补登缺失 sys_api(84 条,按族分组) ──
-- 1. CRM 合同域(模板/行项目/套打/导入/交接)
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, x.gp, x.descr FROM (
  SELECT '/crm/contract-templates' AS path,'GET' AS method,'合同管理' AS gp,'合同模板列表' AS descr UNION ALL
  SELECT '/crm/contract-templates','POST','合同管理','合同模板新增' UNION ALL
  SELECT '/crm/contract-templates/:id','GET','合同管理','合同模板详情' UNION ALL
  SELECT '/crm/contract-templates/:id','PUT','合同管理','合同模板修改' UNION ALL
  SELECT '/crm/contract-templates/:id','DELETE','合同管理','合同模板删除' UNION ALL
  SELECT '/crm/contract-templates/variables','GET','合同管理','合同模板变量清单' UNION ALL
  SELECT '/crm/contracts/:id/items','GET','合同管理','合同行项目列表' UNION ALL
  SELECT '/crm/contracts/:id/items','POST','合同管理','合同行项目新增' UNION ALL
  SELECT '/crm/contracts/:id/print-document','GET','合同管理','合同套打文档' UNION ALL
  SELECT '/crm/contract-items/:itemId','PUT','合同管理','合同行项目修改' UNION ALL
  SELECT '/crm/contract-items/:itemId','DELETE','合同管理','合同行项目删除' UNION ALL
  SELECT '/crm/handover','POST','客户管理','客户交接' UNION ALL
  SELECT '/crm/import','POST','客户管理','客户导入' UNION ALL
  SELECT '/crm/import/template','GET','客户管理','客户导入模板下载'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 2. CRM 商品 SKU
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '商品管理', x.descr FROM (
  SELECT '/crm/products/:id/skus' AS path,'GET' AS method,'SKU列表' AS descr UNION ALL
  SELECT '/crm/products/:id/skus','POST','SKU新增' UNION ALL
  SELECT '/crm/products/:id/skus/:skuId','PUT','SKU修改' UNION ALL
  SELECT '/crm/products/:id/skus/:skuId','DELETE','SKU删除'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 3. CRM 售后工单
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '售后服务', x.descr FROM (
  SELECT '/crm/tickets' AS path,'GET' AS method,'工单列表' AS descr UNION ALL
  SELECT '/crm/tickets','POST','工单新建' UNION ALL
  SELECT '/crm/tickets/:id','GET','工单详情' UNION ALL
  SELECT '/crm/tickets/:id','PUT','工单修改' UNION ALL
  SELECT '/crm/tickets/:id','DELETE','工单删除' UNION ALL
  SELECT '/crm/tickets/:id/status','PUT','工单状态变更'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 4. 财务应收应付
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '应收应付', x.descr FROM (
  SELECT '/finance/receivables' AS path,'GET' AS method,'往来款列表' AS descr UNION ALL
  SELECT '/finance/receivables','POST','往来款新建' UNION ALL
  SELECT '/finance/receivables/:id','GET','往来款详情' UNION ALL
  SELECT '/finance/receivables/:id/settle','POST','往来款结算'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 5. HRM 考勤(审批/汇总)
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '考勤管理', x.descr FROM (
  SELECT '/hrm/attendance/leaves/:id/approve' AS path,'PUT' AS method,'请假审批' AS descr UNION ALL
  SELECT '/hrm/attendance/overtimes/:id/approve','PUT','加班审批' UNION ALL
  SELECT '/hrm/attendance/summary','GET','考勤汇总查询' UNION ALL
  SELECT '/hrm/attendance/summary/generate','POST','考勤汇总生成'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 6. HRM 薪资
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '薪资管理', x.descr FROM (
  SELECT '/hrm/payroll' AS path,'GET' AS method,'工资单列表' AS descr UNION ALL
  SELECT '/hrm/payroll/generate','POST','工资单生成' UNION ALL
  SELECT '/hrm/payroll/:id/confirm','PUT','工资单确认' UNION ALL
  SELECT '/hrm/payroll/:id/paid','PUT','工资单标记发放' UNION ALL
  SELECT '/hrm/payroll/structure','GET','薪酬结构查询' UNION ALL
  SELECT '/hrm/payroll/structure','PUT','薪酬结构保存'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 7. HRM 招聘(候选人/职位)
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '招聘管理', x.descr FROM (
  SELECT '/hrm/candidates' AS path,'GET' AS method,'候选人列表' AS descr UNION ALL
  SELECT '/hrm/candidates','POST','候选人新增' UNION ALL
  SELECT '/hrm/candidates/:id','PUT','候选人修改' UNION ALL
  SELECT '/hrm/candidates/:id','DELETE','候选人删除' UNION ALL
  SELECT '/hrm/jobs','GET','招聘职位列表' UNION ALL
  SELECT '/hrm/jobs','POST','招聘职位新增' UNION ALL
  SELECT '/hrm/jobs/:id','PUT','招聘职位修改' UNION ALL
  SELECT '/hrm/jobs/:id','DELETE','招聘职位删除'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 8. HRM 绩效
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '绩效管理', x.descr FROM (
  SELECT '/hrm/performances' AS path,'GET' AS method,'考核列表' AS descr UNION ALL
  SELECT '/hrm/performances','POST','考核创建' UNION ALL
  SELECT '/hrm/performances/:id','GET','考核详情' UNION ALL
  SELECT '/hrm/performances/:id','PUT','考核修改' UNION ALL
  SELECT '/hrm/performances/:id','DELETE','考核删除' UNION ALL
  SELECT '/hrm/performances/:id/review','PUT','绩效评审' UNION ALL
  SELECT '/hrm/performances/:id/self-review','PUT','绩效自评'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 8b. HRM 招聘职位详情(首轮审计转录遗漏,实测差集补登)
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT '/hrm/jobs/:id', 'GET', '招聘管理', '招聘职位详情'
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path='/hrm/jobs/:id' AND a.method='GET' AND a.deleted_at IS NULL);

-- 9. OA 报销打款/借款还清
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '办公', x.descr FROM (
  SELECT '/oa/expenses/:id/mark-paid' AS path,'POST' AS method,'报销打款标记' AS descr UNION ALL
  SELECT '/oa/loans/:id/mark-repaid','POST','借款还清标记'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 10. 项目管理(整模块)
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '项目管理', x.descr FROM (
  SELECT '/project/projects' AS path,'GET' AS method,'项目列表' AS descr UNION ALL
  SELECT '/project/projects','POST','项目新建' UNION ALL
  SELECT '/project/projects/:id','GET','项目详情' UNION ALL
  SELECT '/project/projects/:id','PUT','项目修改' UNION ALL
  SELECT '/project/projects/:id','DELETE','项目删除' UNION ALL
  SELECT '/project/tasks','GET','任务列表' UNION ALL
  SELECT '/project/tasks','POST','任务新建' UNION ALL
  SELECT '/project/tasks/:id','PUT','任务修改' UNION ALL
  SELECT '/project/tasks/:id','DELETE','任务删除' UNION ALL
  SELECT '/project/tasks/:id/status','PUT','任务状态变更'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 11. 进销存固定资产
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '资产管理', x.descr FROM (
  SELECT '/psi/assets' AS path,'GET' AS method,'资产列表' AS descr UNION ALL
  SELECT '/psi/assets','POST','资产新建' UNION ALL
  SELECT '/psi/assets/:id','GET','资产详情' UNION ALL
  SELECT '/psi/assets/:id','PUT','资产修改' UNION ALL
  SELECT '/psi/assets/:id','DELETE','资产删除'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 12. 网盘写操作(读接口已登记)
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, '网盘', x.descr FROM (
  SELECT '/cloud/files' AS path,'POST' AS method,'文件创建' AS descr UNION ALL
  SELECT '/cloud/files/:id','PUT','文件重命名/移动' UNION ALL
  SELECT '/cloud/files/:id','DELETE','文件删除' UNION ALL
  SELECT '/cloud/folders','POST','文件夹新建'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- 13. 系统管理补遗
INSERT INTO sys_api (`path`, `method`, `group`, `description`)
SELECT x.path, x.method, x.gp, x.descr FROM (
  SELECT '/system/menus' AS path,'POST' AS method,'菜单管理' AS gp,'菜单新增' AS descr UNION ALL
  SELECT '/system/apis/:id','GET','API管理','接口详情' UNION ALL
  SELECT '/system/configs/:id','PUT','系统配置','参数修改' UNION ALL
  SELECT '/system/dicts/:id','GET','字典管理','字典详情' UNION ALL
  SELECT '/system/roles/:id/apis','GET','角色管理','角色接口查询' UNION ALL
  SELECT '/system/roles/:id/apis','PUT','角色管理','角色接口分配' UNION ALL
  SELECT '/system/homepage-config','GET','官网内容','官网首页配置查询' UNION ALL
  SELECT '/system/homepage-config/features/:id','DELETE','官网内容','官网首页模块删除' UNION ALL
  SELECT '/system/homepage-config/sync','PUT','官网内容','官网首页模块同步' UNION ALL
  SELECT '/system/homepage-config/toggle','PUT','官网内容','官网首页模块启停'
) x
WHERE NOT EXISTS (SELECT 1 FROM sys_api a WHERE a.path=x.path AND a.method=x.method AND a.deleted_at IS NULL);

-- ── 二、新增审批类按钮菜单(2100-2103,固定号段防冲突) ──
-- 审批/打款类操作独立成按钮菜单,避免随页面菜单授予过宽(如 employee 有 850 页面但不得自批请假)
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, sort, type, permission, visible, status)
SELECT 2100, 850, '请假审批', '', NULL, '', 1, 2, '', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id=2100 AND m.deleted_at IS NULL);
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, sort, type, permission, visible, status)
SELECT 2101, 880, '加班审批', '', NULL, '', 1, 2, '', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id=2101 AND m.deleted_at IS NULL);
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, sort, type, permission, visible, status)
SELECT 2102, 801, '报销打款', '', NULL, '', 5, 2, '', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id=2102 AND m.deleted_at IS NULL);
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, sort, type, permission, visible, status)
SELECT 2103, 820, '借款还清', '', NULL, '', 5, 2, '', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id=2103 AND m.deleted_at IS NULL);

-- ── 三、「菜单→API」绑定 ──
-- 合同模板(542):模板全族
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 542, a.id FROM sys_api a
WHERE a.path LIKE '/crm/contract-templates%' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=542 AND m.sys_api_id=a.id);

-- 合同管理(89):行项目/套打
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 89, a.id FROM sys_api a
WHERE (a.path IN ('/crm/contracts/:id/items','/crm/contracts/:id/print-document')
       OR a.path LIKE '/crm/contract-items/%') AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=89 AND m.sys_api_id=a.id);

-- 客户管理页面(74):交接/导入
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 74, a.id FROM sys_api a
WHERE a.path IN ('/crm/handover','/crm/import','/crm/import/template') AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=74 AND m.sys_api_id=a.id);

-- 产品管理(96):SKU 全族
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 96, a.id FROM sys_api a
WHERE a.path LIKE '/crm/products/:id/skus%' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=96 AND m.sys_api_id=a.id);

-- 售后工单(920):工单全族
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 920, a.id FROM sys_api a
WHERE a.path LIKE '/crm/tickets%' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=920 AND m.sys_api_id=a.id);

-- 应收应付(314):往来款全族
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 314, a.id FROM sys_api a
WHERE a.path LIKE '/finance/receivables%' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=314 AND m.sys_api_id=a.id);

-- 考勤打卡(880):考勤汇总查询/生成(审批走按钮)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 880, a.id FROM sys_api a
WHERE a.path IN ('/hrm/attendance/summary','/hrm/attendance/summary/generate') AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=880 AND m.sys_api_id=a.id);

-- 请假审批按钮(2100)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 2100, a.id FROM sys_api a
WHERE a.path='/hrm/attendance/leaves/:id/approve' AND a.method='PUT' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=2100 AND m.sys_api_id=a.id);

-- 加班审批按钮(2101)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 2101, a.id FROM sys_api a
WHERE a.path='/hrm/attendance/overtimes/:id/approve' AND a.method='PUT' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=2101 AND m.sys_api_id=a.id);

-- 报销打款按钮(2102)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 2102, a.id FROM sys_api a
WHERE a.path='/oa/expenses/:id/mark-paid' AND a.method='POST' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=2102 AND m.sys_api_id=a.id);

-- 借款还清按钮(2103)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 2103, a.id FROM sys_api a
WHERE a.path='/oa/loans/:id/mark-repaid' AND a.method='POST' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=2103 AND m.sys_api_id=a.id);

-- 招聘管理(881):候选人+职位全族
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 881, a.id FROM sys_api a
WHERE (a.path LIKE '/hrm/candidates%' OR a.path LIKE '/hrm/jobs%') AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=881 AND m.sys_api_id=a.id);

-- 绩效考核(930):绩效全族
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 930, a.id FROM sys_api a
WHERE a.path LIKE '/hrm/performances%' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=930 AND m.sys_api_id=a.id);

-- 人事管理目录(157):薪资全族(敏感,仅授 hr 类角色可见的目录)
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 157, a.id FROM sys_api a
WHERE a.path LIKE '/hrm/payroll%' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=157 AND m.sys_api_id=a.id);

-- 项目列表(901):项目+任务全族
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 901, a.id FROM sys_api a
WHERE a.path LIKE '/project/%' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=901 AND m.sys_api_id=a.id);

-- 固定资产(940):资产全族
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 940, a.id FROM sys_api a
WHERE a.path LIKE '/psi/assets%' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=940 AND m.sys_api_id=a.id);

-- 网盘目录(720):写操作
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 720, a.id FROM sys_api a
WHERE a.path IN ('/cloud/files','/cloud/folders','/cloud/files/:id')
  AND a.method IN ('POST','PUT','DELETE') AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=720 AND m.sys_api_id=a.id);

-- 官网配置(960):首页配置全族
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 960, a.id FROM sys_api a
WHERE a.path LIKE '/system/homepage-config%' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=960 AND m.sys_api_id=a.id);

-- 系统管理子菜单
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 4, a.id FROM sys_api a
WHERE ((a.path='/system/menus' AND a.method='POST')
   OR (a.path='/system/apis/:id' AND a.method='GET')) AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=4 AND m.sys_api_id=a.id);
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 5, a.id FROM sys_api a
WHERE a.path='/system/configs/:id' AND a.method='PUT' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=5 AND m.sys_api_id=a.id);
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 7, a.id FROM sys_api a
WHERE a.path='/system/dicts/:id' AND a.method='GET' AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=7 AND m.sys_api_id=a.id);
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id)
SELECT 3, a.id FROM sys_api a
WHERE a.path='/system/roles/:id/apis' AND a.method IN ('GET','PUT') AND a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu_api m WHERE m.sys_menu_id=3 AND m.sys_api_id=a.id);

-- ── 四、角色授予增量(菜单分配是唯一合法授权路径,禁止直插 casbin_rule) ──
-- sales_manager(4):请假页面+请假/加班审批按钮(与审批流 USER[5]=wangwu 口径一致)
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id)
SELECT 4, x.mid FROM (SELECT 850 mid UNION ALL SELECT 2100 UNION ALL SELECT 2101) x
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu r WHERE r.sys_role_id=4 AND r.sys_menu_id=x.mid);
-- sales_director(9):请假/加班审批按钮
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id)
SELECT 9, x.mid FROM (SELECT 2100 mid UNION ALL SELECT 2101) x
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu r WHERE r.sys_role_id=9 AND r.sys_menu_id=x.mid);
-- hr(6):考勤打卡页面(考勤汇总)+招聘管理
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id)
SELECT 6, x.mid FROM (SELECT 880 mid UNION ALL SELECT 881) x
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu r WHERE r.sys_role_id=6 AND r.sys_menu_id=x.mid);
-- finance(5):报销打款/借款还清按钮
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id)
SELECT 5, x.mid FROM (SELECT 2102 mid UNION ALL SELECT 2103) x
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu r WHERE r.sys_role_id=5 AND r.sys_menu_id=x.mid);
-- 网盘(720)全员开放(个人空间自隔离):sale/sales_manager/finance/hr/purchaser/sales_director/employee
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id)
SELECT r.rid, 720 FROM (SELECT 3 rid UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 9 UNION ALL SELECT 10) r
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu m WHERE m.sys_role_id=r.rid AND m.sys_menu_id=720);
-- 项目管理(900/901)授销售三角色(项目挂客户/合同)
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id)
SELECT r.rid, x.mid FROM (SELECT 3 rid UNION ALL SELECT 4 UNION ALL SELECT 9) r
CROSS JOIN (SELECT 900 mid UNION ALL SELECT 901) x
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu m WHERE m.sys_role_id=r.rid AND m.sys_menu_id=x.mid);

-- ── 五、执行后必做:对角色 3/4/5/6/7/9/10 重放 PUT /system/roles/:id/menus ──
-- (SetMenus 按角色现有 sys_role_menu 全量重建 casbin,菜单→API 绑定即生效)
