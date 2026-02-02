import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing database connection...\n');

  // 测试连接
  await prisma.$connect();
  console.log('✅ Database connected successfully!\n');

  // 查询所有表
  const tables = await prisma.$queryRaw`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
  ` as Array<{ name: string }>;

  console.log('📊 Tables created:');
  tables.forEach((table, index) => {
    console.log(`  ${index + 1}. ${table.name}`);
  });
  console.log(`\n  Total: ${tables.length} tables\n`);

  // 测试创建一个用户
  console.log('🧪 Testing user creation...');
  const testUser = await prisma.user.create({
    data: {
      username: 'test_admin',
      password: 'hashed_password_here',
      name: 'Test Admin',
      email: 'test@qzt.com',
      tenantId: 'default',
      status: 1,
    },
  });
  console.log('✅ User created:', testUser.username);

  // 查询用户
  const users = await prisma.user.findMany();
  console.log(`📝 Total users in database: ${users.length}\n`);

  // 清理测试数据
  await prisma.user.delete({
    where: { id: testUser.id },
  });
  console.log('🧹 Test data cleaned up\n');

  console.log('✅ All tests passed!');
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
