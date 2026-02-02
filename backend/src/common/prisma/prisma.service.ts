import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('👋 Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production!');
    }

    // 按照外键依赖顺序删除数据
    await this.logDetail.deleteMany();
    await this.log.deleteMany();
    await this.workflow.deleteMany();
    await this.condition.deleteMany();
    await this.trigger.deleteMany();

    await this.serviceTeam.deleteMany();
    await this.invoice.deleteMany();
    await this.payment.deleteMany();
    await this.contract.deleteMany();

    await this.followRecord.deleteMany();
    await this.customer.deleteMany();

    await this.productFlow.deleteMany();
    await this.product.deleteMany();

    await this.rolePermission.deleteMany();
    await this.userRole.deleteMany();
    await this.permission.deleteMany();
    await this.role.deleteMany();
    await this.user.deleteMany();
  }
}
