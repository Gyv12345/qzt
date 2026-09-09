-- =====================================================================
-- fix_approval_flow_2026-09-09.sql
-- 用途:修复第十二轮回归(2026-09-09)确认的审批流数据缺陷
--   1) R9-① CONTRACT v19 节点61 approver_type=DEPT_LEADER 为引擎不认的旧枚举
--      (引擎现已加别名兼容,本 SQL 同时把数据修为 USER[5],与节点62口径一致)
--   2) R11-② TRIP v9 节点30 / LEAVE v8 节点27 "主管审批"节点缺 approver 配置行
--      → 审批人解析为空 → 默认 AUTO_PASS 秒批;补配 USER[5](销售经理 wangwu)
--   3) LOAN 现行版本节点93 approver_type=MEMBER 但列表为空 → 同样空转 AUTO_PASS;
--      补配 [5] 并把 empty_approver_action 收紧为 REJECT
-- 说明:审批人解析每次提审实时查库,本 SQL 执行后即时生效,无需重启。
-- 执行方式:DBX MCP(单语句逐条执行)或手动 mysql。
-- 幂等性:UPDATE 天然幂等;INSERT 使用 ON DUPLICATE KEY UPDATE(主键=节点ID 共享)。
-- 关联代码:qzt-go-server internal/module/approval/service/approval.go
--          (旧枚举 DEPT_LEADER/USER 别名兼容 + 无配置行节点 fail-fast 驳回)
-- =====================================================================

-- 1) R9-① CONTRACT 节点61:DEPT_LEADER→USER[5],节点名同步改口径
UPDATE approval_node SET name = '经理审批', updated_at = NOW(3) WHERE id = 61 AND name = '部门领导审批';
UPDATE approval_node_approver SET approver_type = 'USER', approver_list = '[5]', updated_at = NOW(3)
WHERE id = 61 AND approver_type = 'DEPT_LEADER';

-- 2) R11-② TRIP v9 节点30 "主管审批" 补审批人(销售经理 wangwu, uid=5)
INSERT INTO approval_node_approver
  (id, flow_version_id, approval_type, multi_approver_mode, empty_approver_action,
   same_submitter_action, approver_type, approver_list, created_at, updated_at)
VALUES
  (30, 9, 'SEQUENCE', 'ALL', 'REJECT', 'SKIP', 'USER', '[5]', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  approver_type = IF(approver_list IN ('', '[]'), VALUES(approver_type), approver_type),
  approver_list = IF(approver_list IN ('', '[]'), VALUES(approver_list), approver_list),
  empty_approver_action = IF(approver_list IN ('', '[]'), VALUES(empty_approver_action), empty_approver_action),
  updated_at = NOW(3);

-- 3) R11-② 同款 LEAVE v8 节点27 "主管审批" 补审批人
INSERT INTO approval_node_approver
  (id, flow_version_id, approval_type, multi_approver_mode, empty_approver_action,
   same_submitter_action, approver_type, approver_list, created_at, updated_at)
VALUES
  (27, 8, 'SEQUENCE', 'ALL', 'REJECT', 'SKIP', 'USER', '[5]', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  approver_type = IF(approver_list IN ('', '[]'), VALUES(approver_type), approver_type),
  approver_list = IF(approver_list IN ('', '[]'), VALUES(approver_list), approver_list),
  empty_approver_action = IF(approver_list IN ('', '[]'), VALUES(empty_approver_action), empty_approver_action),
  updated_at = NOW(3);

-- 4) LOAN 现行版本节点93:MEMBER 空列表 → 补 [5],空审批人动作收紧为 REJECT
UPDATE approval_node_approver SET approver_list = '[5]', empty_approver_action = 'REJECT', updated_at = NOW(3)
WHERE id = 93 AND approver_type = 'MEMBER' AND COALESCE(approver_list, '') IN ('', '[]');

-- 备注:MEETING_BOOKING(节点97)/OA_CUSTOM(节点43)同样存在 MEMBER[] + AUTO_PASS 空转,
-- 因涉及具体业务口径未擅自改数据,保持现状并已在回归报告中记录。
