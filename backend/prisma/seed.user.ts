import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { RoleCodes, DEFAULT_ROLES } from "./constants/role-codes";

const prisma = new PrismaClient();

/**
 * 用户种子数据配置
 */
const USER_DATA = {
  username: "admin",
  password: "admin123", // 默认密码，首次登录后应修改
  name: "系统管理员",
  email: "admin@example.com",
  phone: "13800138000",
  status: "ACTIVE",
  isSystem: true,
  hasCompletedFirstLogin: true, // 测试用户默认已完成首次登录流程
};

/**
 * 部门种子数据（顶级部门）
 */
const DEPARTMENT_DATA = {
  name: "总公司",
  sort: 0,
  status: "ACTIVE",
  isSystem: true,
};

// 超级管理员角色数据（从常量导入）
const SUPER_ADMIN_ROLE = DEFAULT_ROLES[0];

/**
 * 用户种子数据
 *
 * 运行方式：
 * 1. cd backend
 * 2. npx ts-node prisma/seed.user.ts
 */
async function main() {
  console.log("🌱 开始填充用户数据...");

  // ==================== 创建超级管理员角色 ====================
  console.log("\n👤 创建超级管理员角色...");

  const role = await prisma.role.upsert({
    where: { code: SUPER_ADMIN_ROLE.code },
    update: SUPER_ADMIN_ROLE,
    create: SUPER_ADMIN_ROLE,
  });
  console.log(`  ✓ 角色: ${role.name} (${role.code})`);

  // ==================== 创建顶级部门 ====================
  console.log("\n🏢 创建顶级部门...");

  let department = await prisma.department.findFirst({
    where: {
      name: DEPARTMENT_DATA.name,
      parentId: null,
    },
  });

  if (department) {
    department = await prisma.department.update({
      where: { id: department.id },
      data: {
        sort: DEPARTMENT_DATA.sort,
        status: DEPARTMENT_DATA.status,
        isSystem: DEPARTMENT_DATA.isSystem,
      },
    });
    console.log(`  ⊙ 更新部门: ${department.name}`);
  } else {
    department = await prisma.department.create({
      data: DEPARTMENT_DATA,
    });
    console.log(`  ✓ 创建部门: ${department.name}`);
  }

  // ==================== 创建管理员用户 ====================
  console.log("\n🔐 创建管理员用户...");

  const hashedPassword = await bcrypt.hash(USER_DATA.password, 10);

  const user = await prisma.user.upsert({
    where: { username: USER_DATA.username },
    update: {
      name: USER_DATA.name,
      email: USER_DATA.email,
      phone: USER_DATA.phone,
      status: USER_DATA.status,
      isSystem: USER_DATA.isSystem,
      departmentId: department.id,
      hasCompletedFirstLogin: USER_DATA.hasCompletedFirstLogin,
      // 不更新密码，保留已有的
    },
    create: {
      username: USER_DATA.username,
      password: hashedPassword,
      name: USER_DATA.name,
      email: USER_DATA.email,
      phone: USER_DATA.phone,
      status: USER_DATA.status,
      isSystem: USER_DATA.isSystem,
      departmentId: department.id,
      hasCompletedFirstLogin: USER_DATA.hasCompletedFirstLogin,
    },
  });
  console.log(`  ✓ 用户: ${user.name} (${user.username})`);

  // ==================== 关联用户与角色 ====================
  console.log("\n🔗 关联用户与角色...");

  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      roleId: role.id,
    },
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });
    console.log(`  ✓ 关联: ${user.name} -> ${role.name}`);
  } else {
    console.log(`  ⊙ 已存在关联: ${user.name} -> ${role.name}`);
  }

  // ==================== 为超级管理员分配所有菜单权限 ====================
  console.log("\n🔓 分配菜单权限...");

  const allMenus = await prisma.menu.findMany({
    select: { id: true },
  });

  let assignedCount = 0;
  for (const menu of allMenus) {
    const existing = await prisma.roleMenu.findFirst({
      where: {
        roleId: role.id,
        menuId: menu.id,
      },
    });

    if (!existing) {
      await prisma.roleMenu.create({
        data: {
          roleId: role.id,
          menuId: menu.id,
        },
      });
      assignedCount++;
    }
  }
  console.log(`  ✓ 分配权限: ${assignedCount} 个新权限 (总计: ${allMenus.length} 个)`);

  console.log("\n✅ 用户数据填充完成！");
  console.log("\n📝 登录信息：");
  console.log(`  用户名: ${USER_DATA.username}`);
  console.log(`  密码: ${USER_DATA.password}`);
  console.log("\n⚠️  请在生产环境中修改默认密码！");
}

main()
  .catch((e) => {
    console.error("❌ 填充数据失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
