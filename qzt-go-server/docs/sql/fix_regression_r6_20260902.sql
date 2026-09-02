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

-- R7-①(2026-09-02 补) EXPENSE 改部门领导审批后发现:sale 角色无「审批中心」菜单(131),
--   组长(zhangsan/lisi=sale)收到审批待办但页面 404,审批链 UI 断裂。补授:
--   131 审批中心(目录) + 132 我的待办 + 135 我的已办 + 136 我发起的(不含 138 流程管理)。
--   执行后需清权限缓存:redis DEL qzt:perm:user:3 qzt:perm:user:4(sale 角色用户)或等 10 分钟 TTL。
INSERT IGNORE INTO sys_role_menu (sys_role_id, sys_menu_id) VALUES (3, 131), (3, 132), (3, 135), (3, 136);
INSERT IGNORE INTO sys_role_menu (sys_role_id, sys_menu_id) VALUES (3, 133), (3, 134);
-- (133=审批通过 134=审批驳回 按钮权限,同为 sale 缺失项)
