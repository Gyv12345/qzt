# RBAC 权限系统精简实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 精简权限系统为标准 RBAC 模型，只保留 user、role、dept、menu、role_menu 五张表，删除所有 Permission 相关表。

**Architecture:**
- 将权限检查从 Permission 模型迁移到 Menu 模型（通过 permissionCode 字段）
- Role 与 Menu 通过 RoleMenu 多对多关联表连接
- 保留 dataScope 数据权限功能
- 重构现有 PermissionService 和 Guards 但保持 API 兼容

**Tech Stack:** Prisma, NestJS, SQLite (开发) / MySQL (生产)

---

## Task 1: 备份现有数据库

**Files:**
- None (数据库操作)

**Step 1: 停止后端服务**

```bash
cd /Users/shichenyang/WebstormProjects/qzt
./start-dev.sh stop
```

**Step 2: 备份数据库文件**

```bash
cp backend/prisma/dev.db backend/prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)
```

**Step 3: 验证备份文件存在**

```bash
ls -lh backend/prisma/dev.db.backup.*
```

Expected: 显示备份文件及其大小

**Step 4: 重启服务**

```bash
./start-dev.sh start
```

---

## Task 2: 更新 Prisma Schema - 修改 Role 模型

**Files:**
- Modify: `backend/prisma/schema.prisma:70-87`

**Step 1: 读取当前 Role 模型**

确认当前 Role 模型内容（第 70-87 行）

**Step 2: 修改 Role 模型，删除 permissions 关联，新增 menus 关联**

```prisma
model Role {
  id             String   @id @default(cuid())
  name           String
  code           String   @unique
  description    String?
  type           String   @default("system") // 角色类型: system(系统角色), team(团队角色)
  dataScope      String   @default("all") // 数据权限范围: all(全部), department(本部门), department_and_sub(本部门及下级), custom(自定义), self(仅本人)
  dataScopeDeptIds String? // 数据权限-自定义部门ID列表(JSON数组)
  status         String   @default("ACTIVE") // ACTIVE:启用 INACTIVE:禁用
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  users          UserRole[]
  menus          RoleMenu[]  // 新增：关联菜单

  @@map("roles")
}
```

**Step 3: 保存修改**

---

## Task 3: 更新 Prisma Schema - 修改 Menu 模型

**Files:**
- Modify: `backend/prisma/schema.prisma:104-127`

**Step 1: 修改 Menu 模型**

```prisma
model Menu {
  id            String   @id @default(cuid())
  path          String   @unique // 路由路径
  name          String   // 菜单名称
  icon          String?  // 图标
  parentId      String?  // 父级菜单ID
  sort          Int      @default(0) // 排序
  enabled       Boolean  @default(true) // 是否启用
  groupTitle    String?  // 菜单分组标题（业务、系统设置等）
  i18nKey       String?  // 国际化 key
  badge         String?  // 徽章/角标
  isHidden      Boolean  @default(false) // 是否隐藏
  isSystem      Boolean  @default(false) // 是否系统菜单
  type          String   @default("menu") // 新增: menu(菜单) / button(按钮)
  permissionCode String?                  // 新增: 权限标识，如 "customer.create"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  parent         Menu?             @relation("MenuHierarchy", fields: [parentId], references: [id])
  children       Menu[]            @relation("MenuHierarchy")
  roles          RoleMenu[]        // 新增：关联角色

  @@index([parentId])
  @@map("menus")
}
```

**Step 2: 保存修改**

---

## Task 4: 更新 Prisma Schema - 新增 RoleMenu 模型

**Files:**
- Create: `backend/prisma/schema.prisma` (在 Menu 模型后添加)

**Step 1: 在 Menu 模型后添加 RoleMenu 模型**

找到第 127 行 `@@map("menus")` 后，添加：

```prisma
model RoleMenu {
  id        String   @id @default(cuid())
  roleId    String
  menuId    String
  createdAt DateTime @default(now())

  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  menu Menu @relation(fields: [menuId], references: [id], onDelete: Cascade)

  @@unique([roleId, menuId])
  @@index([roleId])
  @@index([menuId])
  @@map("role_menu")
}
```

