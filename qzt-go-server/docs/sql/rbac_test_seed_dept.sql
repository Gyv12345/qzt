-- =====================================================================
-- rbac_test_seed_dept.sql — DEPT(本部门)多人数据权限测试补充数据
-- =====================================================================
-- 用途: rbac_test_seed.sql 只造了 SELF 隔离数据(张三/李四各 1 客户),
--      财务/采购/人事(本部门)角色名下无数据,DEPT 多人场景测不出。
--      本文件给研发部(2)的周八(8, purchaser, DEPT=3) + testuser01(9, sale, SELF=5)
--      各造客户,形成同部门「DEPT vs SELF」对照:
--        周八(DEPT)      能看到研发部全员(8+9) = 3 条
--        testuser01(SELF) 只看自己(owner=9) = 1 条
--
-- 执行方式: 通过 DBX MCP(connection_name="我的阿里云数据库", database="qztgo")
--          先执行 DELETE 段,再执行 INSERT 段。
--
-- rollback: DELETE FROM crm_customer WHERE id IN (20, 21, 22);
--
-- ID 分配: crm_customer 20~22(现有 max id=18)
-- 预期变化(私海客户): admin 7→10, 周八 0→3, testuser01 0→1
-- =====================================================================

-- 幂等清理
DELETE FROM crm_customer WHERE id IN (20, 21, 22);

-- 周八(8) 2 个 + testuser01(9) 1 个,均私海(in_pool=0)
INSERT INTO crm_customer (id, name, customer_no, level, source, status, industry, owner_id, follower_id, in_pool, collection_time, created_at, updated_at) VALUES
  (20, '周八客户A(DEPT测试)',     'KH_TEST_003', 'A', '1', 1, 'IT', 8, 8, 0, NOW(), NOW(), NOW()),
  (21, '周八客户B(DEPT测试)',     'KH_TEST_004', 'B', '2', 1, 'IT', 8, 8, 0, NOW(), NOW(), NOW()),
  (22, 'testuser01客户C(DEPT测试)', 'KH_TEST_005', 'C', '3', 1, 'IT', 9, 9, 0, NOW(), NOW(), NOW());
