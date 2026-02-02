import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化数据库...\n');

  // 检查是否已存在 admin 用户
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin 用户已存在，跳过创建\n');
    console.log('📝 当前用户列表:');
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
    users.forEach((user, index) => {
      const roleNames = user.roles.map(r => r.role.name).join(', ');
      console.log(`  ${index + 1}. ${user.username} (${user.name}) - [${roleNames || '无角色'}]`);
    });
    return;
  }

  // 创建管理员角色
  console.log('🔑 创建角色...');
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      name: '管理员',
      code: 'ADMIN',
      description: '系统管理员，拥有所有权限',
      status: 1,
    },
  });
  console.log('  ✅ 管理员角色创建完成');

  const userRole = await prisma.role.upsert({
    where: { code: 'USER' },
    update: {},
    create: {
      name: '普通用户',
      code: 'USER',
      description: '普通用户角色',
      status: 1,
    },
  });
  console.log('  ✅ 普通用户角色创建完成\n');

  // 创建 admin 用户
  console.log('👤 创建 Admin 用户...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      email: 'admin@qzt.com',
      status: 1,
      roles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
  });

  console.log('✅ Admin 用户创建成功!');
  console.log('\n📋 登录信息:');
  console.log('  用户名: admin');
  console.log('  密码: admin123');
  console.log('  角色: 管理员');

  // 创建测试用户
  console.log('\n👤 创建测试用户...');
  const testPassword = await bcrypt.hash('test12345', 10);

  const testUser = await prisma.user.create({
    data: {
      username: 'testuser',
      password: testPassword,
      name: '测试用户',
      email: 'test@qzt.com',
      status: 1,
      roles: {
        create: {
          roleId: userRole.id,
        },
      },
    },
  });

  console.log('✅ 测试用户创建成功!');
  console.log('\n📋 测试用户登录信息:');
  console.log('  用户名: testuser');
  console.log('  密码: test12345');
  console.log('  角色: 普通用户');

  console.log('\n✅ 数据库初始化完成!\n');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
