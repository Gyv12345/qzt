import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 真实的小公司案例（替换大公司）
const SMALL_COMPANY_CUSTOMERS = [
  {
    name: "洛阳启迪教育培训学校",
    shortName: "启迪教育",
    industry: "教育培训",
    customerLevel: "VIP",
    sourceChannel: "老客户推荐",
    address: "洛阳市西工区",
    remark: "专注K12课外辅导，学员300+",
  },
  {
    name: "郑州美家装饰工程有限公司",
    shortName: "美家装饰",
    industry: "建筑装饰",
    customerLevel: "CUSTOMER",
    sourceChannel: "电话咨询",
    address: "郑州市金水区",
    remark: "家装公司，团队15人",
  },
  {
    name: "杭州云帆电商代运营公司",
    shortName: "云帆电商",
    industry: "电商服务",
    customerLevel: "CUSTOMER",
    sourceChannel: "网站咨询",
    address: "杭州市余杭区",
    remark: "淘宝天猫代运营，服务50+店铺",
  },
  {
    name: "深圳康健医疗器械有限公司",
    shortName: "康健医疗",
    industry: "医疗器械",
    customerLevel: "VIP",
    sourceChannel: "展会",
    address: "深圳市南山区",
    remark: "家用医疗器械代理销售",
  },
  {
    name: "成都味道源餐饮管理有限公司",
    shortName: "味道源",
    industry: "餐饮服务",
    customerLevel: "PROSPECT",
    sourceChannel: "合作伙伴",
    address: "成都市武侯区",
    remark: "连锁快餐，5家门店",
  },
];

async function main() {
  console.log("🔄 清空现有客户数据...");
  await prisma.customer.deleteMany({});
  
  console.log("🌱 填充小公司案例数据...");
  
  // 获取 admin 用户作为创建者
  const admin = await prisma.user.findUnique({
    where: { username: "admin" },
  });
  
  if (!admin) {
    throw new Error("找不到 admin 用户");
  }
  
  for (const customerData of SMALL_COMPANY_CUSTOMERS) {
    const customer = await prisma.customer.create({
      data: {
        ...customerData,
        followUserId: admin.id,
      },
    });
    console.log(`  ✓ 创建客户: ${customer.name} (${customer.shortName})`);
  }
  
  console.log("\n✅ 小公司案例数据填充完成！");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
