-- =====================================================================
-- rbac_test_seed.sql — RBAC + 数据权限测试种子数据
-- =====================================================================
-- 用途:为生产权限测试构造可验证 RBAC(Casbin API 拦截)+ data_scope(数据隔离)
--      的完整场景。配合 docs/sql/rbac_test_rollback.sql 可一键还原。
--
-- 执行方式:通过 DBX MCP(connection_name="我的阿里云数据库", database="qztgo")
--          分段执行;菜单→Casbin 权限由 MCP API system_role_assign_menus 单独配。
--
-- ID 分配区间(避免与现有数据冲突):
--   hrm_department: 5~8   (销售部/销售一组/销售二组/人事部)
--   crm_customer:   10~11 (张三客户A / 李四客户B)
--   sys_user:       复用现有 3~8(只改 dept_id + password,不新建)
--   sys_role:       复用现有 3~7(只改 data_scope,不新建)
--
-- 部门树(测试后):
--   总裁办(1)
--   ├─ 研发部(2)            ← zhouba(采购专员,DEPT=3)挂这里
--   ├─ 市场部(3)
--   ├─ 财务部(4)            ← zhaoliu(财务,DEPT=3)
--   ├─ 销售部(5)            ← wangwu(销售经理,DEPT_AND_SUB=4)
--   │  ├─ 销售一组(6)       ← zhangsan(销售,SELF=5)
--   │  └─ 销售二组(7)       ← lisi(销售,SELF=5)
--   └─ 人事部(8)            ← sunqi(人事,DEPT=3)
--
-- 测试账号密码统一重置为: 123456
--   zhangsan/lisi/wangwu/zhaoliu/sunqi/zhouba
-- =====================================================================

-- =====================================================================
-- 一、新增测试部门(幂等:先 DELETE 固定 ID 区间再 INSERT)
-- =====================================================================
DELETE FROM hrm_department WHERE id IN (5, 6, 7, 8);

INSERT INTO hrm_department (id, parent_id, name, code, leader, sort, status, created_at, updated_at) VALUES
  (5, 1, '销售部',     'SALES',    5, 4, 1, NOW(), NOW()),
  (6, 5, '销售一组',   'SALES_1',  3, 1, 1, NOW(), NOW()),
  (7, 5, '销售二组',   'SALES_2',  4, 2, 1, NOW(), NOW()),
  (8, 1, '人事部',     'HR',       7, 5, 1, NOW(), NOW());

-- =====================================================================
-- 二、分配用户到部门
--   admin 不动(dept_id 保持 NULL,超管 data_scope=1 无需部门)
-- =====================================================================
UPDATE sys_user SET dept_id = 6, updated_at = NOW() WHERE id = 3;  -- zhangsan  → 销售一组
UPDATE sys_user SET dept_id = 7, updated_at = NOW() WHERE id = 4;  -- lisi      → 销售二组
UPDATE sys_user SET dept_id = 5, updated_at = NOW() WHERE id = 5;  -- wangwu    → 销售部
UPDATE sys_user SET dept_id = 4, updated_at = NOW() WHERE id = 6;  -- zhaoliu   → 财务部
UPDATE sys_user SET dept_id = 8, updated_at = NOW() WHERE id = 7;  -- sunqi     → 人事部
UPDATE sys_user SET dept_id = 2, updated_at = NOW() WHERE id = 8;  -- zhouba    → 研发部

-- =====================================================================
-- 三、设置角色 data_scope
--   1=全部(超管不动) 3=本部门 4=本部门及子 5=仅本人
-- =====================================================================
UPDATE sys_role SET data_scope = 5 WHERE id = 3;  -- sale           → 仅本人
UPDATE sys_role SET data_scope = 4 WHERE id = 4;  -- sales_manager  → 本部门及子
UPDATE sys_role SET data_scope = 3 WHERE id = 5;  -- finance        → 本部门
UPDATE sys_role SET data_scope = 3 WHERE id = 6;  -- hr             → 本部门
UPDATE sys_role SET data_scope = 3 WHERE id = 7;  -- purchaser      → 本部门

-- =====================================================================
-- 四、重置 6 个测试账号密码为 123456(bcrypt cost=10)
--   哈希由 qzt-go-server 的 bcrypt.DefaultCost 生成
-- =====================================================================
UPDATE sys_user SET password = '$2a$10$ZxhizIno9z/aGQHHkLmi/Or3vACypfmVnDF7GDc0NcCv2/DHtcUuG', updated_at = NOW()
  WHERE id IN (3, 4, 5, 6, 7, 8);

-- =====================================================================
-- 五、CRM 客户隔离测试数据
--   现有客户 id=3,4 归 admin(1),不动。
--   新增:zhangsan(3) 和 lisi(4) 各 1 个客户,验证 SELF 隔离。
-- =====================================================================
DELETE FROM crm_customer WHERE id IN (10, 11);

INSERT INTO crm_customer (id, name, customer_no, level, source, status, industry, owner_id, follower_id, in_pool, collection_time, created_at, updated_at) VALUES
  (10, '张三客户A(隔离测试)', 'KH_TEST_001', 'A', '1', 1, 'IT',  3, 3, 0, NOW(), NOW(), NOW()),
  (11, '李四客户B(隔离测试)', 'KH_TEST_002', 'B', '2', 1, 'IT',  4, 4, 0, NOW(), NOW(), NOW());

-- =====================================================================
-- 注意:菜单→Casbin 权限不在此 SQL 内配置。
--       Casbin 策略由后台「角色管理→分配菜单」(SetMenus)自动重建,
--       手插 casbin_rule 会在下次分配时被清掉。
--       各角色菜单 ID 清单见下方注释,通过 MCP system_role_assign_menus 执行。
-- =====================================================================
-- 角色菜单分配清单(roleId → menuIds):
--
-- finance(5): 财务全 + CRM 合同回款只读
--   300,310,311,312,313,314,320,321,322,323, 89,93,94,95
--
-- hr(6): HRM 基础(部门/岗位/员工 + 绩效)
--   157,158,159,160,161,162,163,164,165,166,167,168,169,930
--
-- purchaser(7): PSI 采购 + 库存 + 供应商/仓库配置 + 报表(排除销售侧)
--   170,171,173,174,175,176,177,178,179,180,181,182,191,195,196,197,198,199,200,201,202,203
--
-- sales_manager(4): sale 现有 CRM 52 菜单 + 公海写 + 审批
--   复制 role=3 的 menu + 100,101,102,103,104, 131,132,133,134,135,136
--
-- sale(3): 保持现有菜单不变(仅改了 data_scope=5)
-- =====================================================================
