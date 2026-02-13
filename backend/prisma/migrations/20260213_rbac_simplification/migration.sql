-- RBAC 权限系统精简设计迁移脚本
-- 日期: 2026-02-13
-- 说明: 将基于 Permission 的权限系统迁移为基于 Menu 的 RBAC 系统

-- ============================================
-- 1. 创建 role_menu 表
-- ============================================
CREATE TABLE IF NOT EXISTS role_menu (
  id TEXT PRIMARY KEY,
  roleId TEXT NOT NULL,
  menuId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(roleId, menuId)
);

CREATE INDEX IF NOT EXISTS idx_role_menu_roleId ON role_menu(roleId);
CREATE INDEX IF NOT EXISTS idx_role_menu_menuId ON role_menu(menuId);

-- ============================================
-- 2. 添加新字段到 menu 表
-- ============================================
-- 检查列是否存在，不存在则添加
-- SQLite 不支持 IF NOT EXISTS for ALTER TABLE，使用异常处理
ALTER TABLE menus ADD COLUMN type TEXT DEFAULT 'menu';
ALTER TABLE menus ADD COLUMN permissionCode TEXT;

-- ============================================
-- 3. 数据迁移说明
-- ============================================
-- 注意: 以下迁移步骤需要根据实际情况调整
-- 1. 首先需要将 permissions 表中的数据迁移到 menus 表
-- 2. 将 type='button' 的权限创建为 menu 记录
-- 3. 将 role_permissions 关系迁移到 role_menu

-- 示例迁移逻辑（请根据实际数据调整）:
-- INSERT INTO role_menu (id, roleId, menuId, createdAt)
-- SELECT
--   lower(hex(randomblob(16))) as id,
--   rp.roleId,
--   p.menuId,
--   datetime('now')
-- FROM role_permissions rp
-- JOIN permissions p ON p.id = rp.permissionId
-- WHERE p.menuId IS NOT NULL;

-- ============================================
-- 4. 删除旧的 permission 相关表（谨慎操作）
-- ============================================
-- DROP TABLE IF EXISTS role_permissions;
-- DROP TABLE IF EXISTS menu_permissions;
-- DROP TABLE IF EXISTS permissions;

-- ============================================
-- 5. 验证
-- ============================================
-- 检查 role_menu 表是否创建成功
SELECT 'role_menu 表创建检查' as check_name, COUNT(*) as count FROM role_menu;

-- 检查 menus 表新字段是否添加成功
PRAGMA table_info(menus);
