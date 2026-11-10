-- ============================================================
-- geo_source.sql — GEO 信源自动化产线（选题池/稿件库/平台账号 + 菜单/权限/定时任务种子）
-- 用途：每天定时自动跑产线——自动选题(LLM 读监测结果找机会) → AI 写图文稿 + AI 生成视频
--       → 公众号自动推草稿箱(freepublish 可选直发) → 抖音 API 直发(资质后启用)
--       → 知乎/CSDN/小红书等生成差异化稿件人工发、回填 URL，喂回监测的自有引用命中率。
-- ID 区间：
--   geo_* 表        : 自增，无固定种子区间
--   sys_api         : 690~719（690~709 已用，710~719 留扩展）
--   sys_menu        : 2220~2235（按钮 2220~2231，挂 GEO 监测页 2210 下；2232~2235 留扩展）
--   sys_job         : 22（geo.source.run，每天 08:30）
-- 执行方式：DBX MCP（连接「我的阿里云数据库」，database=qztgo）或手动 mysql 执行；
--       全部幂等（CREATE TABLE IF NOT EXISTS + 固定区间先 DELETE 再 INSERT），可重复执行。
--       注意：sys_job 插入后需重启服务才会被调度器加载。
-- ============================================================

-- 1. 选题池（监测结果回流 + 手册矩阵 + AI 生成 + 手工录入）
CREATE TABLE IF NOT EXISTS `geo_topic` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `question`      VARCHAR(255) NOT NULL COMMENT '选题问题(完整问句)',
  `origin`        VARCHAR(16)  NOT NULL DEFAULT 'ai' COMMENT '来源 matrix=手册矩阵/ai=AI生成/manual=手工',
  `status`        VARCHAR(16)  NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected/used',
  `reason`        VARCHAR(500) NOT NULL DEFAULT '' COMMENT '选题依据(监测低分/竞品提及/引用缺口)',
  `source_run_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '来源监测轮次ID(0=无关)',
  `prompt_id`     BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '关联既有提示词ID(0=新题)',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_status_origin` (`status`, `origin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GEO 信源选题池';

-- 2. 稿件库（图文/视频/脚本统一存稿；多平台改写经 variant_of 挂母稿）
CREATE TABLE IF NOT EXISTS `geo_source` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `topic_id`      BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '选题ID(0=手工稿)',
  `content_type`  VARCHAR(16)  NOT NULL DEFAULT 'article' COMMENT 'article/video/video_script',
  `platform`      VARCHAR(32)  NOT NULL DEFAULT 'wechat_mp' COMMENT 'wechat_mp/douyin/xhs/zhihu/csdn/toutiao',
  `genre`         VARCHAR(16)  NOT NULL DEFAULT '' COMMENT '体裁 comparison/faq/case',
  `title`         VARCHAR(128) NOT NULL DEFAULT '' COMMENT '标题',
  `digest`        VARCHAR(256) NOT NULL DEFAULT '' COMMENT '摘要(公众号120字节内)',
  `content_md`    MEDIUMTEXT   NULL COMMENT '正文Markdown(视频稿为口播脚本+分镜描述)',
  `video_url`     VARCHAR(512) NOT NULL DEFAULT '' COMMENT '视频文件地址(OSS/CDN)',
  `video_task_id` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '视频生成任务号',
  `status`        VARCHAR(16)  NOT NULL DEFAULT 'generated' COMMENT 'generated/pushed/published/failed/skipped',
  `media_id`      VARCHAR(128) NOT NULL DEFAULT '' COMMENT '公众号草稿media_id',
  `publish_id`    VARCHAR(128) NOT NULL DEFAULT '' COMMENT 'freepublish发布任务ID',
  `publish_url`   VARCHAR(512) NOT NULL DEFAULT '' COMMENT '发布URL(接口拉取或人工回填)',
  `variant_of`    BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '母稿ID(0=母稿)',
  `trigger`       VARCHAR(16)  NOT NULL DEFAULT 'manual' COMMENT 'manual/schedule',
  `error`         VARCHAR(500) NOT NULL DEFAULT '' COMMENT '失败原因摘要',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_topic` (`topic_id`),
  KEY `idx_status` (`status`),
  KEY `idx_platform_type` (`platform`, `content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GEO 信源稿件库';

-- 3. 平台授权账号（抖音开放平台 OAuth；token 只入库不回显）
CREATE TABLE IF NOT EXISTS `geo_platform_account` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `platform`      VARCHAR(32)  NOT NULL COMMENT 'douyin/...',
  `open_id`       VARCHAR(128) NOT NULL COMMENT '平台用户openid',
  `nickname`      VARCHAR(128) NOT NULL DEFAULT '' COMMENT '账号昵称',
  `access_token`  VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '访问令牌(接口不回显)',
  `refresh_token` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '刷新令牌(接口不回显)',
  `expires_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'access_token过期时间',
  `scope`         VARCHAR(255) NOT NULL DEFAULT '' COMMENT '授权scope',
  `enabled`       TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否可用',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_platform_openid` (`platform`, `open_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GEO 信源平台授权账号';

-- 4. sys_api 权限（path 与 Casbin obj 一致）
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2220 AND 2235;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2220 AND 2235;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2220 AND 2235;
DELETE FROM `sys_api` WHERE `id` BETWEEN 690 AND 719;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  -- 选题池 (690-695)
  (690, '/geo/topics',              'GET',    '营销-GEO信源', '选题列表', NOW(3), NOW(3)),
  (691, '/geo/topics',              'POST',   '营销-GEO信源', '新增选题', NOW(3), NOW(3)),
  (692, '/geo/topics/:id',          'PUT',    '营销-GEO信源', '编辑选题', NOW(3), NOW(3)),
  (693, '/geo/topics/:id',          'DELETE', '营销-GEO信源', '删除选题', NOW(3), NOW(3)),
  (694, '/geo/topics/:id/review',   'POST',   '营销-GEO信源', '审批选题', NOW(3), NOW(3)),
  (695, '/geo/topics/generate',     'POST',   '营销-GEO信源', 'AI生成选题', NOW(3), NOW(3)),
  -- 稿件库 (696-705)
  (696, '/geo/sources',             'GET',    '营销-GEO信源', '稿件列表', NOW(3), NOW(3)),
  (697, '/geo/sources',             'POST',   '营销-GEO信源', '手工新增稿件', NOW(3), NOW(3)),
  (698, '/geo/sources/:id',         'PUT',    '营销-GEO信源', '编辑稿件', NOW(3), NOW(3)),
  (699, '/geo/sources/:id',         'DELETE', '营销-GEO信源', '删除稿件', NOW(3), NOW(3)),
  (700, '/geo/sources/:id/push',    'POST',   '营销-GEO信源', '推送公众号草稿箱', NOW(3), NOW(3)),
  (701, '/geo/sources/:id/publish', 'POST',   '营销-GEO信源', 'API直接发布', NOW(3), NOW(3)),
  (702, '/geo/sources/:id/publish', 'GET',    '营销-GEO信源', '查询发布状态', NOW(3), NOW(3)),
  (703, '/geo/sources/:id/variants','POST',   '营销-GEO信源', '生成分发稿', NOW(3), NOW(3)),
  (704, '/geo/sources/generate',    'POST',   '营销-GEO信源', '手动产稿', NOW(3), NOW(3)),
  (705, '/geo/sources/run',         'POST',   '营销-GEO信源', '手动跑产线', NOW(3), NOW(3)),
  -- 抖音账号 (706-709)
  (706, '/geo/platforms/douyin/authorize',   'GET',    '营销-GEO信源', '抖音授权链接', NOW(3), NOW(3)),
  (707, '/geo/platforms/douyin/bind',        'POST',   '营销-GEO信源', '抖音绑定', NOW(3), NOW(3)),
  (708, '/geo/platforms/douyin/accounts',    'GET',    '营销-GEO信源', '抖音账号列表', NOW(3), NOW(3)),
  (709, '/geo/platforms/douyin/accounts/:id','DELETE', '营销-GEO信源', '抖音解绑', NOW(3), NOW(3)),
  (710, '/geo/sources/:id/douyin',           'POST',   '营销-GEO信源', '视频直发抖音', NOW(3), NOW(3));

-- 5. sys_menu —— GEO 信源按钮，挂 GEO 监测页(2210)下
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2220, 2210, '新增选题',   NULL, NULL, NULL, 11, 2, 'marketing:geo:topic:add',      1, 1, NOW(3), NOW(3)),
  (2221, 2210, '编辑选题',   NULL, NULL, NULL, 12, 2, 'marketing:geo:topic:edit',     1, 1, NOW(3), NOW(3)),
  (2222, 2210, '审批选题',   NULL, NULL, NULL, 13, 2, 'marketing:geo:topic:review',   1, 1, NOW(3), NOW(3)),
  (2223, 2210, '删除选题',   NULL, NULL, NULL, 14, 2, 'marketing:geo:topic:delete',   1, 1, NOW(3), NOW(3)),
  (2224, 2210, '新增稿件',   NULL, NULL, NULL, 15, 2, 'marketing:geo:source:add',     1, 1, NOW(3), NOW(3)),
  (2225, 2210, '编辑稿件',   NULL, NULL, NULL, 16, 2, 'marketing:geo:source:edit',    1, 1, NOW(3), NOW(3)),
  (2226, 2210, '删除稿件',   NULL, NULL, NULL, 17, 2, 'marketing:geo:source:delete',  1, 1, NOW(3), NOW(3)),
  (2227, 2210, '推送公众号', NULL, NULL, NULL, 18, 2, 'marketing:geo:source:push',    1, 1, NOW(3), NOW(3)),
  (2228, 2210, '直接发布',   NULL, NULL, NULL, 19, 2, 'marketing:geo:source:publish', 1, 1, NOW(3), NOW(3)),
  (2229, 2210, '生成分发稿', NULL, NULL, NULL, 20, 2, 'marketing:geo:source:variant', 1, 1, NOW(3), NOW(3)),
  (2230, 2210, '手动产稿',   NULL, NULL, NULL, 21, 2, 'marketing:geo:source:generate', 1, 1, NOW(3), NOW(3)),
  (2231, 2210, '抖音账号',   NULL, NULL, NULL, 22, 2, 'marketing:geo:douyin:manage',  1, 1, NOW(3), NOW(3));

-- 6. sys_menu_api —— 菜单/按钮与 API 关联
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2210, 690),  -- 页面主数据 → 选题列表
  (2210, 696),  -- 页面主数据 → 稿件列表
  (2220, 691),  -- 新增选题
  (2221, 692),  -- 编辑选题
  (2222, 694),  -- 审批选题 → 审批 + AI 生成
  (2222, 695),
  (2223, 693),  -- 删除选题
  (2224, 697),  -- 新增稿件
  (2225, 698),  -- 编辑稿件
  (2226, 699),  -- 删除稿件
  (2227, 700),  -- 推送公众号草稿箱
  (2228, 701),  -- 直接发布 → 提交 + 查状态
  (2228, 702),
  (2228, 710),  -- 直接发布 → 视频直发抖音
  (2229, 703),  -- 生成分发稿
  (2230, 704),  -- 手动产稿 → 单篇 + 整轮
  (2230, 705),
  (2231, 706),  -- 抖音账号 → 全部
  (2231, 707),
  (2231, 708),
  (2231, 709);

