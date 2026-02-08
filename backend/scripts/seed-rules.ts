import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCustomerRules() {
  console.log('📋 创建默认客户规则...');

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
    const existing = await prisma.customerRule.findUnique({
      where: { code: rule.code },
    });
    
    if (!existing) {
      await prisma.customerRule.create({ data: rule });
      console.log(`  ✅ 创建规则: ${rule.title}`);
    } else {
      console.log(`  ⏭️  规则已存在: ${rule.title}`);
    }
  }

  console.log('  ✅ 默认客户规则创建完成\n');
}

seedCustomerRules()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
