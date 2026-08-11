-- ============================================================
-- kb.sql — 知识库模块菜单 + API 权限种子
-- 用途:
--   1. 清理历史上被错挂到「CRM 配置」(menu id=700, type=1)下的 kb 菜单(701-713)
--      —— 这些菜单挂在 type=1 的叶子下当第三层,admin 侧边栏只渲染「type=0 分组 → type=1 叶子」
--         两层,因此永远不会显示,导致用户在 admin 找不到知识库入口。
--   2. 重建为独立顶级模块「知识库」(/kb),与客户管理(/crm)、办公中心(/oa)并列,
--      下挂「文档管理」「分类管理」两个页面 + 按钮权限。
--   3. 补齐 sys_api 中 kb 模块接口权限项(供普通角色 RBAC 分配;
--      super_admin 角色自动 bypass casbin,无需配策略即可访问)。
-- 前置:kb_category / kb_document / kb_version 三张业务表已存在(本文件不含建表 DDL)。
-- ID 分配:菜单 740-748(720-728 已被「网盘」cloud 模块占用);sys_api 自增。
-- 执行:通过 DBX MCP 或 mysql 客户端在 qztgo 库执行;幂等(重跑先按固定区间 DELETE 再 INSERT)。
-- ============================================================

-- ---------- 1. 清理旧的错位 kb 菜单(原挂在 CRM 配置 id=700 下) ----------
DELETE FROM sys_menu WHERE id IN (701, 702, 703, 704, 710, 711, 712, 713);

-- ---------- 2. 重建为独立顶级模块「知识库」(幂等:先清本脚本的固定区间) ----------
DELETE FROM sys_menu WHERE id BETWEEN 740 AND 748;
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, sort, type, permission, visible, status, created_at, updated_at) VALUES
-- 顶级模块:知识库(type=0 目录,顶栏模块下拉可见)
(740, 0,   '知识库',   '/kb',          NULL,                   'BookOutlined',     2, 0, '',                  1, 1, NOW(), NOW()),
-- 文档管理(列表页)
(741, 740, '文档管理', '/kb/document', 'kb/document/index',    'FileTextOutlined', 1, 1, 'kb:document:list',  1, 1, NOW(), NOW()),
-- 文档管理 - 按钮权限(type=2)
(742, 741, '新增文档', NULL,           NULL,                   NULL,               1, 2, 'kb:document:add',   0, 1, NOW(), NOW()),
(743, 741, '编辑文档', NULL,           NULL,                   NULL,               2, 2, 'kb:document:edit',  0, 1, NOW(), NOW()),
(744, 741, '删除文档', NULL,           NULL,                   NULL,               3, 2, 'kb:document:delete',0, 1, NOW(), NOW()),
-- 分类管理
(745, 740, '分类管理', '/kb/category', 'kb/category/index',    'FolderOutlined',   2, 1, 'kb:category:list',  1, 1, NOW(), NOW()),
-- 分类管理 - 按钮权限(type=2)
(746, 745, '新增分类', NULL,           NULL,                   NULL,               1, 2, 'kb:category:add',   0, 1, NOW(), NOW()),
(747, 745, '编辑分类', NULL,           NULL,                   NULL,               2, 2, 'kb:category:edit',  0, 1, NOW(), NOW()),
(748, 745, '删除分类', NULL,           NULL,                   NULL,               3, 2, 'kb:category:delete',0, 1, NOW(), NOW());

-- ---------- 3. 补齐 kb 模块的 sys_api 权限项(普通角色 RBAC 分配用) ----------
-- 幂等:先按 path 前缀清掉旧的(含软删除残留),再插入
DELETE FROM sys_api WHERE path LIKE '/kb%';
INSERT INTO sys_api (path, method, description, `group`, created_at, updated_at) VALUES
('/kb/categories',                                'GET',    '知识库分类列表',   '知识库', NOW(), NOW()),
('/kb/categories',                                'POST',   '创建知识库分类',   '知识库', NOW(), NOW()),
('/kb/categories/:id',                            'PUT',    '更新知识库分类',   '知识库', NOW(), NOW()),
('/kb/categories/:id',                            'DELETE', '删除知识库分类',   '知识库', NOW(), NOW()),
('/kb/documents',                                 'GET',    '知识库文档列表',   '知识库', NOW(), NOW()),
('/kb/documents',                                 'POST',   '创建知识库文档',   '知识库', NOW(), NOW()),
('/kb/documents/:id',                             'GET',    '知识库文档详情',   '知识库', NOW(), NOW()),
('/kb/documents/:id',                             'PUT',    '更新知识库文档',   '知识库', NOW(), NOW()),
('/kb/documents/:id',                             'DELETE', '删除知识库文档',   '知识库', NOW(), NOW()),
('/kb/documents/:id/versions',                    'GET',    '文档版本历史',     '知识库', NOW(), NOW()),
('/kb/documents/:id/versions/:versionId/restore', 'PUT',    '回滚文档版本',     '知识库', NOW(), NOW());

-- ---------- 4. 默认关联到超级管理员角色(sys_role_id=1) ----------
-- 其他角色请在 admin「系统管理 → 角色 → 分配菜单」里按需勾选知识库;
-- 接口权限则在「分配 API」里勾选 group=知识库 的 11 条(普通角色才需要,super_admin 自动 bypass casbin)。
DELETE FROM sys_role_menu WHERE sys_role_id=1 AND sys_menu_id BETWEEN 740 AND 748;
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id) VALUES
(1,740),(1,741),(1,742),(1,743),(1,744),(1,745),(1,746),(1,747),(1,748);
