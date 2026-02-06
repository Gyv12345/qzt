import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class PaymentAccountService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取收款账号列表
   */
  async findAll(type?: string) {
    const where: any = {};
    if (type) where.type = type;

    return this.prisma.paymentAccount.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * 获取默认收款账号
   */
  async findDefault() {
    return this.prisma.paymentAccount.findFirst({
      where: { isDefault: true },
    });
  }

  /**
   * 创建收款账号
   */
  async create(data: any) {
    // 如果设置为默认,取消其他默认账户
    if (data.isDefault) {
      await this.prisma.paymentAccount.updateMany({
        where: { type: data.type },
        data: { isDefault: false },
      });
    }

    return this.prisma.paymentAccount.create({
      data,
    });
  }

  /**
   * 更新收款账号
   */
  async update(id: string, data: any) {
    // 如果设置为默认,取消其他默认账户
    if (data.isDefault) {
      const account = await this.prisma.paymentAccount.findUnique({
        where: { id },
      });

      if (account) {
        await this.prisma.paymentAccount.updateMany({
          where: {
            type: account.type,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }
    }

    return this.prisma.paymentAccount.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除收款账号
   */
  async remove(id: string) {
    await this.prisma.paymentAccount.delete({
      where: { id },
    });

    return { message: "Payment account deleted successfully" };
  }

  /**
   * 设置默认账号
   */
  async setDefault(id: string, type: string) {
    // 取消该类型的其他默认账户
    await this.prisma.paymentAccount.updateMany({
      where: {
        type,
        id: { not: id },
      },
      data: { isDefault: false },
    });

    // 设置新的默认账户
    return this.prisma.paymentAccount.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
