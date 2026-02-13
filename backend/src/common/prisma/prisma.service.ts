import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ["query", "info", "warn", "error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
    // 启用SQLite外键约束
    await this.$executeRawUnsafe("PRAGMA foreign_keys = ON");
    console.log("✅ Database connected successfully");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log("👋 Database disconnected");
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot clean database in production!");
    }

    // 按照外键依赖顺序删除数据
    await this.serviceTeam.deleteMany();
    await this.invoice.deleteMany();
    await this.payment.deleteMany();
    await this.contract.deleteMany();

    await this.followRecord.deleteMany();
    await this.customer.deleteMany();

    await this.product.deleteMany();

    await this.roleMenu.deleteMany();
    await this.userRole.deleteMany();
    await this.menu.deleteMany();
    await this.role.deleteMany();
    await this.user.deleteMany();
  }
}