**Step 2: 删除 schema 中第 102 行的 `role_menu` 占位符**

**Step 3: 保存修改**

---

## Task 5: 应用数据库变更

**Files:**
- None (数据库操作)

**Step 1: 生成 Prisma Client**

```bash
cd backend && pnpm prisma generate
```

Expected: 输出显示生成的文件数量

**Step 2: 推送 schema 到数据库**

```bash
cd backend && pnpm prisma db push
```

Expected: 输出显示数据库变更已应用

**Step 3: 验证 role_menu 表已创建**

```bash
cd backend && pnpm prisma studio
```

在浏览器中验证 role_menu 表存在并包含正确字段

---

## Task 6: 重构 PermissionService

**Files:**
- Modify: `backend/src/modules/permission/permission.service.ts`

**Step 1: 读取现有的 PermissionService**

了解当前实现方法

**Step 2: 重构 getUserMenus 方法**

```typescript
async getUserMenus(userId: string): Promise<Menu[]> {
  // 获取用户的角色
  const userRoles = await this.prisma.userRole.findMany({
    where: { userId },
    include: {
      role: true,
    },
  });

  const roleIds = userRoles.map((ur) => ur.roleId);

  // 获取角色关联的菜单（只返回 type='menu' 的）
  const roleMenus = await this.prisma.roleMenu.findMany({
    where: {
      roleId: { in: roleIds },
    },
    include: {
      menu: true,
    },
  });

  // 过滤出菜单类型的项，并构建树形结构
  const menus = roleMenus
    .map((rm) => rm.menu)
    .filter((menu) => menu.type === 'menu' && menu.enabled);

  return this.buildMenuTree(menus);
}
```

**Step 3: 添加 hasPermission 方法**

```typescript
async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  if (!permissionCode) return true;

  // 超级管理员检查
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });

  const hasSystemRole = user.roles.some(
    (ur) => ur.role.code === 'SUPER_ADMIN' || ur.role.code === 'ADMIN'
  );
  if (hasSystemRole) return true;

  // 查找对应的 menu
  const menu = await this.prisma.menu.findUnique({
    where: { permissionCode },
  });

  if (!menu) return false;

  // 检查用户角色是否关联该菜单
  const roleIds = user.roles.map((ur) => ur.roleId);
  const roleMenu = await this.prisma.roleMenu.findFirst({
    where: {
      roleId: { in: roleIds },
      menuId: menu.id,
    },
  });

  return !!roleMenu;
}
```

**Step 4: 添加 assignMenusToRole 方法**

```typescript
async assignMenusToRole(roleId: string, menuIds: string[]): Promise<void> {
  // 删除现有关联
  await this.prisma.roleMenu.deleteMany({
    where: { roleId },
  });

  // 创建新关联
  if (menuIds.length > 0) {
    await this.prisma.roleMenu.createMany({
      data: menuIds.map((menuId) => ({
        roleId,
        menuId,
      })),
    });
  }
}
```

**Step 5: 添加 getRoleMenus 方法**

```typescript
async getRoleMenus(roleId: string): Promise<Menu[]> {
  const roleMenus = await this.prisma.roleMenu.findMany({
    where: { roleId },
    include: { menu: true },
  });

  return roleMenus.map((rm) => rm.menu);
}
```

**Step 6: 更新导入语句**

确保导入 Prisma 的 Menu 和 RoleMenu 类型

**Step 7: 保存文件**

---

## Task 7: 更新 PermissionsGuard

**Files:**
- Modify: `backend/src/modules/permission/guards/permissions.guard.ts`

**Step 1: 读取现有的 PermissionsGuard**

