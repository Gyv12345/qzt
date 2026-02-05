import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractDto } from './dto/query-contract.dto';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  async create(createContractDto: CreateContractDto) {
    // 生成合同编号
    const contractCount = await this.prisma.contract.count();
    const contractNo = `CON${new Date().getFullYear()}${String(contractCount + 1).padStart(6, '0')}`;

    return this.prisma.contract.create({
      data: {
        ...createContractDto,
        contractNo,
        serviceStart: new Date(createContractDto.serviceStart),
        serviceEnd: new Date(createContractDto.serviceEnd),
        paidAmount: 0,
        status: 'UNPAID', // 待收款
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, name: true, price: true },
        },
      },
    });
  }

  async findAll(query: QueryContractDto) {
    const { page = 1, pageSize = 10, keyword, customerId, productId, status } = query;
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
      where.productId = productId;
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
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true },
          },
          product: {
            select: { id: true, name: true, price: true },
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
        product: {
          select: { id: true, name: true, price: true, description: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
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

    return this.prisma.contract.update({
      where: { id },
      data,
      include: {
        customer: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, name: true, price: true },
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

    return { message: 'Contract deleted successfully' };
  }

  async updatePaymentStatus(contractId: string) {
    // 计算已收款金额
    const payments = await this.prisma.payment.findMany({
      where: {
        contractId,
        status: 'CONFIRMED', // 已确认
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

    // 更新合同状态
    let status: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID'; // 待收款
    if (paidAmount > 0 && paidAmount < contract.amount) {
      status = 'PARTIAL'; // 部分收款
    } else if (paidAmount >= contract.amount) {
      status = 'PAID'; // 已收全
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
