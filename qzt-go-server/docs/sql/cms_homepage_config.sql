-- cms_homepage_config.sql
-- CMS 首页板块配置: 板块开关 + 精选条目。
-- 执行方式: 通过 DBX MCP 或 mysql 手动执行。
-- ID 分配: 菜单 960-965 (sys_menu 当前 max=952)

-- ── 板块开关表 (3 行固定数据) ──
CREATE TABLE IF NOT EXISTS cms_homepage_module (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  module      VARCHAR(20) NOT NULL COMMENT '模块标识: product/partner/team',
  module_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '模块中文名',
  enabled     TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在CMS首页显示',
  sort        INT NOT NULL DEFAULT 0 COMMENT '板块排序(越小越靠前)',
  created_at  DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at  DATETIME(3) DEFAULT NULL,
  UNIQUE KEY uk_module (module),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS首页板块开关';

-- ── 精选条目表 ──
CREATE TABLE IF NOT EXISTS cms_homepage_feature (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  module     VARCHAR(20) NOT NULL COMMENT '模块标识: product/partner/team',
  item_id    BIGINT UNSIGNED NOT NULL COMMENT '业务条目ID(crm_product.id / crm_customer.id / sys_user.id)',
  sort       INT NOT NULL DEFAULT 0 COMMENT '展示排序(越小越靠前)',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) DEFAULT NULL,
  UNIQUE KEY uk_module_item (module, item_id),
  INDEX idx_module_sort (module, sort),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS首页精选条目';

-- ── 种子: 3 个板块开关 ──
INSERT INTO cms_homepage_module (id, module, module_name, enabled, sort) VALUES
  (1, 'product', '产品与服务', 1, 1),
  (2, 'partner', '合作伙伴',   1, 2),
  (3, 'team',    '我们的团队', 1, 3)
  ON DUPLICATE KEY UPDATE module_name = VALUES(module_name);

-- ── 菜单: 官网首页配置 (挂在「官网内容」目录下, parent_id=111;
--    2026-08-18 从「系统配置」目录(876)迁入——展示内容由业务人员维护,归官网内容域) ──
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, sort, type, permission, visible, status, created_at, updated_at) VALUES
  (960, 111, '官网首页配置', '/cms/homepage-config', 'cms/homepage-config/index', 'DesktopOutlined', 5, 1, 'system:homepage:list', 1, 1, NOW(), NOW())
  ON DUPLICATE KEY UPDATE name=VALUES(name), parent_id=VALUES(parent_id), path=VALUES(path), component=VALUES(component);

-- 按钮权限
INSERT INTO sys_menu (id, parent_id, name, type, permission, sort, status, created_at, updated_at) VALUES
  (961, 960, '板块开关',  2, 'system:homepage:toggle', 1, 1, NOW(), NOW()),
  (962, 960, '精选同步',  2, 'system:homepage:sync',   2, 1, NOW(), NOW()),
  (963, 960, '精选移除',  2, 'system:homepage:remove', 3, 1, NOW(), NOW())
  ON DUPLICATE KEY UPDATE name=VALUES(name);
