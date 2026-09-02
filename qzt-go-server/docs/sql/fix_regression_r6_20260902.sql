-- ============================================================================
-- fix_regression_r6_20260902.sql — 第六轮全流程回归缺陷修复(数据部分)
-- ----------------------------------------------------------------------------
-- R6-③ EXPENSE 报销审批流「部门审批」节点(node 90, 当前版本 25)为整节点 AUTO_PASS,
--   任何报销单提交即秒批,无人工把关(第1轮回归建议④)。改为与 CONTRACT 流一致的
--   部门领导审批:SEQUENCE + DEPT_LEADER + 空审批人 REJECT + 提交人本人 SKIP。
--   生效后:员工提交报销 → 本部门组长待办审批 → 通过才 APPROVED。
-- 注意:仅改 EXPENSE;LEAVE/LOAN/TRIP 仍为 AUTO_PASS(是否配置真实审批人待业务决策)。
-- 执行:DBX 逐条执行;纯数据变更无需重启 qzt-server。
-- ============================================================================

-- R6-③ EXPENSE 流「部门审批」节点改为部门领导审批。
--   注意 approver_type 必须用引擎枚举 DEPT_HEAD(constants.go),不是 CONTRACT 流节点 61
--   里的旧值 DEPT_LEADER(该值走 resolveApprovers default 分支解析为空审批人;
--   CONTRACT 流因条件节点把路径全导向节点 62 才从未触发,节点 61 仍是颗待修地雷)。
UPDATE approval_node_approver
SET approval_type = 'SEQUENCE',
    approver_type = 'DEPT_HEAD',
    approver_list = '[]',
    multi_approver_mode = 'ALL',
    empty_approver_action = 'REJECT',
    same_submitter_action = 'SKIP'
WHERE id = 90
  AND flow_version_id = 25
  AND approval_type = 'AUTO_PASS';
