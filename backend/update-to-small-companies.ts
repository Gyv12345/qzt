import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 真实的小公司案例（更新现有客户）
const SMALL_COMPANY_CUSTOMERS = [
  {
    oldName: "阿里巴巴集团",
    newData: {
      name: "洛阳启迪教育培训学校",
      shortName: "启迪教育",
      industry: "教育培训",
      customerLevel: "VIP",
      sourceChannel: "老客户推荐",
      address: "洛阳市西工区",
      remark: "专注K12课外辅导，学员300+",
    },
  },
  {
    oldName: "腾讯科技有限公司",
    newData: {
      name: "郑州美家装饰工程有限公司",
      shortName: "美家装饰",
      industry: "建筑装饰",
      customerLevel: "CUSTOMER",
      sourceChannel: "电话咨询",
      address: "郑州市金水区",
      remark: "家装公司，团队15人",
    },
  },
  {
    oldName: "字节跳动科技有限公司",
    newData: {
      name: "杭州云帆电商代运营公司",
      shortName: "云帆电商",
      industry: "电商服务",
      customerLevel: "CUSTOMER",
      sourceChannel: "网站咨询",
      address: "杭州市余杭区",
      remark: "淘宝天猫代运营，服务50+店铺",
    },
  },
  {
    oldName: "美团科技有限公司",
    newData: {
      name: "深圳康健医疗器械有限公司",
      shortName: "康健医疗",
      industry: "医疗器械",
      customerLevel: "VIP",
      sourceChannel: "展会",
      address: "深圳市南山区",
      remark: "家用医疗器械代理销售",
    },
  },
  {
    oldName: "京东集团",
    newData: {
      name: "成都味道源餐饮管理有限公司",
      shortName: "味道源",
      industry: "餐饮服务",
      customerLevel: "PROSPECT",
      sourceChannel: "合作伙伴",
      address: "成都市武侯区",
      remark: "连锁快餐，5家门店",
    },
  },
];

async function main() {
  console.log("🔄 将大公司案例更新为小公司案例...\n");

  for (const item of SMALL_COMPANY_CUSTOMERS) {
    // 先查找
    const existing = await prisma.customer.findFirst({
      where: { name: item.oldName },
    });
    
    if (!existing) {
      console.log(`  ⚠ 未找到: ${item.oldName}`);
      continue;
    }
    
    // 再更新
    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: item.newData,
    });
    console.log(`  ✓ ${item.oldName} → ${customer.name}`);
  }

  console.log("\n✅ 小公司案例更新完成！");
  console.log("\n新客户列表：");
  const customers = await prisma.customer.findMany({
    select: { name: true, shortName: true, industry: true, customerLevel: true },
  });
  console.log(JSON.stringify(customers, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
