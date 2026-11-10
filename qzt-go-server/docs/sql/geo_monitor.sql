-- ============================================================
-- geo_monitor.sql — GEO 监测看板（P4：提示词库/平台/轮次/结果 + 菜单/权限/定时任务种子）
-- 用途：把 GEO 手册第六节「20 问 × N 平台打分表」系统化：
--       提示词库(手册 Top 20 选题) → 定时/手动向 AI 平台提问(LLM 网关多实例)
--       → 三级打分(0未提及/1提及行简/2提及且带官网链接) → AI 推荐率/自有引用命中率趋势。
-- ID 区间：
--   geo_* 表        : 自增，无固定种子区间(提示词/平台有种子数据，ID 自增从 1)
--   sys_api         : 660~689（660~673 已用，675~689 留扩展）
--   sys_menu        : 2210~2219（菜单 2210 + 按钮 2211~2219，挂「营销」分组 980 下）
--   sys_job         : 21（geo.monitor.run，每周一 09:00）
-- 执行方式：DBX MCP（连接「我的阿里云数据库」，database=qztgo）或手动 mysql 执行；
--       全部幂等（CREATE TABLE IF NOT EXISTS + 固定区间先 DELETE 再 INSERT），可重复执行。
--       注意：sys_job 插入后需重启服务才会被调度器加载。
-- ============================================================