-- 7. 授权给超级管理员
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT r.id, m.id FROM sys_role r JOIN sys_menu m
  ON m.id BETWEEN 2220 AND 2235
WHERE r.code = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.sys_role_id = r.id AND rm.sys_menu_id = m.id
  );

-- 8. sys_job —— 每日信源产线（08:30，监测轮次周一 09:00 之后；插入后需重启服务生效）
DELETE FROM `sys_job` WHERE `id` = 22;
INSERT INTO `sys_job` (`id`, `job_name`, `job_group`, `cron_expression`, `bean_class`, `status`, `remark`, `created_at`, `updated_at`)
VALUES (22, 'GEO信源-每日产线', '营销', '0 30 8 * * *', 'geo.source.run', 1, '每天 08:30 自动选题→AI图文+视频→公众号推草稿箱→抖音直发(已授权)', NOW(3), NOW(3));

-- 9. 抖音开放平台配置行（禁用态；管理员在「第三方登录配置」填 client_key/secret 后启用）
-- 回调地址指向 admin 的 GEO 页面：授权完成后 URL 会带 ?code=xxx&state=xxx，
-- 在信源库「抖音账号」抽屉里粘贴该 URL 或 code 完成绑定。
DELETE FROM `sys_oauth_config` WHERE `provider` = 'douyin';
INSERT INTO `sys_oauth_config` (`provider`, `name`, `enabled`, `app_id`, `app_secret`, `redirect_uri`, `extra`, `sort`, `remark`, `created_at`, `updated_at`)
VALUES ('douyin', '抖音开放平台(GEO视频直发)', 0, '', '', 'https://admin.devlovecode.com/marketing/geo', '{}', 30, 'AppID填client_key,Secret填client_secret;前置:开放平台自研应用+视频发布能力过审', NOW(3), NOW(3));