**Step 2: 重构 canActivate 方法使用新的 hasPermission**

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const user = request.user;

  if (!user) return false;

  // 获取所需权限
  const requiredPermissions = this.reflector.get<string[]>(
    REQUIRE_PERMISSIONS_KEY,
    context.getHandler()
  );

  // 没有权限要求，直接通过
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  // 超级管理员直接通过
  if (user.isSystem) return true;

  // 检查用户是否拥有任一所需权限
  for (const permission of requiredPermissions) {
    const hasPermission = await this.permissionService.hasPermission(
      user.id,
      permission
    );
    if (hasPermission) return true;
  }

  return false;
}
```

**Step 3: 保存文件**

---

## Task 8: 更新 PermissionController API

**Files:**
- Modify: `backend/src/modules/permission/permission.controller.ts`

**Step 1: 添加角色菜单分配接口**

```typescript
@Post('roles/:roleId/menus')
@RequirePermissions('role.assignMenus')
async assignMenusToRole(
  @Param('roleId') roleId: string,
  @Body() dto: AssignMenusDto
) {
  await this.permissionService.assignMenusToRole(roleId, dto.menuIds);
  return { success: true };
}
```

**Step 2: 添加获取角色菜单接口**

```typescript
@Get('roles/:roleId/menus')
async getRoleMenus(@Param('roleId') roleId: string) {
  const menus = await this.permissionService.getRoleMenus(roleId);
  return menus;
}
```

**Step 3: 更新 DTO 文件**

**Files:**
- Create: `backend/src/modules/permission/dto/assign-menus.dto.ts`

```typescript
import { IsArray } from 'class-validator';

export class AssignMenusDto {
  @IsArray()
  menuIds: string[];
}
```

**Step 4: 保存文件**

---

## Task 9: 更新前端 API 客户端

**Files:**
- Modify: `frontend/src/services/api/`

**Step 1: 重新生成 API**

```bash
cd frontend && pnpm run generate:api
```

Expected: Orval 生成新的 API 客户端

**Step 2: 检查生成的类型**

确认 `RoleMenu` 相关类型已生成

---

## Task 10: 更新前端角色权限组件

**Files:**
- Modify: `frontend/src/features/roles/components/role-permissions-content.tsx`

**Step 1: 读取现有组件**

**Step 2: 修改为使用菜单 API**

```typescript
// 使用 getRoleMenus 和 assignMenusToRole API
const { data: menus } = useQuery({
  queryKey: ['role-menus', roleId],
  queryFn: () => getScrmApi().permissionControllerGetRoleMenus({ roleId }),
});

