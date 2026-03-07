import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    select: { name: true, shortName: true, industry: true, customerLevel: true }
  });
  console.log("客户数据:", JSON.stringify(customers, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
