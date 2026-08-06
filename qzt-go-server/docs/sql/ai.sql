-- ============================================================
-- ai.sql — AI 助手模块建表 + 种子(Agent定义/系统配置/菜单/API)
-- ------------------------------------------------------------
-- 作用: 1. 建 ai_agent 表(AI Agent 定义)
--       2. 写入 3 个内置 Agent(回访话术/跟进记录/日报周报)
--       3. 写入 AI 全局连接配置(sys_config group=ai)
--       4. 写入菜单(sys_menu) + API(sys_api) + 权限关联
-- 遵循工作区 AGENTS.md「种子数据与建表」约定:业务建表 DDL + 种子一律走 SQL。
-- 幂等: CREATE TABLE IF NOT EXISTS + INSERT ... ON DUPLICATE KEY UPDATE,
--       固定 ID 区间先 DELETE 再 INSERT,可重复执行。
-- 执行方式(用户手动):
--   mysql -h <host> -P 3306 -u <user> -p qztgo < docs/sql/ai.sql
-- ID 分配(执行前: max(api)=366, max(menu)=604, max(dict)=27):
--   sys_api  : 400~413 (AI 模块接口)
--   sys_menu : 610~625 (AI 助手目录/页面/按钮)
-- ============================================================

-- ── 1. ai_agent 表 ──
CREATE TABLE IF NOT EXISTS `ai_agent` (
  `id`            bigint unsigned NOT NULL AUTO_INCREMENT,
  `name`          varchar(100) NOT NULL COMMENT 'Agent名称',
  `code`          varchar(64)  NOT NULL COMMENT 'Agent编码(唯一)',
  `scene`         varchar(32)  NOT NULL COMMENT '场景: script回访话术/follow跟进记录/report日报周报',
  `system_prompt` text         NOT NULL COMMENT '系统提示词',
  `user_prompt`   text                  COMMENT '用户提示词模板(可含 {{变量}} 占位符)',
  `model`         varchar(64)  DEFAULT NULL COMMENT '指定模型(空=用全局配置)',
  `temperature`   float        DEFAULT NULL COMMENT '温度(空=用全局配置)',
  `status`        tinyint      DEFAULT 1   COMMENT '1启用 0停用',
  `sort`          int          DEFAULT 0,
  `created_at`    datetime(3)  DEFAULT NULL,
  `updated_at`    datetime(3)  DEFAULT NULL,
  `deleted_at`    datetime(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_scene` (`scene`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI Agent 定义';

-- ── 2. 内置 Agent 种子(幂等:按 code 删除后插入) ──
-- 用固定 id 1/2/3 方便代码引用
DELETE FROM `ai_agent` WHERE `id` IN (1, 2, 3);

INSERT INTO `ai_agent` (`id`, `name`, `code`, `scene`, `system_prompt`, `user_prompt`, `temperature`, `status`, `sort`, `created_at`, `updated_at`) VALUES
(1, '回访话术助手', 'script', 'script',
'你是一名资深销售教练。根据客户/线索信息和当前阶段,生成 3 条差异化的回访话术。\n要求:\n1. 语气自然、专业,符合中文沟通习惯\n2. 3 条话术分别侧重:建立信任、挖掘需求、促成行动\n3. 每条话术标注适用场景(电话/微信)\n4. 控制在合理长度,适合实际使用',
'客户/线索信息:\n名称: {{name}}\n联系人: {{contact_name}}\n电话: {{phone}}\n公司: {{company}}\n级别: {{level}}\n来源: {{source}}\n行业: {{industry}}\n\n请基于以上信息生成 3 条回访话术。',
0.7, 1, 1, NOW(), NOW()),

(2, '跟进记录助手', 'follow', 'follow',
'你是一名销售助理。用户会粘贴一段与客户的聊天记录或通话摘要,你需要:\n1. 提取沟通要点(讨论了什么)\n2. 判断客户意向程度(高/中/低/无意向)\n3. 提取待办事项和下一步行动\n4. 生成一段简洁的跟进记录(100-200字,第三人称,适合录入CRM)\n\n输出格式:\n【沟通要点】...\n【客户意向】...\n【待办事项】...\n【跟进记录】...(这段可直接复制到CRM)',
'请分析以下对话记录并生成跟进记录:\n\n{{conversation}}',
0.3, 1, 2, NOW(), NOW()),

(3, '工作日报助手', 'report', 'report',
'你是一名销售团队主管。根据下属提交的工作数据(线索、跟进记录、商机等),生成一份工作总结报告。\n要求:\n1. 客观总结工作量和工作成果\n2. 分析亮点和不足\n3. 给出明天/下周的工作建议\n4. 语气鼓励、专业,适合直接提交给上级\n5. 用 Markdown 格式输出',
'报告周期: {{period}}\n\n工作数据:\n{{data}}\n\n请生成工作总结报告。',
0.7, 1, 3, NOW(), NOW());

-- ── 3. AI 全局连接配置(sys_config group=ai) ──
-- 幂等: 按 key 不存在才插入
INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'ai', 'ai.enabled', 'AI功能开关', 'true', 'boolean', 0, 1, 1, 1, '是否启用 AI 功能'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'ai.enabled');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'ai', 'ai.base_url', 'LLM Base URL', 'https://api.deepseek.com/v1', 'string', 0, 1, 1, 2, 'OpenAI 兼容接口地址(如 DeepSeek/通义千问/OpenAI)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'ai.base_url');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'ai', 'ai.api_key', 'LLM API Key', '', 'string', 0, 1, 1, 3, 'API 密钥(在后台填写)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'ai.api_key');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'ai', 'ai.model', '默认模型', 'deepseek-chat', 'string', 0, 1, 1, 4, '默认调用的模型名'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'ai.model');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'ai', 'ai.temperature', '默认温度', '0.7', 'float', 0, 1, 1, 5, '生成随机性 0-2'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'ai.temperature');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'ai', 'ai.max_tokens', '默认最大 token', '2000', 'int', 0, 1, 1, 6, '单次生成最大 token 数'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'ai.max_tokens');

-- ── 4. sys_api 种子(固定 ID 400-406,幂等:先 DELETE 再 INSERT) ──
DELETE FROM `sys_menu_api` WHERE `sys_api_id` BETWEEN 400 AND 406;
DELETE FROM `sys_api` WHERE `id` BETWEEN 400 AND 406;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`) VALUES
(400, '/ai/agents',          'GET',    'ai', 'AI Agent 管理列表'),
(401, '/ai/agents',          'POST',   'ai', '新建 AI Agent'),
(402, '/ai/agents/:id',      'PUT',    'ai', '编辑 AI Agent'),
(403, '/ai/agents/:id',      'DELETE', 'ai', '删除 AI Agent'),
(404, '/ai/chat/script',     'POST',   'ai', 'AI 生成回访话术'),
(405, '/ai/chat/follow',     'POST',   'ai', 'AI 生成跟进记录'),
(406, '/ai/chat/report',     'POST',   'ai', 'AI 生成工作日报/周报');

-- ── 5. sys_menu 种子(固定 ID 610-620,幂等:先 DELETE 再 INSERT) ──
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 610 AND 625;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 610 AND 625;

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `type`, `permission`, `sort`, `visible`, `status`) VALUES
-- 顶级目录:AI 助手
(610, 0,   'AI 助手',   '/ai',     NULL,                        'RobotOutlined', 0, NULL,                    8, 1, 1),
-- 页面
(611, 610, '日报周报',   '/ai/report', 'ai/report/index',       'FileTextOutlined', 1, 'ai:report:view',     1, 1, 1),
(612, 610, 'Agent管理', '/system/ai-agent', 'system/ai-agent/index', 'RobotOutlined', 1, 'ai:agent:list', 2, 1, 1),
(613, 610, 'AI配置',    '/system/ai-config', 'system/ai-config/index', 'SettingOutlined', 1, 'ai:config:view', 3, 1, 1),
-- 按钮
(614, 611, '生成报告',   '', NULL, NULL, 2, 'ai:report:generate', 1, 1, 1),
(615, 612, 'Agent列表',  '', NULL, NULL, 2, 'ai:agent:list',     1, 1, 1),
(616, 612, '新建Agent',  '', NULL, NULL, 2, 'ai:agent:add',      2, 1, 1),
(617, 612, '编辑Agent',  '', NULL, NULL, 2, 'ai:agent:edit',     3, 1, 1),
(618, 612, '删除Agent',  '', NULL, NULL, 2, 'ai:agent:delete',   4, 1, 1),
(619, 610, '回访话术',   '', NULL, NULL, 2, 'ai:script:generate', 10, 1, 1),
(620, 610, '跟进记录AI', '', NULL, NULL, 2, 'ai:follow:generate', 11, 1, 1);

-- ── 6. 菜单-API 关联(sys_menu_api) ──
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
-- Agent 管理页 -> API 400-403
(615, 400), (616, 401), (617, 402), (618, 403),
-- 日报周报 -> API 406
(614, 406),
-- 回访话术按钮 -> API 404
(619, 404),
-- 跟进记录AI按钮 -> API 405
(620, 405);

-- ── 7. 给超管角色(super_admin)授权新菜单(幂等) ──
-- super_admin 通过 Casbin 策略 *:* 自动拥有所有权限,无需额外授权。
-- 若有其他角色需要 AI 权限,在后台「角色管理 → 菜单授权」里勾选即可。

-- ── 完成 ──
SELECT 'ai.sql 执行完成: ai_agent 表已建, 3 个内置 Agent + 6 条 AI 配置 + 菜单/API 已写入' AS result;
