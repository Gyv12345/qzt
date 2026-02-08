import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 创建默认客户规则
async function seedCustomerRules() {
  console.log('\n📋 创建默认客户规则...');

  const rules = [
    {
      code: 'FOLLOW_DAYS',
      title: '跟进天数规则',
      description: '超过设置天数未跟进的客户将被标记需要跟进',
      daysValue: 7,
      enabled: true,
    },
    {
      code: 'NO_CONTACT_DAYS',
      title: '未联系天数规则',
      description: '超过设置天数未联系的客户将被标记为流失风险',
      daysValue: 30,
      enabled: true,
    },
    {
      code: 'CONTRACT_EXPIRY_DAYS',
      title: '合同到期提醒',
      description: '合同到期前多少天开始提醒续约',
      daysValue: 30,
      enabled: true,
    },
    {
      code: 'PAYMENT_OVERDUE_DAYS',
      title: '付款逾期规则',
      description: '付款逾期多少天触发预警',
      daysValue: 7,
      enabled: true,
    },
  ];

  for (const rule of rules) {
    await prisma.customerRule.upsert({
      where: { code: rule.code },
      update: {},
      create: rule,
    });
  }

  console.log('  ✅ 默认客户规则创建完成');
}

// 创建系统配置
async function seedSystemConfig() {
  console.log('\n⚙️  创建系统配置...');

  const configs = [
    // 基础配置
    {
      key: 'site_name',
      value: '企智通',
      category: 'basic',
      description: '系统名称',
      isPublic: true,
    },
    {
      key: 'company_name',
      value: '河南爱编程网络科技有限公司',
      category: 'basic',
      description: '公司名称',
      isPublic: true,
    },
    {
      key: 'logo_url',
      value: '/images/qzt-logo.png',
      category: 'basic',
      description: '系统Logo路径',
      isPublic: true,
    },
    // 登录页配置
    {
      key: 'login_icp',
      value: '',
      category: 'login',
      description: 'ICP备案号',
      isPublic: true,
    },
    {
      key: 'login_police_icp',
      value: '',
      category: 'login',
      description: '公安备案号',
      isPublic: true,
    },
    {
      key: 'login_copyright',
      value: `© ${new Date().getFullYear()} 河南爱编程网络科技有限公司 版权所有`,
      category: 'login',
      description: '版权信息',
      isPublic: true,
    },
    {
      key: 'login_website_url',
      value: 'https://www.example.com',
      category: 'login',
      description: '官网网址',
      isPublic: true,
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {
        value: config.value,
        description: config.description,
        isPublic: config.isPublic,
        category: config.category,
      },
      create: config,
    });
  }

  console.log('  ✅ 系统配置创建完成');
}

async function main() {
  console.log('🌱 开始初始化数据库...\n');

  // 创建默认部门
  console.log('🏢 创建默认部门...');
  const defaultDepartment = await prisma.department.upsert({
    where: { id: 'default-dept' },
    update: {},
    create: {
      id: 'default-dept',
      name: '企智通有限公司',
      sort: 0,
      status: 'ACTIVE',
      isSystem: true, // 标记为系统部门，不可删除
    },
  });
  console.log('  ✅ 默认部门创建完成\n');

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
    where: { code: 'SUPERADMIN' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'SUPERADMIN',
      description: '系统超级管理员，拥有所有权限',
      status: 'ACTIVE',
    },
  });
  console.log('  ✅ 超级管理员角色创建完成');

  const userRole = await prisma.role.upsert({
    where: { code: 'USER' },
    update: {},
    create: {
      name: '普通用户',
      code: 'USER',
      description: '普通用户角色',
      status: 'ACTIVE',
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
      name: '超级管理员',
      email: 'admin@qzt.com',
      status: 'ACTIVE',
      isSystem: true, // 标记为系统用户，不可删除
      departmentId: defaultDepartment.id, // 关联到默认部门
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
  console.log('  角色: 超级管理员');
  console.log('  部门: 企智通有限公司');
  console.log('  ⚠️  注意: Admin 用户不可删除，角色固定为超级管理员');

  // 创建测试用户
  console.log('\n👤 创建测试用户...');
  const testPassword = await bcrypt.hash('test12345', 10);

  const testUser = await prisma.user.create({
    data: {
      username: 'testuser',
      password: testPassword,
      name: '测试用户',
      email: 'test@qzt.com',
      status: 'ACTIVE',
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

  // 创建默认客户规则
  await seedCustomerRules();

  // 创建系统配置
  await seedSystemConfig();

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
