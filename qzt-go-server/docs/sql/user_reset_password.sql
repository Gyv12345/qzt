-- user_reset_password.sql 用户管理「重置密码」功能的 RBAC 种子。
--
-- 用途:配合 system 模块新接口 PUT /system/users/:id/reset-password ——
-- 管理员重置指定用户密码(无需旧密码,典型场景:用户忘记密码)。重置后
-- TokenVersion+1 撤销该用户全部已登录会话,并清除其登录失败锁定。
-- 前端用户管理页操作列新增「重置密码」按钮,权限码 system:user:resetPwd。
--
-- 内容:
--   1. sys_api id=502:新接口登记(供角色管理→API 授权页勾选)
--   2. sys_menu id=24:用户管理菜单(id=2)下「重置密码」按钮(type=2)
--   3. sys_role_menu:super_admin(role 1)持有该按钮(与其余用户按钮 20-23
--      保持一致;超管 permissions=["*"],此记录仅为数据一致性)
--
-- casbin 说明:super_admin 走代码级绕过无需规则;其他角色由管理员在
-- 角色管理→API 授权页勾选新接口(保存时全量重建该角色策略,自动写入
-- casbin_rule)。因此本脚本不含 casbin_rule 插入,无停机窗口要求。
--
-- ID 分配:sys_api 502(执行前全库最大 501);sys_menu 24(用户按钮区
-- 20-23 的下一个空位,24-29 空闲)。
-- 幂等:先 DELETE 固定 ID 再 INSERT。
-- 执行方式:DBX MCP 或 mysql 客户端;DBX 多语句只执行第一条,须逐条执行。
-- 时间:2026-08-18

-- 1. API 登记
DELETE FROM sys_api WHERE id = 502;
INSERT INTO sys_api (id, path, method, `group`, description)
VALUES (502, '/system/users/:id/reset-password', 'PUT', '用户管理', '重置用户密码');

-- 2. 按钮权限(挂在用户管理菜单 id=2 下)
DELETE FROM sys_menu WHERE id = 24;
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, sort, type, permission, visible, status)
VALUES (24, 2, '重置密码', '', '', '', 5, 2, 'system:user:resetPwd', 1, 1);

-- 3. super_admin 持有该按钮
DELETE FROM sys_role_menu WHERE sys_role_id = 1 AND sys_menu_id = 24;
INSERT INTO sys_role_menu (sys_role_id, sys_menu_id) VALUES (1, 24);
