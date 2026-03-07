import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany();
  console.log("客户数量:", customers.length);
  
  const contacts = await prisma.contact.findMany();
  console.log("联系人数量:", contacts.length);
  
  const contracts = await prisma.contract.findMany();
  console.log("合同数量:", contracts.length);
  
  const products = await prisma.product.findMany();
  console.log("产品数量:", products.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
