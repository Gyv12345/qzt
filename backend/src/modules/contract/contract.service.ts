import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateContractDto, ContractItemDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import { QueryContractDto } from "./dto/query-contract.dto";

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  /**
   * 计算合同产品明细的小计和总金额
   */
  private calculateAmounts(items: ContractItemDto[]) {
    let originalAmount = 0; // 原价总额
    let totalAmount = 0; // 实际总额

    const itemsWithSubtotal = items.map((item) => {
      const subtotal = item.actualPrice * item.quantity;
      originalAmount += item.originalPrice * item.quantity;
      totalAmount += subtotal;
      return {
        ...item,
        subtotal,
      };
    });

    return { itemsWithSubtotal, originalAmount, totalAmount };
  }

  async create(createContractDto: CreateContractDto) {
    const { items, ...contractData } = createContractDto;

    // 计算金额
    const { itemsWithSubtotal, originalAmount, totalAmount } =
      this.calculateAmounts(items);

    // 生成合同编号
    const contractCount = await this.prisma.contract.count();
    const contractNo = `CON${new Date().getFullYear()}${String(
      contractCount + 1,
    ).padStart(6, "0")}`;

    // 使用事务创建合同和产品明细
    const contract = await this.prisma.$transaction(async (tx) => {
      // 创建合同
      const newContract = await tx.contract.create({
        data: {
          ...contractData,
          contractNo,
          originalAmount,
          totalAmount,
          serviceStart: new Date(createContractDto.serviceStart),
          serviceEnd: new Date(createContractDto.serviceEnd),
          paidAmount: 0,
          status: "UNPAID", // 待收款
        },
      });

      // 创建产品明细
      await tx.contractItem.createMany({
        data: itemsWithSubtotal.map((item) => ({
          contractId: newContract.id,
          productId: item.productId,
          quantity: item.quantity,
          originalPrice: item.originalPrice,
          actualPrice: item.actualPrice,
          subtotal: item.subtotal,
        })),
      });

      return newContract;
    });

    // 返回包含关联数据的合同
    return this.findOne(contract.id);
  }

  async findAll(query: QueryContractDto) {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      customerId,
      productId,
      status,
    } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (keyword) {
      where.OR = [
        { contractNo: { contains: keyword } },
        { customer: { name: { contains: keyword } } },
      ];
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (productId) {
      // 通过产品明细筛选
      where.items = {
        some: {
          productId,
        },
      };
    }

    if (status !== undefined) {
      where.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.contract.count({ where }),
      this.prisma.contract.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, name: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      data,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, description: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract #${id} not found`);
    }

    return contract;
  }

  async update(id: string, updateContractDto: UpdateContractDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!contract) {
      throw new NotFoundException(`Contract #${id} not found`);
    }

    const data: any = { ...updateContractDto };

    if (updateContractDto.serviceStart) {
      data.serviceStart = new Date(updateContractDto.serviceStart);
    }

    if (updateContractDto.serviceEnd) {
      data.serviceEnd = new Date(updateContractDto.serviceEnd);
    }

    // 如果更新了产品列表，需要重新计算金额
    if (updateContractDto.items) {
      const { itemsWithSubtotal, originalAmount, totalAmount } =
        this.calculateAmounts(updateContractDto.items);

      data.originalAmount = originalAmount;
      data.totalAmount = totalAmount;
      delete data.items; // 不在 contract update 中使用，需要单独处理

      // 使用事务更新合同和产品明细
      const updatedContract = await this.prisma.$transaction(async (tx) => {
        // 删除旧的产品明细
        await tx.contractItem.deleteMany({
          where: { contractId: id },
        });

        // 创建新的产品明细
        await tx.contractItem.createMany({
          data: itemsWithSubtotal.map((item) => ({
            contractId: id,
            productId: item.productId,
            quantity: item.quantity,
            originalPrice: item.originalPrice,
            actualPrice: item.actualPrice,
            subtotal: item.subtotal,
          })),
        });

        // 更新合同基本信息（不包含 items）
        const { items: _, ...contractUpdateData } = updateContractDto;
        const updateData: any = { ...contractUpdateData };
        if (updateContractDto.serviceStart) {
          updateData.serviceStart = new Date(updateContractDto.serviceStart);
        }
        if (updateContractDto.serviceEnd) {
          updateData.serviceEnd = new Date(updateContractDto.serviceEnd);
        }
        updateData.originalAmount = originalAmount;
        updateData.totalAmount = totalAmount;

        return tx.contract.update({
          where: { id },
          data: updateData,
        });
      });

      return this.findOne(updatedContract.id);
    }

    return this.prisma.contract.update({
      where: { id },
      data,
      include: {
        customer: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException(`Contract #${id} not found`);
    }

    await this.prisma.contract.delete({
      where: { id },
    });

    return { message: "Contract deleted successfully" };
  }

  async updatePaymentStatus(contractId: string) {
    // 计算已收款金额
    const payments = await this.prisma.payment.findMany({
      where: {
        contractId,
        status: "CONFIRMED", // 已确认
      },
    });

    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    // 获取合同信息
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract #${contractId} not found`);
    }

    // 更新合同状态（基于 totalAmount 而不是 amount）
    let status: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID"; // 待收款
    if (paidAmount > 0 && paidAmount < contract.totalAmount) {
      status = "PARTIAL"; // 部分收款
    } else if (paidAmount >= contract.totalAmount) {
      status = "PAID"; // 已收全
    }

    return this.prisma.contract.update({
      where: { id: contractId },
      data: {
        paidAmount,
        status,
      },
    });
  }
}
