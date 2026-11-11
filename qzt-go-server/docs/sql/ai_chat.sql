-- ai_chat.sql — P26 AI 对话页种子：AI 助手菜单 + 对话接口 + 成本总开关
-- 用途：admin 内置 AI 对话页（MCP「AI 业务系统」叙事的前台包装）的菜单/接口/运行时开关种子。
--   后端端点 POST /api/ai/chat 仅 JWT 鉴权（不进 RBAC 组），成本由 sys_config ai.chat_enabled 控制（默认关）。
-- ID 分配（以 docs/sql 既有种子推算的空闲区间，生产执行前请先复核生产库 MAX(id)）：
--   sys_config 51（种子最大 50=kb.rag_enabled；唯一键 idx_sys_config_key，按 key 幂等守卫，若 51 被占请换空闲 id）
--   sys_menu 2316（AI 助手目录）/ 2317（AI 对话页）（种子最大 2298）
--   sys_api 817（POST /api/ai/chat）（种子最大 795）
-- 授权口径：与审批「我发起的」菜单(136)同款角色集合 = super_admin(1) + sale(3) + sales_manager(4)
--   + sales_director(9) + employee(10)（docs/sql/qztgo.sql 种子口径），显式排除 demo 演示角色(14)
--   ——演示账号禁用 AI，防烧 token（见 internal/mcp/server.go 同款口径）。无按钮级权限（接口仅 JWT）。
-- 幂等：固定 ID ON DUPLICATE KEY / NOT EXISTS / DELETE-INSERT。
-- 执行方式：DBX MCP 执行（database=qztgo）或手动 mysql。casbin 插库运行期不生效，须重启 qzt-server。

-- ======================================================================
-- 1. sys_config 51：AI 对话总开关（默认关；按 key 守卫插入，绝不误碰其他 key 的行）
-- ======================================================================
INSERT INTO `sys_config`
  (`id`, `group`, `key`, `name`, `value`, `type`, `options`, `is_public`, `editable`, `builtin`, `sort`, `remark`, `created_at`, `updated_at`, `deleted_at`)
SELECT 51, 'ai', 'ai.chat_enabled', 'AI 助手对话开关', '0', 'bool', NULL, 0, 1, 1, 1,
       '开启后 admin「AI 助手」页面可调用 LLM 网关对话（按 token 记账，开启前请确认 .env 已配 LLM_API_KEY），默认关闭控成本',
       NOW(3), NOW(3), NULL
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_config` WHERE `key` = 'ai.chat_enabled' AND `deleted_at` IS NULL
);

-- 已存在时仅刷新显示名/备注，不动 value（保留管理员已设置的开关值）
UPDATE `sys_config`
SET `name` = 'AI 助手对话开关',
    `remark` = '开启后 admin「AI 助手」页面可调用 LLM 网关对话（按 token 记账，开启前请确认 .env 已配 LLM_API_KEY），默认关闭控成本',
    `updated_at` = NOW(3)
WHERE `key` = 'ai.chat_enabled' AND `deleted_at` IS NULL;

-- ======================================================================
-- 2. sys_menu 2316 AI 助手目录 + 2317 AI 对话页（icon 用 MenuIcon 白名单在册的 RobotOutlined）
-- ======================================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`, `deleted_at`)
VALUES
  (2316, 0,    'AI 助手', '/ai',     '',              'RobotOutlined', 6, 0, '', 1, 1, NOW(3), NOW(3), NULL),
  (2317, 2316, 'AI 对话', '/ai/chat', 'ai/chat/index', '',              1, 1, '', 1, 1, NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `updated_at`=NOW(3);

-- ======================================================================
-- 3. sys_api 817：AI 对话接口登记（RBAC 管理页可见；实际鉴权仅 JWT，不进 Casbin 组）
-- ======================================================================
INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
  (817, '/api/ai/chat', 'POST', 'AI', 'AI 助手对话补全', NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `description`=VALUES(`description`), `updated_at`=NOW(3);

-- ======================================================================
-- 4. sys_role_menu：2316/2317 授予与菜单 136 同款角色集，显式排除 demo 角色 14
-- ======================================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
VALUES (1,2316),(3,2316),(4,2316),(9,2316),(10,2316),
       (1,2317),(3,2317),(4,2317),(9,2317),(10,2317)
ON DUPLICATE KEY UPDATE `sys_role_id`=`sys_role_id`;

-- demo 演示角色显式排除（幂等清理，防历史误授后演示账号烧 token）
DELETE FROM `sys_role_menu`
WHERE `sys_menu_id` IN (2316, 2317) AND `sys_role_id` = 14;

-- ======================================================================
-- 5. casbin 授权（幂等 NOT EXISTS；运行期插库不生效，须重启 qzt-server）
--    接口实际仅 JWT 不走 Casbin，此处为 RBAC 管理页的角色-接口口径一致性登记。
-- ======================================================================
INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`)
SELECT 'p', rc.code, a.path, a.method FROM
  (SELECT 'super_admin' AS code
   UNION SELECT 'sale'
   UNION SELECT 'sales_manager'
   UNION SELECT 'sales_director'
   UNION SELECT 'employee') rc
  JOIN sys_api a ON a.id = 817
WHERE NOT EXISTS (
  SELECT 1 FROM casbin_rule cr
  WHERE cr.ptype='p' AND cr.v0=rc.code AND cr.v1=a.path AND cr.v2=a.method
);
