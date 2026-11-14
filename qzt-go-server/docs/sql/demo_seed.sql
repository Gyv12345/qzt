-- ============================================================
-- demo_seed.sql —— 公开演示数据集(P29 公开演示模式配套)
--
-- 用途: 给公开试用的 admin 账号一份"活的"演示数据(CRM 链路:线索→客户→商机→合同→回款),
--       全部 DEMO- 前缀、归属 zhangsan(id=3),与 /p/demo 页口径一致;幂等(先按 DEMO 前缀删后插)。
-- 依赖: crm_lead_pool/crm_customer_pool 有 is_default=1 默认公海;sys_user id=3 zhangsan。
-- 执行: DBX 逐条执行;**本文件内容已同步并入 docs/sql/qztgo.sql 基线尾部**,
--       每周 demoWeeklyReset 重放基线时会自动恢复本数据集。
-- ============================================================

-- ── 幂等清理(只清 DEMO 前缀,不碰真实/其他数据) ──
DELETE FROM `crm_contract_payment_record` WHERE `contract_id` IN (SELECT id FROM crm_contract WHERE contract_no LIKE 'DEMO%');
DELETE FROM `crm_contract_payment_plan` WHERE `contract_id` IN (SELECT id FROM crm_contract WHERE contract_no LIKE 'DEMO%');
DELETE FROM `crm_contract` WHERE `contract_no` LIKE 'DEMO%';
DELETE FROM `crm_opportunity` WHERE `opportunity_no` LIKE 'DEMO%';
DELETE FROM `crm_customer` WHERE `customer_no` LIKE 'DEMO%';
DELETE FROM `crm_lead` WHERE `lead_no` LIKE 'DEMO%';

-- ── 线索 ×8(4 私海归 zhangsan + 4 公海;级别/来源/行业取字典值) ──
INSERT INTO `crm_lead`
  (`name`, `lead_no`, `contact_name`, `phone`, `email`, `company`, `level`, `source`, `status`, `industry`, `owner_id`, `in_pool`, `pool_id`, `remark`, `created_at`, `updated_at`)
VALUES
  ('DEMO-洛阳恒达机械(测试)', 'DEMOLH20261101001', '王经理', '13800000101', 'demo1@example.com', '洛阳恒达机械有限公司', 'B', '2', 1, '装备制造', 3, 0, NULL, '演示线索:询价一体化平台', NOW(3), NOW(3)),
  ('DEMO-郑州华夏食品(测试)', 'DEMOLH20261101002', '李主管', '13800000102', 'demo2@example.com', '郑州华夏食品有限公司', 'A', '2', 2, '食品加工', 3, 0, NULL, '演示线索:多模块演示', NOW(3), NOW(3)),
  ('DEMO-苏州精工科技(测试)', 'DEMOLH20261101003', '陈工', '13800000103', 'demo3@example.com', '苏州精工科技有限公司', 'A', '1', 2, '精密制造', 3, 0, NULL, '演示线索:审批+进销存全流程', NOW(3), NOW(3)),
  ('DEMO-佛山通达商贸(测试)', 'DEMOLH20261101004', '林经理', '13800000104', 'demo4@example.com', '佛山市通达商贸有限公司', 'B', '3', 1, '批发零售', 3, 0, NULL, '演示线索:合同回款演示', NOW(3), NOW(3)),
  ('DEMO-公海线索·合肥皖美包装', 'DEMOLH20261101005', '赵总', '13800000105', 'demo5@example.com', '合肥皖美包装有限公司', 'B', '1', 1, '包装印刷', NULL, 1, (SELECT id FROM crm_lead_pool WHERE is_default=1 AND deleted_at IS NULL LIMIT 1), '演示公海线索,可领取', NOW(3), NOW(3)),
  ('DEMO-公海线索·东莞锦盛五金', 'DEMOLH20261101006', '黄厂长', '13800000106', 'demo6@example.com', '东莞市锦盛五金制品有限公司', 'C', '2', 1, '五金加工', NULL, 1, (SELECT id FROM crm_lead_pool WHERE is_default=1 AND deleted_at IS NULL LIMIT 1), '演示公海线索,可领取', NOW(3), NOW(3)),
  ('DEMO-公海线索·无锡联信电子', 'DEMOLH20261101007', '周工', '13800000107', 'demo7@example.com', '无锡联信电子科技有限公司', 'B', '3', 1, '电子信息', NULL, 1, (SELECT id FROM crm_lead_pool WHERE is_default=1 AND deleted_at IS NULL LIMIT 1), '演示公海线索,可领取', NOW(3), NOW(3)),
  ('DEMO-公海线索·常州瑞丰纺织', 'DEMOLH20261101008', '吴经理', '13800000108', 'demo8@example.com', '常州市瑞丰纺织有限公司', 'C', '1', 1, '纺织制造', NULL, 1, (SELECT id FROM crm_lead_pool WHERE is_default=1 AND deleted_at IS NULL LIMIT 1), '演示公海线索,可领取', NOW(3), NOW(3));

-- ── 客户 ×5(3 私海归 zhangsan + 2 公海;customer_no 前缀 DEMOKH;crm_customer 无 remark 列) ──
INSERT INTO `crm_customer`
  (`name`, `customer_no`, `level`, `source`, `status`, `industry`, `owner_id`, `in_pool`, `pool_id`, `created_at`, `updated_at`)
