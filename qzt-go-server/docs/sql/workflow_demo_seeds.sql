-- =====================================================================
-- workflow_demo_seeds.sql — 自动化工作流 DEMO 演示种子（3 条停用态示例流）
-- 用途: 补回 R68 回归发现的 workflow 种子缺失(D3)。历史种子 9/12/24 为
--       EP02 会话经 API 创建,从未入 workflow.sql/基线,11-18 前后被误删且
--       基线 R66 workflow append 段只有 DDL 鼃 INSERT — 周一重置不自愈。
-- 执行: DBX 执行本文件单条 INSERT(SELECT...WHERE NOT EXISTS 幂等),或
--       手动 mysql < workflow_demo_seeds.sql
-- 口径: enabled=0 默认停用(演示时可启用,与 EP id=10 DEMO 流同口径);
--       notify receiver=3(zhangsan);graph=JSON 字符串(引擎契约)。
-- =====================================================================

-- 种子 1(id=9): 新线索入库提醒
INSERT INTO `workflow_definition` (`id`, `name`, `trigger_type`, `trigger_config`, `graph`, `enabled`, `owner_id`, `created_at`, `updated_at`)
SELECT 9, 'DEMO-新线索入库提醒', 'EVENT', '{"event":"crm.lead.created"}',
       '{"nodes":[{"number":"1","name":"触发","node_type":"TRIGGER","config":{}},{"number":"2","name":"通知","node_type":"ACTION","config":{"action":"notify","receiver":"3","title":"新线索入库提醒","content":"有新线索进入公海,请及时领取跟进。"}},{"number":"3","name":"结束","node_type":"END"}],"links":[{"from":"1","to":"2"},{"from":"2","to":"3"}]}',
       0, 3, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `workflow_definition` WHERE `id` = 9);

-- 种子 2(id=12): 新客户建档通知
INSERT INTO `workflow_definition` (`id`, `name`, `trigger_type`, `trigger_config`, `graph`, `enabled`, `owner_id`, `created_at`, `updated_at`)
SELECT 12, 'DEMO-新客户建档通知', 'EVENT', '{"event":"crm.customer.created"}',
       '{"nodes":[{"number":"1","name":"触发","node_type":"TRIGGER","config":{}},{"number":"2","name":"通知","node_type":"ACTION","config":{"action":"notify","receiver":"3","title":"新客户建档通知","content":"新客户已建档,请安排跟进计划。"}},{"number":"3","name":"结束","node_type":"END"}],"links":[{"from":"1","to":"2"},{"from":"2","to":"3"}]}',
       0, 3, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `workflow_definition` WHERE `id` = 12);

-- 种子 3(id=24): 回款登记通知
INSERT INTO `workflow_definition` (`id`, `name`, `trigger_type`, `trigger_config`, `graph`, `enabled`, `owner_id`, `created_at`, `updated_at`)
SELECT 24, 'DEMO-回款登记通知', 'EVENT', '{"event":"crm.payment.created"}',
       '{"nodes":[{"number":"1","name":"触发","node_type":"TRIGGER","config":{}},{"number":"2","name":"通知","node_type":"ACTION","config":{"action":"notify","receiver":"3","title":"回款登记通知","content":"合同有新回款登记,请核对凭证。"}},{"number":"3","name":"结束","node_type":"END"}],"links":[{"from":"1","to":"2"},{"from":"2","to":"3"}]}',
       0, 3, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `workflow_definition` WHERE `id` = 24);
