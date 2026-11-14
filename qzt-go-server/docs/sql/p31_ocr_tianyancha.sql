-- p31_ocr_tianyancha.sql — P31 外部能力集成:①发票 OCR(千问视觉) ②天眼查 MCP 工商信息
-- 用途:
--   Feature A 发票 OCR:POST /finance/invoices/ocr(multipart image,千问 qwen-vl 识别,
--     结果不落库,前端回填表单人工确认后走既有保存接口;每用户每日 50 次 Redis 计数)。
--     模型名走 sys_config finance.ocr_model(热生效,默认 qwen-vl-plus);
--     凭证复用「AI 模型」当前生效档案 api_key(即 DashScope key,端点固定 compatible-mode,代码常量)。
--   Feature B 天眼查 MCP:
--     配置存 sys_oauth_config provider='tianyancha_mcp'(app_id=MCP 端点 URL,app_secret=API Key,
--     extra=工具名映射 JSON,工具名不硬编码),管理端点 GET/PUT /system/tianyancha/config
--     (PUT 挂 system 模块 frozen 组,演示模式冻结;GET 脱敏 secret 只回 ****+尾4 位)。
--     业务端点 GET /crm/customers/:id/tianyancha(归一化返回,不回填客户字段;
--     ?save=1 写跟进记录留痕;全局每日配额 sys_config tianyancha.daily_limit 默认 300)。
-- ID 分配(2026-11-14 DBX 复核:sys_api MAX=876,sys_menu MAX=2364):
--   sys_api  877-880(4 条:OCR / 天眼查配置查看 / 天眼查配置保存 / 客户工商查询)
--   sys_menu 2365(发票识别按钮,挂 312 发票管理) / 2366(工商查询按钮,挂 74 客户管理)
--   sys_config 2 键:finance.ocr_model / tianyancha.daily_limit(按 key 幂等守卫,不占固定 id)
--   sys_oauth_config:不加种子行(端点/key 由管理员后台录入,禁止种子写真实凭据)
-- 菜单绑定口径:
--   878(配置查看)/879(配置保存) 复用「AI 模型」页(2359)既有按钮 2363(查看生效)/2360(保存)的
--   授权链绑定——天眼查配置卡建议与「AI 模型」同页放置(系统管理→AI 助手→AI 模型),
--   可管理 AI 模型的角色天然可管理天眼查配置。
-- 授权:2365/2366 仅显式授超管(role id=1;UI 可见性,API 层超管本就绕过 Casbin),
--   其他角色由管理员后台按需勾选;不授 demo 演示角色(14),防演示访客烧配额。
-- 幂等:固定 ID DELETE+INSERT / NOT EXISTS 守卫;casbin 策略插库后运行期不生效,须重启 qzt-server。
-- 执行方式:通过 DBX MCP 或手动 mysql 连 qztgo 库执行。
-- 外键依赖顺序:先 sys_menu_api / sys_role_menu,再 sys_menu / sys_api。

