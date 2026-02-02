import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async create(createInvoiceDto: CreateInvoiceDto) {
    // 验证客户存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: createInvoiceDto.customerId },
      include: {
        contracts: {
          where: { status: { in: [1, 2] } }, // 部分收款或已收全
          include: { product: true },
        },
      },
    });

    if (!customer) {
      throw new Error(`Customer #${createInvoiceDto.customerId} not found`);
    }

    // 计算该客户本月已开票金额和张数
    const monthStart = new Date(createInvoiceDto.month + '-01');
    const monthEnd = new Date(createInvoiceDto.month + '-31');

    const existingInvoices = await this.prisma.invoice.findMany({
      where: {
        customerId: createInvoiceDto.customerId,
        month: createInvoiceDto.month,
      },
    });

    const totalAmount = existingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCount = existingInvoices.reduce((sum, inv) => sum + inv.count, 0);

    // 计算客户产品的开票额度和包含张数
    let invoiceLimit = 0;
    let invoiceCount = 0;
    let overLimitPrice = 0;

    for (const contract of customer.contracts) {
      invoiceLimit += contract.product.invoiceLimit;
      invoiceCount += contract.product.invoiceCount;
      overLimitPrice = contract.product.overLimitPrice;
    }

    // 计算超额情况
    const newTotalAmount = totalAmount + createInvoiceDto.amount;
    const newTotalCount = totalCount + createInvoiceDto.count;

    let isOverLimit = false;
    let overAmount = 0;
    let overCount = 0;

    if (newTotalAmount > invoiceLimit) {
      isOverLimit = true;
      overAmount = newTotalAmount - invoiceLimit;
    }

    if (newTotalCount > invoiceCount) {
      isOverLimit = true;
      overCount = newTotalCount - invoiceCount;
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        customerId: createInvoiceDto.customerId,
        contractId: createInvoiceDto.contractId,
        amount: createInvoiceDto.amount,
        count: createInvoiceDto.count,
        month: createInvoiceDto.month,
        isOverLimit,
        overAmount: isOverLimit && overAmount > 0 ? overAmount : null,
        overCount: isOverLimit && overCount > 0 ? overCount : 0,
        remark: createInvoiceDto.remark,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    return invoice;
  }

  async findAll(query: QueryInvoiceDto) {
    const { page = 1, pageSize = 10, customerId, month } = query;
    const skip = (page - 1) * pageSize;

    let where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (month) {
      where.month = month;
    }

    const [total, data] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
        include: {
          customer: {
            select: { id: true, name: true },
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
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, contactPhone: true },
        },
      },
    });

    if (!invoice) {
      throw new Error(`Invoice #${id} not found`);
    }

    return invoice;
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new Error(`Invoice #${id} not found`);
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateInvoiceDto,
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async remove(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new Error(`Invoice #${id} not found`);
    }

    await this.prisma.invoice.delete({
      where: { id },
    });

    return { message: 'Invoice deleted successfully' };
  }

  async getCustomerInvoiceSummary(customerId: string, month?: string) {
    const where: any = { customerId };

    if (month) {
      where.month = month;
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    });

    // 按月份分组统计
    const summary = invoices.reduce((acc: any, invoice) => {
      if (!acc[invoice.month]) {
        acc[invoice.month] = {
          month: invoice.month,
          totalAmount: 0,
          totalCount: 0,
          overLimitCount: 0,
          invoices: [],
        };
      }

      acc[invoice.month].totalAmount += invoice.amount;
      acc[invoice.month].totalCount += invoice.count;
      if (invoice.isOverLimit) {
        acc[invoice.month].overLimitCount += 1;
      }
      acc[invoice.month].invoices.push(invoice);

      return acc;
    }, {});

    return Object.values(summary);
  }
}
