-- approval_flow_contract_fix.sql — 修复合同审批流程(v5)的坏条件分支拓扑。
--
-- 背景(2026-08-16 走查发现):v5 形态为 单条件节点(空规则)连两条边到两个审批节点,
-- 运行时永远走 sort 第一条(部门领导审批),经理审批分支不可达;且空规则流程此前可保存。
-- 修复后语义:合同金额 > 10000 → 经理审批;否则 → 部门领导审批(兜底分支)。
-- 前置确认:执行时 v5 无 APPROVING 状态实例(可原地改;若有请先等实例完结)。
--
-- 执行方式:DBX/手动 mysql 单条执行;无需重启(流程数据运行时按版本读取)。
-- 回滚:
--   UPDATE approval_node_link SET from_node_id = 16, sort = 2 WHERE id = 8;
--   UPDATE approval_node_condition SET condition_config = '' WHERE id = 16;

-- 1. n1(金额条件判断)补上规则:金额 > 10000
UPDATE approval_node_condition
SET condition_config = '{"logic":"AND","conditions":[{"field":"total_amount","op":"GT","value":"10000"}]}'
WHERE id = 16 AND flow_version_id = 5;

-- 2. 原 n1→n2 改为 start→n2:分叉点挪到开始节点,形成「条件分支 + 兜底分支」
--    (n1 条件满足 → n3 经理审批;条件不满足 → n2 部门领导审批)
UPDATE approval_node_link SET from_node_id = 15, sort = 3 WHERE id = 8 AND flow_version_id = 5;

-- 3. 手造数据的类型笔误:APPROVAL → 标准值 APPROVER(否则前端节点样式落入「默认」灰)
UPDATE approval_node SET node_type = 'APPROVER'
WHERE flow_version_id = 5 AND node_type = 'APPROVAL' AND deleted_at IS NULL;
