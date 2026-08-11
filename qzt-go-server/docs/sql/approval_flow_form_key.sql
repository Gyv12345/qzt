-- approval_flow_form_key.sql — approval_flow 增加 form_key 维度。
--
-- 用途: OA_CUSTOM 自定义表单从「全类型共享一条审批流」改为「每个表单模板一条审批流」。
-- 唯一索引由 form_type 单列改为 (form_type, form_key) 复合;form_key='' 表示该类型的通用流程(向后兼容,
-- 提审时找不到模板专属启用流程会回退到通用流程)。
--
-- 执行方式: 手动通过 DBX MCP 或 mysql 执行(只需执行一次,非幂等,重复执行会报列/索引已存在)。
-- 影响: 已有数据 form_key 默认为 '', 原 form_type 唯一性在复合索引下依然成立,无数据迁移风险。

ALTER TABLE approval_flow
  ADD COLUMN form_key VARCHAR(64) NOT NULL DEFAULT '' COMMENT '表单标识(OA_CUSTOM 按模板细分,空=通用)' AFTER form_type;

ALTER TABLE approval_flow DROP INDEX uk_flow_form_type;

ALTER TABLE approval_flow ADD UNIQUE KEY uk_flow_form_type (form_type, form_key);