VALUES
  ('DEMO-洛阳恒达机械有限公司(测试)', 'DEMOKH20261101001', 'A', '2', 1, '装备制造', 3, 0, NULL, NOW(3), NOW(3)),
  ('DEMO-郑州华夏食品有限公司(测试)', 'DEMOKH20261101002', 'A', '2', 1, '食品加工', 3, 0, NULL, NOW(3), NOW(3)),
  ('DEMO-苏州精工科技有限公司(测试)', 'DEMOKH20261101003', 'A', '1', 1, '精密制造', 3, 0, NULL, NOW(3), NOW(3)),
  ('DEMO-公海客户·佛山通达商贸(测试)', 'DEMOKH20261101004', 'B', '3', 1, '批发零售', NULL, 1, (SELECT id FROM crm_customer_pool WHERE is_default=1 AND deleted_at IS NULL LIMIT 1), NOW(3), NOW(3)),
  ('DEMO-公海客户·合肥皖美包装(测试)', 'DEMOKH20261101005', 'B', '1', 1, '包装印刷', NULL, 1, (SELECT id FROM crm_customer_pool WHERE is_default=1 AND deleted_at IS NULL LIMIT 1), NOW(3), NOW(3));

-- ── 商机 ×4(归 zhangsan,阶段跨漏斗各档) ──
INSERT INTO `crm_opportunity`
  (`name`, `opportunity_no`, `customer_id`, `expected_amount`, `stage`, `probability`, `owner_id`, `description`, `created_at`, `updated_at`)
VALUES
  ('DEMO-恒达机械一体化平台采购(测试)', 'DEMOSJ20261101001', (SELECT id FROM crm_customer WHERE customer_no='DEMOKH20261101001'), 12000.00, 'PROSPECTING', 20, 3, '演示商机:初步接触', NOW(3), NOW(3)),
  ('DEMO-华夏食品管理系统(测试)', 'DEMOSJ20261101002', (SELECT id FROM crm_customer WHERE customer_no='DEMOKH20261101002'), 8000.00, 'QUALIFIED', 40, 3, '演示商机:需求确认', NOW(3), NOW(3)),
  ('DEMO-精工科技全模块部署(测试)', 'DEMOSJ20261101003', (SELECT id FROM crm_customer WHERE customer_no='DEMOKH20261101003'), 15000.00, 'PROPOSAL', 60, 3, '演示商机:方案报价', NOW(3), NOW(3)),
  ('DEMO-通达商贸二期扩容(测试)', 'DEMOSJ20261101004', (SELECT id FROM crm_customer WHERE customer_no='DEMOKH20261101004'), 5000.00, 'NEGOTIATION', 80, 3, '演示商机:商务谈判', NOW(3), NOW(3));

-- ── 合同 ×4(2 签署执行中+1 待审+1 赢单可回款;金额单位元) ──
INSERT INTO `crm_contract`
  (`name`, `contract_no`, `customer_id`, `opportunity_id`, `total_amount`, `received_amount`, `stage`, `owner_id`, `start_date`, `end_date`, `created_at`, `updated_at`)
VALUES
  ('DEMO-恒达机械平台实施合同(测试)', 'DEMOHT20261101001', (SELECT id FROM crm_customer WHERE customer_no='DEMOKH20261101001'), (SELECT id FROM crm_opportunity WHERE opportunity_no='DEMOSJ20261101001'), 12000.00, 0.00, 'APPROVAL', 3, '2026-11-15', '2027-11-14', NOW(3), NOW(3)),
  ('DEMO-华夏食品年度服务合同(测试)', 'DEMOHT20261101002', (SELECT id FROM crm_customer WHERE customer_no='DEMOKH20261101002'), (SELECT id FROM crm_opportunity WHERE opportunity_no='DEMOSJ20261101002'), 8000.00, 4000.00, 'EXECUTING', 3, '2026-11-05', '2027-11-04', NOW(3), NOW(3)),
  ('DEMO-精工科技部署服务合同(测试)', 'DEMOHT20261101003', (SELECT id FROM crm_customer WHERE customer_no='DEMOKH20261101003'), (SELECT id FROM crm_opportunity WHERE opportunity_no='DEMOSJ20261101003'), 15000.00, 15000.00, 'EXECUTING', 3, '2026-10-20', '2026-12-31', NOW(3), NOW(3)),
  ('DEMO-通达商贸扩容合同(测试)', 'DEMOHT20261101004', (SELECT id FROM crm_customer WHERE customer_no='DEMOKH20261101004'), (SELECT id FROM crm_opportunity WHERE opportunity_no='DEMOSJ20261101004'), 5000.00, 0.00, 'SIGNED', 3, '2026-11-10', '2026-12-31', NOW(3), NOW(3));

-- ── 回款计划 ×3 + 回款记录 ×1(记录须同步累计合同 received_amount) ──
INSERT INTO `crm_contract_payment_plan`
  (`contract_id`, `plan_date`, `plan_amount`, `remark`, `created_at`, `updated_at`)
SELECT c.id, '2026-12-01', 6000.00, '演示回款计划:尾款', NOW(3), NOW(3) FROM crm_contract c WHERE c.contract_no='DEMOHT20261101001'
UNION ALL
SELECT c.id, '2026-11-20', 4000.00, '演示回款计划:第二期', NOW(3), NOW(3) FROM crm_contract c WHERE c.contract_no='DEMOHT20261101002'
UNION ALL
SELECT c.id, '2027-01-15', 9000.00, '演示回款计划:验收款', NOW(3), NOW(3) FROM crm_contract c WHERE c.contract_no='DEMOHT20261101003';

INSERT INTO `crm_contract_payment_record`
  (`contract_id`, `amount`, `received_date`, `method`, `remark`, `created_at`, `updated_at`)
SELECT c.id, 4000.00, '2026-11-08', '银行转账', '演示回款:首付款', NOW(3), NOW(3) FROM crm_contract c WHERE c.contract_no='DEMOHT20261101002';

