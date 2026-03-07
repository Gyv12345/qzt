import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.update({
    where: { username: "admin" },
    data: { password: hashedPassword },
  });
  console.log("密码已重置:", user.username);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