-- ============================================================
-- 1. sys_api —— 4 条接口(877-880)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_api_id` BETWEEN 877 AND 880;
DELETE FROM `sys_api` WHERE `id` BETWEEN 877 AND 880;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (877, '/finance/invoices/ocr',            'POST', '财务',   '发票图片 OCR 识别(千问 qwen-vl,不落库,每用户每日 50 次)', NOW(3), NOW(3)),
  (878, '/system/tianyancha/config',        'GET',  '天眼查', '天眼查 MCP 配置查看(secret 脱敏)',                          NOW(3), NOW(3)),
  (879, '/system/tianyancha/config',        'PUT',  '天眼查', '天眼查 MCP 配置保存(演示冻结,endpoint 出网校验)',           NOW(3), NOW(3)),
  (880, '/crm/customers/:id/tianyancha',    'GET',  '天眼查', '客户工商信息查询(天眼查 MCP,?save=1 写跟进留痕)',           NOW(3), NOW(3));

-- ============================================================
-- 2. sys_menu —— 功能按钮(2365 发票识别 / 2366 工商查询)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2365 AND 2366;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2365 AND 2366;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2365 AND 2366;

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2365, 312, '发票识别', NULL, NULL, NULL, 1, 2, 'finance:invoice:ocr',        1, 1, NOW(3), NOW(3)),
  (2366, 74,  '工商查询', NULL, NULL, NULL, 1, 2, 'crm:customer:tianyancha',   1, 1, NOW(3), NOW(3));

-- ============================================================
-- 3. sys_menu_api —— 按钮/既有菜单与 API 关联
--    (878/879 挂 AI 模型页既有按钮 2363/2360,配置卡与 AI 模型同页)
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2365, 877),  -- 发票识别 → POST /finance/invoices/ocr
  (2366, 880),  -- 工商查询 → GET /crm/customers/:id/tianyancha
  (2363, 878),  -- AI 模型页「查看生效」→ GET /system/tianyancha/config
  (2360, 879);  -- AI 模型页「保存」→ PUT /system/tianyancha/config

-- ============================================================
-- 4. sys_role_menu —— 超管(role id=1)UI 可见新按钮(不授 demo 角色 14)
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id IN (2365, 2366)
WHERE r.id = 1
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- ============================================================
-- 5. sys_config —— 2 键(按 key 幂等守卫,绝不误碰其他 key 的行)
-- ============================================================
INSERT INTO `sys_config`
  (`group`, `key`, `name`, `value`, `type`, `options`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'finance', 'finance.ocr_model', '发票识别视觉模型', 'qwen-vl-plus', 'string', NULL, 0, 1, 1, 1,
       'POST /finance/invoices/ocr 使用的千问视觉模型名(热生效,可改 qwen-vl-max 等;凭证复用「AI 模型」生效档案的 api_key,端点固定 DashScope compatible-mode)'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'finance.ocr_model' AND `deleted_at` IS NULL);

UPDATE `sys_config`
SET `name` = '发票识别视觉模型',
    `remark` = 'POST /finance/invoices/ocr 使用的千问视觉模型名(热生效,可改 qwen-vl-max 等;凭证复用「AI 模型」生效档案的 api_key,端点固定 DashScope compatible-mode)',
    `updated_at` = NOW(3)
WHERE `key` = 'finance.ocr_model' AND `deleted_at` IS NULL;

INSERT INTO `sys_config`
  (`group`, `key`, `name`, `value`, `type`, `options`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'tianyancha', 'tianyancha.daily_limit', '天眼查每日查询上限', '300', 'int', NULL, 0, 1, 1, 1,
       'GET /crm/customers/:id/tianyancha 的全局每日配额(全站共享,超限报错提示明日再试);改后无需重启,下一次查询即生效'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'tianyancha.daily_limit' AND `deleted_at` IS NULL);

UPDATE `sys_config`
SET `name` = '天眼查每日查询上限',
    `remark` = 'GET /crm/customers/:id/tianyancha 的全局每日配额(全站共享,超限报错提示明日再试);改后无需重启,下一次查询即生效',
    `updated_at` = NOW(3)
WHERE `key` = 'tianyancha.daily_limit' AND `deleted_at` IS NULL;

-- ============================================================
-- 验证(执行后自查)
-- ============================================================
-- SELECT COUNT(*) FROM sys_api      WHERE id BETWEEN 877 AND 880;                -- 4
-- SELECT COUNT(*) FROM sys_menu     WHERE id BETWEEN 2365 AND 2366;              -- 2
-- SELECT COUNT(*) FROM sys_menu_api WHERE sys_api_id BETWEEN 877 AND 880;        -- 4
-- SELECT COUNT(*) FROM sys_role_menu WHERE sys_menu_id IN (2365,2366) AND sys_role_id = 1;  -- 2
-- SELECT `key`, `value` FROM sys_config WHERE `key` IN ('finance.ocr_model','tianyancha.daily_limit'); -- 2 行
-- SELECT id, provider, enabled FROM sys_oauth_config WHERE provider = 'tianyancha_mcp'; -- 0 行(后台录入)
