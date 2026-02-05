import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 更新 Admin 用户...\n');

  // 创建或更新默认部门
  const defaultDepartment = await prisma.department.upsert({
    where: { id: 'default-dept' },
    update: {},
    create: {
      id: 'default-dept',
      name: '企账通有限公司',
      sort: 0,
      status: 'ACTIVE',
      isSystem: true,
    },
  });
  console.log('✅ 默认部门已就绪');

  // 创建或更新超级管理员角色
  const adminRole = await prisma.role.upsert({
    where: { code: 'SUPERADMIN' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'SUPERADMIN',
      description: '系统超级管理员，拥有所有权限',
      status: 'ACTIVE',
    },
  });
  console.log('✅ 超级管理员角色已就绪');

  // 更新现有的 admin 用户
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
    include: {
      roles: true,
    },
  });

  if (existingAdmin) {
    // 删除旧的角色关联
    await prisma.userRole.deleteMany({
      where: { userId: existingAdmin.id },
    });

    // 更新用户
    const updatedAdmin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: '超级管理员',
        isSystem: true,
        departmentId: defaultDepartment.id,
        roles: {
          create: {
            roleId: adminRole.id,
          },
        },
      },
    });

    console.log('✅ Admin 用户已更新');
    console.log('\n📋 Admin 用户信息:');
    console.log(`  用户名: ${updatedAdmin.username}`);
    console.log(`  姓名: ${updatedAdmin.name}`);
    console.log(`  邮箱: ${updatedAdmin.email}`);
    console.log(`  系统用户: ${updatedAdmin.isSystem ? '是' : '否'}`);
    console.log(`  部门: ${defaultDepartment.name}`);
    console.log(`  角色: ${adminRole.name}`);
    console.log('\n⚠️  注意: Admin 用户不可删除，角色固定为超级管理员');
  } else {
    console.log('❌ Admin 用户不存在，请先运行 seed.ts');
  }

  console.log('\n✅ 更新完成!\n');
}

main()
  .catch((e) => {
    console.error('❌ 更新失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
