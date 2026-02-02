import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { ContractService } from '../contract/contract.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private contractService: ContractService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto) {
    // 验证合同存在
    const contract = await this.prisma.contract.findUnique({
      where: { id: createPaymentDto.contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract #${createPaymentDto.contractId} not found`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        contractId: createPaymentDto.contractId,
        amount: createPaymentDto.amount,
        method: createPaymentDto.method.toString(),
        voucherUrl: createPaymentDto.voucherUrl,
        payTime: createPaymentDto.payTime ? new Date(createPaymentDto.payTime) : null,
        status: 0, // 0:待确认
        remark: createPaymentDto.remark,
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            amount: true,
          },
        },
      },
    });

    return payment;
  }

  async findAll(query: QueryPaymentDto) {
    const { page = 1, pageSize = 10, contractId, status } = query;
    const skip = (page - 1) * pageSize;

    let where: any = {};

    if (contractId) {
      where.contractId = contractId;
    }

    if (status !== undefined) {
      where.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          contract: {
            select: {
              id: true,
              contractNo: true,
              amount: true,
              customer: {
                select: { id: true, name: true },
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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            customer: {
              select: { id: true, name: true, contactPhone: true },
            },
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }

    const data: any = { ...updatePaymentDto };

    if (updatePaymentDto.payTime) {
      data.payTime = new Date(updatePaymentDto.payTime);
    }

    return this.prisma.payment.update({
      where: { id },
      data,
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            amount: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }

    await this.prisma.payment.delete({
      where: { id },
    });

    return { message: 'Payment deleted successfully' };
  }

  async confirmPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }

    // 更新收款状态为已确认
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: 1, // 1:已确认
        payTime: payment.payTime || new Date(),
      },
    });

    // 更新合同的收款状态
    await this.contractService.updatePaymentStatus(payment.contractId);

    return updatedPayment;
  }

  async getContractPayments(contractId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });

    // 计算总收款金额
    const totalPaid = payments
      .filter((p) => p.status === 1)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      payments,
      totalPaid,
      count: payments.length,
      confirmedCount: payments.filter((p) => p.status === 1).length,
    };
  }
}