const assignMenus = useMutation({
  mutationFn: (menuIds: string[]) =>
    getScrmApi().permissionControllerAssignMenusToRole({
      roleId,
      assignMenusDto: { menuIds },
  }),
});
```

**Step 3: 更新组件 UI**

- 树形选择器改为选择 Menu
- 区分 type='menu' 和 type='button' 的显示
- 添加 permissionCode 显示

**Step 4: 保存文件**

---

## Task 11: 添加菜单初始数据

**Files:**
- Modify: `backend/src/modules/permission/permission.service.ts`

**Step 1: 在初始化方法中添加菜单数据**

```typescript
private async initializeMenus() {
  const existingMenus = await this.prisma.menu.count();
  if (existingMenus > 0) return;

  const menus = [
    // 客户管理菜单
    {
      path: '/customers',
      name: '客户管理',
      icon: 'Users',
      type: 'menu',
      permissionCode: null,
      sort: 1,
      groupTitle: '业务',
      i18nKey: 'menu.customers',
    },
    // 客户管理按钮权限
    {
      path: '/customers/create',
      name: '新增客户',
      type: 'button',
      permissionCode: 'customer.create',
      sort: 1,
    },
    {
      path: '/customers/edit',
      name: '编辑客户',
      type: 'button',
      permissionCode: 'customer.edit',
      sort: 2,
    },
    {
      path: '/customers/delete',
      name: '删除客户',
      type: 'button',
      permissionCode: 'customer.delete',
      sort: 3,
    },
    // 合同管理
    {
      path: '/contracts',
      name: '合同管理',
      icon: 'FileText',
      type: 'menu',
      permissionCode: null,
      sort: 2,
      groupTitle: '业务',
      i18nKey: 'menu.contracts',
    },
    // 系统设置
    {
      path: '/users',
      name: '用户管理',
      icon: 'UserCog',
      type: 'menu',
      permissionCode: 'user.view',
      sort: 100,
      groupTitle: '系统设置',
      i18nKey: 'menu.users',
    },
    {
      path: '/roles',
      name: '角色管理',
      icon: 'Shield',
      type: 'menu',
      permissionCode: 'role.view',
      sort: 101,
      groupTitle: '系统设置',
      i18nKey: 'menu.roles',
    },
  ];

  await this.prisma.menu.createMany({
    data: menus,
  });
}
```

**Step 2: 在 onModuleInit 中调用**

```typescript
async onModuleInit() {
  await this.initializeMenus();
}
```

**Step 3: 保存文件**

---

## Task 12: 测试权限检查功能

**Files:**
- Test: `backend/src/modules/permission/permission.service.spec.ts`

**Step 1: 编写 hasPermission 测试**

```typescript
describe('hasPermission', () => {
  it('should return true for super admin', async () => {
    const result = await service.hasPermission('super-admin-id', 'customer.create');
    expect(result).toBe(true);
  });

  it('should return true when user has role with menu permission', async () => {
    const result = await service.hasPermission('user-id-with-permission', 'customer.view');
    expect(result).toBe(true);
  });

  it('should return false when user lacks permission', async () => {
    const result = await service.hasPermission('user-id-without-permission', 'customer.delete');
    expect(result).toBe(false);
  });
});
```

**Step 2: 运行测试**

```bash
cd backend && pnpm test permission.service.spec
```

Expected: 所有测试通过

---

## Task 13: 端到端验证

**Files:**
- None (手动测试)

**Step 1: 重启服务**

```bash
./start-dev.sh restart
```

**Step 2: 登录系统**

使用测试账号登录前端

**Step 3: 验证菜单显示**

- 确认只显示角色有权访问的菜单
- 确认菜单层级正确

**Step 4: 验证按钮权限**

- 确认无权限的按钮被隐藏或禁用
- 使用有权限的账号验证按钮可操作

**Step 5: 验证角色管理**

- 进入角色管理页面
- 为角色分配菜单权限
- 保存后用对应角色账号登录验证

**Step 6: 验证数据权限**

- 使用不同 dataScope 的角色登录
- 确认只能看到对应数据范围的内容

---

## Task 14: 更新 API 文档

**Files:**
- Modify: `docs/api/permissions.md`

**Step 1: 更新权限 API 文档**

记录新的权限相关接口：
- `GET /permissions/roles/:roleId/menus` - 获取角色菜单
- `POST /permissions/roles/:roleId/menus` - 分配菜单给角色
- `GET /permissions/user-menus` - 获取用户菜单

**Step 2: 保存文件**

---

## Task 15: 提交所有变更

**Files:**
- Git 操作

**Step 1: 查看变更**

```bash
git status
git diff
```

**Step 2: 提交变更**

```bash
git add -A
git commit -m "feat(backend): 精简 RBAC 权限系统

- 只保留 user, role, dept, menu, role_menu 五张表
- 删除所有 Permission 相关表
- Menu 表新增 type 和 permissionCode 字段支持按钮权限
- 重构 PermissionService 和 PermissionsGuard
- 保留 dataScope 数据权限功能
- 更新前端角色权限组件"
```

**Step 3: 验证提交**

```bash
git log -1 --stat
```

---

## 验收标准

- [ ] role_menu 表创建成功且关联正确
- [ ] Menu 表包含 type 和 permissionCode 字段
- [ ] Permission 相关表已删除
- [ ] 用户登录后能获取正确的菜单
- [ ] @RequirePermissions 装饰器正常工作
- [ ] 数据范围过滤 (dataScope) 正常
- [ ] 前端角色管理可分配菜单权限
- [ ] 所有测试通过
