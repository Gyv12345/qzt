-- ai_scenes_retire.sql
-- 用途:下线「AI 场景」独立页面(sys_menu 2364,path=/ai/scenes,component=ai/scenes/index)。
--   AI 能力的入口从 2026-11-24 起分散到各业务页面:
--     经营洞察 → 工作台(指标区下方,仅对能看销售趋势的角色显示)
--     审批摘要 → 审批待办页「AI 摘要」
--     日报生成 → 工作日志页「AI 日报」(可填入新建日志)
--     跟进草稿(新增) → 客户/线索详情「快速写跟进」与跟进计划「转跟进记录」表单的「AI 起草」
--   场景接口 POST /api/ai/agents/:scenario/run 不变,只是不再有独立页面。
-- 影响面:只删菜单行与角色授权(原授权角色 1,3,4,9,10);2364 没有 sys_menu_api 关联,无页面数据。
-- 幂等:DELETE 不存在的行无副作用,可重复执行。执行后用户重新登录或刷新页面生效。
-- 基线说明:本文件两条 DELETE 已追加到 qztgo.sql 与服务器 demo_baseline.sql 尾部——
--   菜单行仍留在基线上方的初始 INSERT 里,重放基线时由尾部语句统一清除。
--   (不要去改上方那条超长的 sys_menu INSERT:整行手改风险高,尾部清除语句更稳。)
-- 执行方式:DBX MCP 连接「我的阿里云数据库」,database=qztgo,整段执行。

DELETE FROM `sys_role_menu` WHERE `sys_menu_id` = 2364;
DELETE FROM `sys_menu` WHERE `id` = 2364;
