import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 客户规则种子数据
 */
const CUSTOMER_RULES_DATA = [
  {
    code: "follow_up_days",
    title: "跟进天数",
    description: "客户跟进间隔天数提醒",
    daysValue: 7,
    enabled: true,
  },
  {
    code: "message_reminder",
    title: "消息提醒天数",
    description: "未收到消息自动提醒天数",
    daysValue: 3,
    enabled: true,
  },
  {
    code: "inactive_restart",
    title: "失效客户重启天数",
    description: "客户长时间未联系后的重新启动天数",
    daysValue: 30,
    enabled: true,
  },
  {
    code: "FOLLOW_DAYS",
    title: "跟进提醒天数",
    description: "超过 X 天未跟进的客户发送提醒",
    daysValue: 7,
    enabled: true,
  },
  {
    code: "INACTIVE_DAYS",
    title: "流失预警天数",
    description: "客户无互动达到 X 天标记为流失风险",
    daysValue: 14,
    enabled: true,
  },
  {
    code: "CONTRACT_EXPIRY_DAYS",
    title: "合同到期提醒天数",
    description: "合同到期前 X 天发送提醒",
    daysValue: 30,
    enabled: true,
  },
  {
    code: "PAYMENT_OVERDUE_DAYS",
    title: "付款逾期天数",
    description: "应收款超过 X 天未收发送提醒",
    daysValue: 7,
    enabled: true,
  },
];

/**
 * 客户规则种子数据
 *
 * 运行方式：
 * 1. cd backend
 * 2. npx ts-node prisma/seed.customer-rules.ts
 */
async function main() {
  console.log("🌱 开始填充客户规则数据...\n");

  let created = 0;
  let skipped = 0;

  for (const rule of CUSTOMER_RULES_DATA) {
    const existing = await prisma.customerRule.findUnique({
      where: { code: rule.code },
    });

    if (existing) {
      // 更新现有规则（保留 enabled 状态）
      await prisma.customerRule.update({
        where: { id: existing.id },
        data: {
          title: rule.title,
          description: rule.description,
          daysValue: rule.daysValue,
          // 不更新 enabled，保留手动修改
        },
      });
      skipped++;
      console.log(`  ⊙ 更新规则: ${rule.code} (${rule.title})`);
    } else {
      await prisma.customerRule.create({
        data: rule,
      });
      created++;
      console.log(`  ✓ 创建规则: ${rule.code} (${rule.title})`);
    }
  }

  console.log("\n✅ 客户规则数据填充完成！");
  console.log(`\n📊 数据统计：创建 ${created} 个, 更新 ${skipped} 个`);

  // 最终统计
  const count = await prisma.customerRule.count();
  console.log(`\n📈 当前数据库：规则总数 ${count} 个`);
}

main()
  .catch((e) => {
    console.error("❌ 填充数据失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
