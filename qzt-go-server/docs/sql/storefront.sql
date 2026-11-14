-- ============================================================
-- storefront.sql —— 跨境独立站模块建表 + 种子(P28-A:上架位/多语言翻译/询盘/站点配置)
--
-- 用途:
--   1. storefront_product(上架位,商品本体复用 crm_product/crm_product_sku)
--      / storefront_product_i18n((上架位,locale) 唯一的多语言翻译)
--      / storefront_inquiry(询盘,转化进 CRM 公海线索)
--   2. sys_api(842-847)/ sys_menu(2340-2344:顶级「独立站」+ 商品页 + 配置页 + 2 按钮)
--      / sys_menu_api / sys_role_menu(super_admin id=1)
--   3. sys_config 种子:storefront.rates(CNY per unit)/ storefront.locales(站点语言)
--   4. 演示商品种子:crm_product id=1(行简一体化管理平台)挂上架位 slug=xingjian-business-platform
--      + en/zh 两行翻译
--
-- ID 分配区间:sys_menu 2340-2347(实际使用 2340-2344,此前最大 2328);
--             sys_api 842-847(此前最大 841;原 848 预留已改派 deploy,见 deploy.sql)
-- 执行方式:通过 DBX MCP 或 mysql 客户端逐段执行(DBX 多语句须拆单条);幂等可重复执行。
-- 注意:公开接口 /storefront/public/* 不走 Casbin,不登记 sys_api(同 mall 口径)。
-- ============================================================

-- ============================================================
-- 1. 独立站表(与 internal/model/storefront 对齐)
-- ============================================================
CREATE TABLE IF NOT EXISTS `storefront_product` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL COMMENT '关联CRM商品ID(crm_product)',
  `slug` varchar(128) NOT NULL DEFAULT '' COMMENT 'URL别名(独立站详情页,英文小写+连字符;唯一+软删陷阱,重挂前须硬删旧行)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1上架 2下架',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序值(小在前)',
  `price` decimal(14,2) DEFAULT NULL COMMENT '直标价(站点币种;NULL=按汇率由CRM标价CNY折算)',
  `currency` varchar(3) NOT NULL DEFAULT 'USD' COMMENT '直标价币种(ISO 4217)',
  `featured` tinyint(1) NOT NULL DEFAULT '0' COMMENT '首页精选',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sf_product_slug` (`slug`),
  KEY `idx_sf_product_pid` (`product_id`),
  KEY `idx_sf_product_status` (`status`),
  KEY `idx_sf_product_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='独立站商品上架位';

CREATE TABLE IF NOT EXISTS `storefront_product_i18n` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `storefront_product_id` bigint unsigned NOT NULL COMMENT '上架位ID(storefront_product)',
  `locale` varchar(8) NOT NULL COMMENT '语言代码(en/zh)',
  `name` varchar(255) NOT NULL DEFAULT '' COMMENT '商品名(该语言)',
  `summary` varchar(500) NOT NULL DEFAULT '' COMMENT '一句话卖点(该语言)',
  `description` text COMMENT '详细介绍(该语言,Markdown/富文本)',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sf_i18n` (`storefront_product_id`, `locale`),
  KEY `idx_sf_i18n_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='独立站商品多语言翻译';

CREATE TABLE IF NOT EXISTS `storefront_inquiry` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL DEFAULT '' COMMENT '询盘人姓名',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱(独立站主联系渠道)',
  `company` varchar(128) NOT NULL DEFAULT '' COMMENT '公司名',
  `country` varchar(64) NOT NULL DEFAULT '' COMMENT '国家/地区',
  `message` text COMMENT '询盘内容',
  `product_id` bigint unsigned DEFAULT NULL COMMENT '关联上架商品ID(NULL=通用询盘)',
  `locale` varchar(8) NOT NULL DEFAULT 'en' COMMENT '提交语言',
  `ip` varchar(45) NOT NULL DEFAULT '' COMMENT '提交IP(频控+溯源)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1新询盘 2已跟进',
  `lead_no` varchar(64) NOT NULL DEFAULT '' COMMENT '转化出的CRM线索编号(crm_lead.lead_no)',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sf_inquiry_email` (`email`),
  KEY `idx_sf_inquiry_status` (`status`),
  KEY `idx_sf_inquiry_product` (`product_id`),
  KEY `idx_sf_inquiry_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='独立站询盘';

-- ============================================================
-- 2. sys_api 842-847 —— 管理端接口(公开接口不登记;原 848 预留已改派 deploy,见 deploy.sql)
-- ============================================================
DELETE FROM `sys_menu_api` WHERE `sys_menu_id` BETWEEN 2340 AND 2347;
DELETE FROM `sys_role_menu` WHERE `sys_menu_id` BETWEEN 2340 AND 2347;
DELETE FROM `sys_menu` WHERE `id` BETWEEN 2340 AND 2347;
DELETE FROM `sys_api` WHERE `id` BETWEEN 842 AND 847;

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
  (842, '/storefront/products',      'GET',  '独立站-商品', '独立站商品列表(含翻译完整度)', NOW(3), NOW(3)),
  (843, '/storefront/products/:id',  'GET',  '独立站-商品', '独立站商品详情(含全语言翻译)', NOW(3), NOW(3)),
  (844, '/storefront/products/:id',  'PUT',  '独立站-商品', '独立站商品更新', NOW(3), NOW(3)),
  (845, '/storefront/config',        'GET',  '独立站-配置', '站点配置读取(汇率/语言)', NOW(3), NOW(3)),
  (846, '/storefront/config',        'PUT',  '独立站-配置', '站点配置保存', NOW(3), NOW(3)),
  (847, '/storefront/products',      'POST', '独立站-商品', '独立站商品上架创建', NOW(3), NOW(3));

-- ============================================================
-- 3. sys_menu 2340-2344(2345-2347 预留)
--    component 与 admin 前端 src/pages 路径对应:
--    storefront/product/index → src/pages/storefront/product/index.tsx
--    storefront/config/index  → src/pages/storefront/config/index.tsx
-- ============================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`)
VALUES
  (2340, 0,    '独立站',     '',                   '',                         'GlobalOutlined', 7, 0, '',                       1, 1, NOW(3), NOW(3)),
  (2341, 2340, '独立站商品', '/storefront/product', 'storefront/product/index', 'GlobalOutlined', 1, 1, 'storefront:product:list',   1, 1, NOW(3), NOW(3)),
  (2342, 2340, '站点配置',   '/storefront/config',  'storefront/config/index',  'GlobalOutlined', 2, 1, 'storefront:config:manage',  1, 1, NOW(3), NOW(3)),
  (2343, 2341, '新增/编辑商品', NULL, NULL, NULL, 1, 2, 'storefront:product:edit', 1, 1, NOW(3), NOW(3)),
  (2344, 2342, '保存站点配置', NULL, NULL, NULL, 1, 2, 'storefront:config:save',  1, 1, NOW(3), NOW(3));

-- ============================================================
-- 4. sys_menu_api —— 菜单(含按钮)与 API 关联
-- ============================================================
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`) VALUES
  (2341, 842),  -- 商品列表/详情菜单 → GET /storefront/products(+ :id 详情同菜单)
  (2341, 843),
  (2341, 844),  -- 列表页内编辑共用更新接口
  (2342, 845),  -- 站点配置页 → GET /storefront/config
  (2342, 846),
  (2343, 844),  -- 新增/编辑商品按钮 → PUT /storefront/products/:id + POST /storefront/products
  (2343, 847),
  (2344, 846);  -- 保存站点配置按钮 → PUT /storefront/config

-- ============================================================
-- 5. sys_role_menu —— 默认授权超管角色(id=1)
-- ============================================================
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT 1, m.id FROM `sys_menu` m WHERE m.id BETWEEN 2340 AND 2344
ON DUPLICATE KEY UPDATE `sys_role_id` = VALUES(`sys_role_id`);

-- ============================================================
-- 6. sys_config —— storefront.rates(CNY per unit)/ storefront.locales(站点语言)
-- ============================================================
INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `sort`, `remark`, `created_at`, `updated_at`)
SELECT 'storefront', 'storefront.rates', '独立站汇率', '{"USD":7.2,"EUR":7.8,"GBP":8.8}', 'json', 1, 1, 10, 'CNY per unit;直标价为空时按此汇率由 CRM 标价(CNY)折算', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'storefront.rates');

INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `sort`, `remark`, `created_at`, `updated_at`)
SELECT 'storefront', 'storefront.locales', '独立站语言', '["en","zh"]', 'json', 1, 1, 11, '站点语言(第一个=主语言)', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'storefront.locales');

-- ============================================================
-- 7. 演示商品种子 —— crm_product id=1(行简一体化管理平台)挂上架位 + en/zh 翻译
-- ============================================================
DELETE FROM `storefront_product_i18n` WHERE `id` IN (1, 2) OR `storefront_product_id` = 1;
DELETE FROM `storefront_product` WHERE `id` = 1 OR `slug` = 'xingjian-business-platform';

INSERT INTO `storefront_product` (`id`, `product_id`, `slug`, `status`, `sort`, `price`, `currency`, `featured`, `created_at`, `updated_at`) VALUES
  (1, 1, 'xingjian-business-platform', 1, 0, NULL, 'USD', 1, NOW(3), NOW(3));

INSERT INTO `storefront_product_i18n` (`id`, `storefront_product_id`, `locale`, `name`, `summary`, `description`, `created_at`, `updated_at`) VALUES
  (1, 1, 'en', 'Xingjian Business Platform', 'All-in-one open-source business suite',
   'Xingjian is an all-in-one, MIT-licensed open-source business platform. One backend drives the web admin, mobile H5, iOS/Android apps and the public site.\n\nFeatures:\n- CRM: leads, customers, opportunities, contracts and payments\n- PSI: purchase, sales and inventory with stock movements\n- Finance: vouchers, invoices, receivables and statements\n- HRM: attendance, payroll, leave, recruitment and performance\n- OA: approvals, notices, schedules, meetings and work logs\n- Project management, knowledge base, CMS and open integrations\n\nSelf-host with Docker or deploy to any cloud. REST API and MCP ready.',
   NOW(3), NOW(3)),
  (2, 1, 'zh', '行简一体化管理平台', 'MIT 开源一体化管理平台',
   '行简是一套 MIT 开源的一体化企业管理平台,一个后端同时驱动后台管理、移动 H5、iOS/Android 与官网。\n\n核心能力:\n- CRM:线索/客户/商机/合同/回款\n- 进销存:采购/销售/库存与出入库流水\n- 财务:凭证/发票/应收应付与报表\n- 人力:考勤/薪酬/请假/招聘/绩效\n- OA:审批/公告/日程/会议/工作日志\n- 项目管理、知识库、CMS 与开放集成\n\n支持 Docker 自托管或任意云部署,提供 REST API 与 MCP 接入。',
   NOW(3), NOW(3));
