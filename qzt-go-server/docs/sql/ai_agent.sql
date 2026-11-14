-- ai_agent.sql
-- 用途:P30-#3 AI 场景智能体(后端)——
--   ① AI 模型控制台:新表 ai_model(多模型档案,单条 is_default=1 生效可热切换,
--      启动时 app 侧 llmboot.InitLLM 优先读生效档案,表空播种 env 档案),
--      后台「AI 助手 → AI 模型」页面管理(系统模块路由 /system/ai/models,
--      写操作挂 DemoSystemWriteGuard frozen 组:模型切换绝不能被演示访客操作)。
--   ② 场景智能体端点 POST /api/ai/agents/:scenario/run 仅 JWT+ai.chat_enabled 开关
--      (同 /api/ai/chat 口径,不进 RBAC 组),本文件不为其登记 sys_api(管理页
--      不可见即可,如需登记可用 sys_api 877,种子见文件尾注释)。
-- ID 区间:
--   sys_api  871-876(6 条:列表/新建/更新/删除/启用热切换/当前生效)
--   sys_menu 2359(AI 模型页面,挂 2316「AI 助手」目录下,sort=2)
--            2360 保存 / 2361 删除 / 2362 启用 / 2363 查看当前生效(按钮)
-- 本文件不写任何含 api_key 的档案种子行(key 由启动时从 .env 播种或后台录入)。
-- 执行方式:通过 DBX MCP 或手动 mysql 连 qztgo 库逐条执行(幂等:
--   CREATE TABLE IF NOT EXISTS + 先 DELETE 固定 ID 区间再 INSERT;勿用 PREPARE 块)。
-- 外键依赖顺序:先 sys_menu_api / sys_role_menu,再 sys_menu / sys_api。

-- ============================================================
-- 1. ai_model —— AI 模型档案表
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_model` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '显示名',
  `base_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'OpenAI兼容端点根地址(如 https://api.deepseek.com)',
  `api_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '供应商API Key(列表脱敏只回****+尾4位)',
  `model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模型标识(如 deepseek-chat)',
  `is_default` tinyint NOT NULL DEFAULT '0' COMMENT '是否当前生效(全表仅一条为1)',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用(0=停用档案不可激活)',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '备注',
  `created_at` datetime(3) DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime(3) DEFAULT NULL COMMENT '更新时间',
  `deleted_at` datetime(3) DEFAULT NULL COMMENT '删除时间(软删除)',
  PRIMARY KEY (`id`),
  KEY `idx_ai_model_created_at` (`created_at`),
  KEY `idx_ai_model_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 模型档案(单条 is_default=1 生效可热切换)';

-- ============================================================
-- 2. sys_api —— AI 模型控制台接口(871-876)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2359 AND 2363;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2359 AND 2363;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2359 AND 2363;
DELETE FROM `sys_api` WHERE `id` BETWEEN 871 AND 876;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (871, '/system/ai/models',              'GET',    'AI模型', 'AI 模型档案列表',        NOW(3), NOW(3)),
  (872, '/system/ai/models',              'POST',   'AI模型', '新建 AI 模型档案',       NOW(3), NOW(3)),
  (873, '/system/ai/models/:id',          'PUT',    'AI模型', '更新 AI 模型档案',       NOW(3), NOW(3)),
  (874, '/system/ai/models/:id',          'DELETE', 'AI模型', '删除 AI 模型档案',       NOW(3), NOW(3)),
  (875, '/system/ai/models/:id/activate', 'POST',   'AI模型', '启用 AI 模型档案(热切换)', NOW(3), NOW(3)),
  (876, '/system/ai/models/current',      'GET',    'AI模型', '当前生效 AI 模型档案(含来源)', NOW(3), NOW(3));

-- ============================================================
-- 3. sys_menu —— 「AI 模型」页面菜单(2359,挂 2316 AI 助手,sort=2) + 按钮(2360-2363)
-- ============================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2359, 2316, 'AI 模型', '/ai/models', 'ai/model/index', 'ApiOutlined', 2, 1, 'system:ai:model:list',      1, 1, NOW(3), NOW(3)),
  (2360, 2359, '保存档案', NULL, NULL, NULL, 1, 2, 'system:ai:model:save',     1, 1, NOW(3), NOW(3)),
  (2361, 2359, '删除档案', NULL, NULL, NULL, 2, 2, 'system:ai:model:delete',   1, 1, NOW(3), NOW(3)),
  (2362, 2359, '启用档案', NULL, NULL, NULL, 3, 2, 'system:ai:model:activate', 1, 1, NOW(3), NOW(3)),
  (2363, 2359, '查看生效', NULL, NULL, NULL, 4, 2, 'system:ai:model:current',  1, 1, NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu_api —— 菜单(含按钮)与 API 关联
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2359, 871),  -- 列表页 → GET /system/ai/models
  (2360, 872),  -- 保存(新建) → POST /system/ai/models
  (2360, 873),  -- 保存(更新) → PUT /system/ai/models/:id
  (2361, 874),  -- 删除 → DELETE /system/ai/models/:id
  (2362, 875),  -- 启用 → POST /system/ai/models/:id/activate
  (2363, 876);  -- 查看当前生效 → GET /system/ai/models/current

-- ============================================================
-- 5. sys_role_menu —— 授超管(role id=1)菜单链 2316 → 2359(含按钮)
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id IN (2316, 2359, 2360, 2361, 2362, 2363)
WHERE r.id = 1
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- 验证:菜单/API 各 5/6 条,menu_api 6 条,role_menu 6 条(2316 已存在则 5 条新绑定)
-- SELECT COUNT(*) FROM sys_menu WHERE id BETWEEN 2359 AND 2363;
-- SELECT COUNT(*) FROM sys_api WHERE id BETWEEN 871 AND 876;
-- SELECT COUNT(*) FROM sys_menu_api WHERE sys_menu_id BETWEEN 2359 AND 2363;
-- SELECT COUNT(*) FROM sys_role_menu WHERE sys_menu_id IN (2316,2359,2360,2361,2362,2363) AND sys_role_id = 1;

-- ------------------------------------------------------------
-- (可选,默认不执行)场景智能体端点登记 RBAC 管理页可见(实际鉴权仅 JWT+开关):
-- INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
--   (877, '/api/ai/agents/:scenario/run', 'POST', 'AI', 'AI 场景智能体运行(insight/approval-summary/daily-report)', NOW(3), NOW(3));