-- 1. 提示词库
CREATE TABLE IF NOT EXISTS `geo_prompt` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `question`   VARCHAR(255) NOT NULL COMMENT '完整监测问题',
  `group_type` VARCHAR(16)  NOT NULL DEFAULT 'category' COMMENT 'brand/category/scenario',
  `enabled`    TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否参与监测',
  `sort`       INT          NOT NULL DEFAULT 0 COMMENT '排序值',
  `remark`     VARCHAR(255) NOT NULL DEFAULT '' COMMENT '备注',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_group_sort` (`group_type`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GEO 监测提示词库';

-- 2. 监测平台（OpenAI 兼容 API；key 在 admin 录入，不回显）
CREATE TABLE IF NOT EXISTS `geo_platform` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `name`       VARCHAR(64)  NOT NULL COMMENT '平台名',
  `base_url`   VARCHAR(255) NOT NULL COMMENT 'OpenAI兼容API根地址',
  `api_key`    VARCHAR(255) NOT NULL DEFAULT '' COMMENT '平台APIKey(接口不回显)',
  `model`      VARCHAR(64)  NOT NULL COMMENT '模型名',
  `enabled`    TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否参与监测',
  `remark`     VARCHAR(255) NOT NULL DEFAULT '' COMMENT '备注',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GEO 监测平台';

-- 3. 监测轮次（一轮 = 启用提示词 × 启用平台全组合）
CREATE TABLE IF NOT EXISTS `geo_run` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `trigger`         VARCHAR(16)  NOT NULL DEFAULT 'manual' COMMENT 'manual/schedule',
  `status`          VARCHAR(16)  NOT NULL DEFAULT 'running' COMMENT 'running/done/failed',
  `total_results`   INT          NOT NULL DEFAULT 0 COMMENT '结果条数(含失败)',
  `error_count`     INT          NOT NULL DEFAULT 0 COMMENT '失败条数',
  `mentioned_count` INT          NOT NULL DEFAULT 0 COMMENT '提及行简条数',
  `with_link_count` INT          NOT NULL DEFAULT 0 COMMENT '提及且带官网链接条数',
  `total_score`     INT          NOT NULL DEFAULT 0 COMMENT '得分合计',
  `max_score`       INT          NOT NULL DEFAULT 0 COMMENT '满分(提示词×平台×2)',
  `recommend_rate`  DOUBLE       NOT NULL DEFAULT 0 COMMENT 'AI推荐率(0-1)',
  `own_cite_rate`   DOUBLE       NOT NULL DEFAULT 0 COMMENT '自有引用命中率(0-1)',
  `error_msg`       VARCHAR(500) NOT NULL DEFAULT '' COMMENT '失败原因摘要',
  `started_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  `finished_at`     DATETIME     NULL DEFAULT NULL COMMENT '完成时间',
  PRIMARY KEY (`id`),
  KEY `idx_status_started` (`status`, `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GEO 监测轮次';

-- 4. 监测结果（轮次 × 提示词 × 平台）
CREATE TABLE IF NOT EXISTS `geo_result` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `run_id`        BIGINT UNSIGNED NOT NULL COMMENT '轮次ID',
  `prompt_id`     BIGINT UNSIGNED NOT NULL COMMENT '提示词ID',
  `platform_id`   BIGINT UNSIGNED NOT NULL COMMENT '平台ID',
  `score`         INT            NOT NULL DEFAULT 0 COMMENT '0未提及/1提及行简/2提及且带官网链接',
  `mention_brand` TINYINT(1)     NOT NULL DEFAULT 0 COMMENT '是否提及行简',
  `has_own_link`  TINYINT(1)     NOT NULL DEFAULT 0 COMMENT '回答是否含官网链接',
  `own_cite`      TINYINT(1)     NOT NULL DEFAULT 0 COMMENT '引用是否命中自有域名',
  `cited_urls`    TEXT           NULL COMMENT '引用URL(JSON数组)',
  `competitors`   VARCHAR(255)   NOT NULL DEFAULT '' COMMENT '命中的竞品名(逗号分隔)',
  `latency_ms`    INT            NOT NULL DEFAULT 0 COMMENT '调用耗时(毫秒)',
  `status`        VARCHAR(16)    NOT NULL DEFAULT 'ok' COMMENT 'ok/error',
  `error_msg`     VARCHAR(500)   NOT NULL DEFAULT '' COMMENT '失败原因摘要',
  `answer`        MEDIUMTEXT     NULL COMMENT '回答全文(监测证据)',
  `created_at`    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_run_platform_score` (`run_id`, `platform_id`, `score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GEO 监测结果';

-- 5. 提示词种子：手册第三节 Top 20（brand 1-5 / category 6-13 / scenario 14-20）
DELETE FROM `geo_prompt` WHERE `id` BETWEEN 1 AND 20;
INSERT INTO `geo_prompt` (`id`, `question`, `group_type`, `enabled`, `sort`, `remark`) VALUES
  -- A 品牌词(防御)
  (1,  '行简CRM是什么产品？官网地址是什么？',            'brand',    1, 1,  'A#1 品牌防御'),
  (2,  '行简CRM是免费的吗？收费模式是怎样的？',          'brand',    1, 2,  'A#2'),
  (3,  '行简CRM和悟空CRM哪个好？',                       'brand',    1, 3,  'A#3 对比评测'),
  (4,  '行简CRM是开源的吗？能商用二次开发吗？',          'brand',    1, 4,  'A#4'),
  (5,  '行简CRM适合什么样的企业？多少人在用？',          'brand',    1, 5,  'A#5'),
  -- B 品类通用词(进攻)
  (6,  '有哪些免费的CRM系统推荐？',                      'category', 1, 6,  'B#6 核心词'),
  (7,  '10人以上中小企业用什么CRM性价比高？',            'category', 1, 7,  'B#7'),
  (8,  '开源CRM系统有哪些？怎么选？',                    'category', 1, 8,  'B#8'),
  (9,  'CRM系统一般多少钱一年？',                        'category', 1, 9,  'B#9 价格'),
  (10, 'SaaS按人头的CRM和私有化部署怎么选？',            'category', 1, 10, 'B#10'),
  (11, '私有化部署的CRM有哪些推荐？',                    'category', 1, 11, 'B#11'),
  (12, 'CRM能和进销存、财务系统打通吗？',                'category', 1, 12, 'B#12 一体化'),
  (13, '国内CRM和国外CRM（Zoho/HubSpot）哪个好？',       'category', 1, 13, 'B#13'),
  -- C 延伸场景词(长尾)
  (14, '免费的进销存软件推荐',                           'scenario', 1, 14, 'C#14'),
  (15, '一体化管理软件（CRM+HR+财务）哪家好？',          'scenario', 1, 15, 'C#15'),
  (16, '小公司刚起步需要上哪些管理系统？',               'scenario', 1, 16, 'C#16'),
  (17, '免费OA/审批流系统推荐',                          'scenario', 1, 17, 'C#17'),
  (18, 'AI可以直接操作CRM/ERP系统吗？',                  'scenario', 1, 18, 'C#18 MCP独家锚点'),
  (19, 'CRM的数据能放在自己服务器上吗？怎么迁移导出？',  'scenario', 1, 19, 'C#19'),
  (20, '没有IT人力的公司怎么私有化部署软件？',           'scenario', 1, 20, 'C#20');

-- 6. 平台种子：两个可 API 化的示例（api_key 留空，在 admin「平台管理」里录入后启用）
DELETE FROM `geo_platform` WHERE `id` BETWEEN 1 AND 10;
INSERT INTO `geo_platform` (`id`, `name`, `base_url`, `api_key`, `model`, `enabled`, `remark`) VALUES
  (1, 'DeepSeek',  'https://api.deepseek.com',                             '', 'deepseek-chat', 0, '平台平台管理录入 API Key 后启用'),
  (2, '通义千问',  'https://dashscope.aliyuncs.com/compatible-mode/v1',    '', 'qwen-plus',     0, 'DashScope 兼容模式；录入 API Key 后启用');

-- 7. sys_api 权限（path 与 Casbin obj 一致）
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2210 AND 2219;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2210 AND 2219;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2210 AND 2219;
DELETE FROM `sys_api` WHERE `id` BETWEEN 660 AND 689;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  -- 提示词库 (660-663)
  (660, '/geo/prompts',        'GET',    '营销-GEO监测', '提示词列表', NOW(3), NOW(3)),
  (661, '/geo/prompts',        'POST',   '营销-GEO监测', '新增提示词', NOW(3), NOW(3)),
  (662, '/geo/prompts/:id',    'PUT',    '营销-GEO监测', '编辑提示词', NOW(3), NOW(3)),
  (663, '/geo/prompts/:id',    'DELETE', '营销-GEO监测', '删除提示词', NOW(3), NOW(3)),
  -- 平台 (664-667)
  (664, '/geo/platforms',      'GET',    '营销-GEO监测', '平台列表', NOW(3), NOW(3)),
  (665, '/geo/platforms',      'POST',   '营销-GEO监测', '新增平台', NOW(3), NOW(3)),
  (666, '/geo/platforms/:id',  'PUT',    '营销-GEO监测', '编辑平台', NOW(3), NOW(3)),
  (667, '/geo/platforms/:id',  'DELETE', '营销-GEO监测', '删除平台', NOW(3), NOW(3)),
  -- 轮次 (668-672)
  (668, '/geo/runs',           'POST',   '营销-GEO监测', '手动触发监测', NOW(3), NOW(3)),
  (669, '/geo/runs',           'GET',    '营销-GEO监测', '轮次列表', NOW(3), NOW(3)),
  (670, '/geo/runs/:id',       'GET',    '营销-GEO监测', '轮次详情', NOW(3), NOW(3)),
  (671, '/geo/runs/:id/results', 'GET',  '营销-GEO监测', '轮次结果明细', NOW(3), NOW(3)),
  (672, '/geo/runs/:id/export',  'GET',  '营销-GEO监测', '导出轮次明细', NOW(3), NOW(3)),
  -- 趋势 (673)
  (673, '/geo/trend',          'GET',    '营销-GEO监测', '指标趋势', NOW(3), NOW(3));

-- 8. sys_menu —— 挂「营销」分组(980)下：GEO 监测菜单 + 按钮
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2210, 980, 'GEO 监测', '/marketing/geo', 'marketing/geo/index', 'GlobalOutlined', 3, 1, 'marketing:geo:list', 1, 1, NOW(3), NOW(3)),
  (2211, 2210, '手动监测',     NULL, NULL, NULL, 1, 2, 'marketing:geo:run',           1, 1, NOW(3), NOW(3)),
  (2212, 2210, '新增提示词',   NULL, NULL, NULL, 2, 2, 'marketing:geo:prompt:add',    1, 1, NOW(3), NOW(3)),
  (2213, 2210, '编辑提示词',   NULL, NULL, NULL, 3, 2, 'marketing:geo:prompt:edit',   1, 1, NOW(3), NOW(3)),
  (2214, 2210, '删除提示词',   NULL, NULL, NULL, 4, 2, 'marketing:geo:prompt:delete', 1, 1, NOW(3), NOW(3)),
  (2215, 2210, '新增平台',     NULL, NULL, NULL, 5, 2, 'marketing:geo:platform:add',  1, 1, NOW(3), NOW(3)),
  (2216, 2210, '编辑平台',     NULL, NULL, NULL, 6, 2, 'marketing:geo:platform:edit', 1, 1, NOW(3), NOW(3)),
  (2217, 2210, '删除平台',     NULL, NULL, NULL, 7, 2, 'marketing:geo:platform:delete', 1, 1, NOW(3), NOW(3)),
  (2218, 2210, '导出明细',     NULL, NULL, NULL, 8, 2, 'marketing:geo:export',        1, 1, NOW(3), NOW(3));

-- 9. sys_menu_api —— 菜单/按钮与 API 关联
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2210, 660),  -- 菜单 → 提示词列表(页面主数据)
  (2210, 664),  -- 菜单 → 平台列表
  (2210, 669),  -- 菜单 → 轮次列表
  (2210, 673),  -- 菜单 → 趋势
  (2211, 668),  -- 手动监测 → POST /geo/runs
  (2212, 661),  -- 新增提示词
  (2213, 662),  -- 编辑提示词
  (2214, 663),  -- 删除提示词
  (2215, 665),  -- 新增平台
  (2216, 666),  -- 编辑平台
  (2217, 667),  -- 删除平台
  (2218, 671),  -- 导出 → 结果明细 + 导出
  (2218, 672);

-- 10. 授权给超级管理员
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id BETWEEN 2210 AND 2219
WHERE r.code = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- 11. sys_job —— GEO 监测定时任务（每周一 09:00；插入后需重启服务生效）
DELETE FROM `sys_job` WHERE `id` = 21;
INSERT INTO `sys_job` (`id`, `job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`, `created_at`, `updated_at`)
VALUES (21, 'GEO监测-每周一轮', '营销', '0 0 9 * * 1', 'geo.monitor.run', 1, '每周一 09:00 自动执行一轮 GEO 监测(20问×启用平台)', NOW(3), NOW(3));
