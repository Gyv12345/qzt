-- approval_preset.sql — 审批流预置流程种子。
--
-- 用途: 为全部 13 种 form_type 预置审批流程(is_preset=1, 默认不启用)。
-- 预置流程不可删除(后端无删除接口), 用户在各业务模块配置区启用/设计。
--
-- 执行方式: 手动通过 DBX MCP 或 mysql 执行(幂等, 已存在 form_type 则跳过)。
-- 前置条件: approval_flow 表已加 is_preset 列(ALTER TABLE approval_flow ADD COLUMN is_preset tinyint DEFAULT 0)。

-- 1. 已有的流程标记为预置
UPDATE approval_flow SET is_preset = 1 WHERE is_preset = 0;

-- 2. 插入缺失的预置流程(INSERT IGNORE 靠 uk_flow_form_type 唯一索引去重)
INSERT IGNORE INTO approval_flow
  (current_version_id, number, name, form_type, enable, is_preset,
   create_execute, update_execute, submitter_can_revoke,
   allow_batch_process, allow_withdraw, allow_add_sign,
   duplicate_approver_rule, require_comment)
VALUES
  (NULL, '', '发票审批',     'INVOICE',        0, 1, 1,1,1, 0,0,0, 'FIRST_ONLY', 0),
  (NULL, '', '采购订单审批', 'PURCHASE_ORDER',  0, 1, 1,1,1, 0,0,0, 'FIRST_ONLY', 0),
  (NULL, '', '销售订单审批', 'SALES_ORDER',     0, 1, 1,1,1, 0,0,0, 'FIRST_ONLY', 0),
  (NULL, '', '采购退货审批', 'PURCHASE_RETURN', 0, 1, 1,1,1, 0,0,0, 'FIRST_ONLY', 0),
  (NULL, '', '销售退货审批', 'SALES_RETURN',    0, 1, 1,1,1, 0,0,0, 'FIRST_ONLY', 0),
  (NULL, '', '会议预订审批', 'MEETING_BOOKING', 0, 1, 1,1,1, 0,0,0, 'FIRST_ONLY', 0),
  (NULL, '', '自定义表单审批','OA_CUSTOM',      0, 1, 1,1,1, 0,0,0, 'FIRST_ONLY', 0);
