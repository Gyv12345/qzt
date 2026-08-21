-- site_config_theme.sql 站点配置新增「前台主题 + 首页营销区块」字段(2026-08-21)。
--
-- 背景:官网前台模板主题化改造——视觉风格与数字带/模块墙/CTA 不再写死在前端
--   代码里(私有化部署客户的官网不应出现厂商自己的营销文案与单一主题),
--   转为 sys_site_config 配置驱动,admin「站点设置」可维护;留空时前台回退
--   中性文案或不渲染对应区块。
--
-- 新字段(theme 默认 dark-tech;stats/modules 为空数组或 NULL 时前台不渲染):
--   theme         前台主题包: dark-tech 深色科技 / light-clean 明亮企业
--   stats_json    首页数字带 JSON: [{"num":"13","label":"业务模块一体化"}]
--   modules_json  首页模块墙 JSON: [{"icon":"users","name":"...","desc":"...","pills":[...],"big":true}]
--                 icon 可选值: users/fileCheck/box/wallet/idCard/calendar/kanban/
--                 book/cloud/megaphone/bag/globe/sparkles
--   cta_title / cta_highlight / cta_subtitle  首页底部 CTA(留空回退中性文案)
--
-- 幂等:INFORMATION_SCHEMA 检查列存在性;实例数据仅在字段为空时写入(不覆盖
--   客户已在后台修改的内容),可重复执行。
-- 执行方式:
--   A) mysql 客户端: source 本文件
--   B) DBX MCP: 多语句仅执行第一条,需逐段单语句执行
-- 关联代码: model/site_config.go、repository/site_config.go(Update 列清单)、
--   module/system/service/site_config.go、qzt-go-admin 站点设置表单、
--   qzt-go-cms layout.tsx(data-theme)与 page.tsx(三区块读取)。

SET @db := DATABASE();

-- 1) 加列(存在则跳过)
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'theme') = 0,
  'ALTER TABLE `sys_site_config` ADD COLUMN `theme` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''前台主题包(dark-tech/light-clean)'' AFTER `description`',
  'SELECT ''sys_site_config.theme 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'stats_json') = 0,
  'ALTER TABLE `sys_site_config` ADD COLUMN `stats_json` text COLLATE utf8mb4_unicode_ci COMMENT ''首页数字带JSON'' AFTER `theme`',
  'SELECT ''sys_site_config.stats_json 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'modules_json') = 0,
  'ALTER TABLE `sys_site_config` ADD COLUMN `modules_json` text COLLATE utf8mb4_unicode_ci COMMENT ''首页模块墙JSON'' AFTER `stats_json`',
  'SELECT ''sys_site_config.modules_json 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'cta_title') = 0,
  'ALTER TABLE `sys_site_config` ADD COLUMN `cta_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''首页底部CTA标题'' AFTER `modules_json`',
  'SELECT ''sys_site_config.cta_title 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'cta_highlight') = 0,
  'ALTER TABLE `sys_site_config` ADD COLUMN `cta_highlight` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''首页底部CTA高亮词'' AFTER `cta_title`',
  'SELECT ''sys_site_config.cta_highlight 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sys_site_config' AND COLUMN_NAME = 'cta_subtitle') = 0,
  'ALTER TABLE `sys_site_config` ADD COLUMN `cta_subtitle` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''首页底部CTA副标题'' AFTER `cta_highlight`',
  'SELECT ''sys_site_config.cta_subtitle 已存在,跳过'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) 厂商实例内容(仅字段为空时写入,保留客户后台已做的修改)
UPDATE `sys_site_config` SET `theme` = 'dark-tech' WHERE `id` = 1 AND (`theme` IS NULL OR `theme` = '');

UPDATE `sys_site_config` SET `stats_json` = '[{"num":"13","label":"业务模块一体化"},{"num":"411+","label":"API 接口"},{"num":"123","label":"数据表架构"}]'
WHERE `id` = 1 AND (`stats_json` IS NULL OR `stats_json` = '');

UPDATE `sys_site_config` SET `modules_json` = '[{"icon":"users","name":"CRM 客户管理","desc":"从线索到回款, 客户全生命周期在一个地方闭环。","pills":["线索","公海","商机","合同","回款"],"big":true},{"icon":"fileCheck","name":"审批流","desc":"自定义表单与流程引擎"},{"icon":"box","name":"进销存","desc":"采购·销售·库存一体"},{"icon":"wallet","name":"财务","desc":"收支·发票·资金流水"},{"icon":"idCard","name":"HRM 人事","desc":"组织·考勤·薪酬"},{"icon":"calendar","name":"OA 办公","desc":"公告·日程·报销借款"},{"icon":"kanban","name":"项目管理","desc":"任务·看板·里程碑"},{"icon":"book","name":"知识库","desc":"文档沉淀与协作"},{"icon":"cloud","name":"企业云盘","desc":"文件统一存储管理"},{"icon":"megaphone","name":"营销线索","desc":"抖音飞鱼线索自动入库"},{"icon":"bag","name":"独立商城","desc":"下单自动生成销售单"},{"icon":"globe","name":"CMS 官网","desc":"官网内容与页面管理"},{"icon":"sparkles","name":"AI 集成 (MCP)","desc":"411+ API 全量开放给 AI 助手"}]'
WHERE `id` = 1 AND (`modules_json` IS NULL OR `modules_json` = '');

UPDATE `sys_site_config` SET
  `cta_title` = '准备把业务搬进',
  `cta_highlight` = '一个系统',
  `cta_subtitle` = '私有化部署, 数据完全归企业所有。留下联系方式, 我们来聊聊您的场景。'
WHERE `id` = 1 AND (`cta_title` IS NULL OR `cta_title` = '');
