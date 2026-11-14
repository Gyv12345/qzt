-- ============================================================================
-- product_category.sql  CRM 产品分类树(2026-11-12)
--
-- 用途:产品分类从系统字典 PRODUCT_CATEGORY 迁为 CRM 域内树表 crm_product_category。
-- 字典 4 项(SOFTWARE软件/HARDWARE硬件/SERVICE服务/OTHER其他)与 crm_product.category
-- 真实存量(12 个中文名:后端29/全栈23/小程序11/前端11/工具8/桌面端5/iOS5/技术服务2/
-- 原型2/Android2/运维2/软件产品1)完全脱节,树以产品真实分布为准:12 个真实值全部做
-- 叶子逐字保留(丢名会让存量商品分类悬空),顶层按语义分组。
-- crm_product.category 存量数据不动(仍存叶子名字符串);admin 树选择写叶子名进
-- category,官网按名字符串筛选。删除分类不阻断商品引用(服务层只提示引用数)。
--
-- ID 分配:
--   crm_product_category 固定种子 ID 1-14:
--     1 软件产品(p0) 2 技术服务(p0) 3 定制开发(p0,子 4-11)
--     4 全栈/5 后端/6 前端/7 小程序/8 桌面端/9 iOS/10 Android/11 原型(parent 3)
--     12 工具与运维(p0,子 13-14)  13 工具/14 运维(parent 12)
--   sys_api 850-853(现用最大 849);sys_menu 2348-2350(现用最大 2344,挂 CRM 目录 130 下)
--   公开接口 GET /crm/public/product-categories 不登记 sys_api(同 mall 口径)
--
-- 幂等性:建表 CREATE TABLE IF NOT EXISTS;种子与 sys_api/sys_menu 均先 DELETE 硬删
--   固定 ID 区间再 INSERT;sys_menu_api/sys_role_menu 复合主键按 NOT EXISTS 守卫。
--
-- 执行方式:DBX MCP「我的阿里云数据库」逐条执行(多语句只生效第一条,须单语句单调用)。
-- ============================================================================

-- ── 1. 分类树表 ──
CREATE TABLE IF NOT EXISTS `crm_product_category` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT '父分类ID(0=顶层)',
  `name` varchar(64) NOT NULL COMMENT '分类名称(同层唯一)',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序号(升序)',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '1启用 2停用',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parent_name` (`parent_id`, `name`),
  KEY `idx_crm_product_category_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CRM产品分类树';

-- ── 2. 分类树种子(先硬删固定区间再插入,可重复执行) ──
DELETE FROM `crm_product_category` WHERE `id` IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14);

INSERT INTO `crm_product_category` (`id`, `parent_id`, `name`, `sort`, `status`, `created_at`, `updated_at`) VALUES
(1,  0,  '软件产品',   1, 1, NOW(3), NOW(3)),
(2,  0,  '技术服务',   2, 1, NOW(3), NOW(3)),
(3,  0,  '定制开发',   3, 1, NOW(3), NOW(3)),
(4,  3,  '全栈',       1, 1, NOW(3), NOW(3)),
(5,  3,  '后端',       2, 1, NOW(3), NOW(3)),
(6,  3,  '前端',       3, 1, NOW(3), NOW(3)),
(7,  3,  '小程序',     4, 1, NOW(3), NOW(3)),
(8,  3,  '桌面端',     5, 1, NOW(3), NOW(3)),
(9,  3,  'iOS',        6, 1, NOW(3), NOW(3)),
(10, 3,  'Android',    7, 1, NOW(3), NOW(3)),
(11, 3,  '原型',       8, 1, NOW(3), NOW(3)),
(12, 0,  '工具与运维', 4, 1, NOW(3), NOW(3)),
(13, 12, '工具',       1, 1, NOW(3), NOW(3)),
(14, 12, '运维',       2, 1, NOW(3), NOW(3));

-- ── 3. 管理端接口登记 sys_api 850-853 ──
DELETE FROM `sys_api` WHERE `id` IN (850,851,852,853);

INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`) VALUES
(850, '/crm/product-categories/tree', 'GET',    'CRM-产品分类', '产品分类树查询', NOW(3), NOW(3)),
(851, '/crm/product-categories',      'POST',   'CRM-产品分类', '新增产品分类',   NOW(3), NOW(3)),
(852, '/crm/product-categories/:id',  'PUT',    'CRM-产品分类', '更新产品分类',   NOW(3), NOW(3)),
(853, '/crm/product-categories/:id',  'DELETE', 'CRM-产品分类', '删除产品分类',   NOW(3), NOW(3));

-- ── 4. 菜单 sys_menu 2348-2350(页面挂 CRM 目录 130 下 + 2 按钮) ──
DELETE FROM `sys_menu` WHERE `id` IN (2348,2349,2350);

INSERT INTO `sys_menu` (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`) VALUES
(2348, 130,  '产品分类',     '/crm/product-category', 'crm/product-category/index', NULL, 2, 1, 'crm:productCategory:list',  1, 1, NOW(3), NOW(3)),
(2349, 2348, '新增/编辑分类', NULL, NULL, NULL, 1, 2, 'crm:productCategory:edit',   1, 1, NOW(3), NOW(3)),
(2350, 2348, '删除分类',     NULL, NULL, NULL, 2, 2, 'crm:productCategory:delete', 1, 1, NOW(3), NOW(3));

-- ── 5. 菜单-接口绑定(页面绑 tree 查询;新增/编辑按钮绑 POST/PUT;删除按钮绑 DELETE) ──
INSERT INTO `sys_menu_api` (`sys_menu_id`, `sys_api_id`)
SELECT t.menu_id, t.api_id FROM (
  SELECT 2348 AS menu_id, 850 AS api_id
  UNION ALL SELECT 2349, 851
  UNION ALL SELECT 2349, 852
  UNION ALL SELECT 2350, 853
) t
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_menu_api` m WHERE m.sys_menu_id = t.menu_id AND m.sys_api_id = t.api_id
);

-- ── 6. 超管角色(role 1)绑定菜单(绑定后 service 自动重建 Casbin 策略) ──
INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
SELECT t.role_id, t.menu_id FROM (
  SELECT 1 AS role_id, 2348 AS menu_id
  UNION ALL SELECT 1, 2349
  UNION ALL SELECT 1, 2350
) t
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_role_menu` r WHERE r.sys_role_id = t.role_id AND r.sys_menu_id = t.menu_id
);

