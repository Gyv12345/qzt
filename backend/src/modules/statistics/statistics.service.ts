import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取首页仪表板统计数据
   */
  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 并发查询所有统计数据
    const [
      totalCustomers,
      totalContracts,
      totalProducts,
      totalInvoices,
      monthlyNewCustomers,
      monthlyNewContracts,
      monthlyContractAmount,
      monthlyInvoiceAmount,
      recentActivities,
    ] = await Promise.all([
      // 总客户数
      this.prisma.customer.count(),

      // 合同总数
      this.prisma.contract.count(),

      // 产品总数
      this.prisma.product.count(),

      // 开票记录总数
      this.prisma.invoice.count(),

      // 本月新增客户
      this.prisma.customer.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),

      // 本月新增合同
      this.prisma.contract.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),

      // 本月合同金额
      this.prisma.contract.aggregate({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // 本月开票金额
      this.prisma.invoice.aggregate({
        where: {
          month: now.toISOString().slice(0, 7), // YYYY-MM
        },
        _sum: {
          amount: true,
        },
      }),

      // 最近活动(最近10条)
      this.getRecentActivities(10),
    ]);

    return {
      overview: {
        totalCustomers,
        totalContracts,
        totalProducts,
        totalInvoices,
      },
      monthly: {
        newCustomers: monthlyNewCustomers,
        newContracts: monthlyNewContracts,
        contractAmount: monthlyContractAmount._sum.amount || 0,
        invoiceAmount: monthlyInvoiceAmount._sum.amount || 0,
      },
      recentActivities,
    };
  }

  /**
   * 获取业绩统计
   */
  async getPerformanceStats(year?: number) {
    const targetYear = year || new Date().getFullYear();

    // 按月统计合同金额
    const monthlyContracts = await this.prisma.$queryRaw`
      SELECT
        STRFTIME('%m', createdAt) as month,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM Contract
      WHERE STRFTIME('%Y', createdAt) = ${String(targetYear)}
      GROUP BY STRFTIME('%m', createdAt)
      ORDER BY month
    ` as Array<{ month: string; count: bigint; amount: bigint }>;

    // 按月统计收款金额
    const monthlyPayments = await this.prisma.$queryRaw`
      SELECT
        STRFTIME('%m', paymentDate) as month,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM Payment
      WHERE STRFTIME('%Y', paymentDate) = ${String(targetYear)}
      GROUP BY STRFTIME('%m', paymentDate)
      ORDER BY month
    ` as Array<{ month: string; count: bigint; amount: bigint }>;

    return {
      contracts: monthlyContracts.map((item) => ({
        month: parseInt(item.month),
        count: Number(item.count),
        amount: Number(item.amount),
      })),
      payments: monthlyPayments.map((item) => ({
        month: parseInt(item.month),
        count: Number(item.count),
        amount: Number(item.amount),
      })),
    };
  }

  /**
   * 获取客户分析数据
   */
  async getCustomerAnalysis() {
    // 按行业统计客户
    const customersByIndustry = await this.prisma.customer.groupBy({
      by: ['industry'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc' as const,
        },
      },
    } as any);

    // 按状态统计客户
    const customersByStatus = await this.prisma.customer.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // 客户跟进统计
    const followUpStats = await this.prisma.followRecord.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    });

    return {
      byIndustry: customersByIndustry.map((item) => ({
        industry: item.industry || '未分类',
        count: item._count.id,
      })),
      byStatus: customersByStatus.map((item) => ({
        status: item.status,
        count: item._count.id,
      })),
      followUpTypes: followUpStats.map((item) => ({
        type: item.type,
        count: item._count.id,
      })),
    };
  }

  /**
   * 获取收款统计
   */
  async getPaymentStats(month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // 当月收款统计
    const monthlyStats = await this.prisma.payment.aggregate({
      where: {
        payTime: {
          gte: new Date(targetMonth + '-01'),
          lt: new Date(targetMonth + '-31'),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // 按收款方式统计
    const byMethod = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        paymentDate: {
          gte: new Date(targetMonth + '-01'),
          lt: new Date(targetMonth + '-31'),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // 待收款金额
    const pendingPayments = await this.prisma.contract.aggregate({
      where: {
        status: {
          in: [1, 2], // 待收款、部分收款
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      monthly: {
        totalAmount: monthlyStats._sum.amount || 0,
        totalCount: monthlyStats._count.id,
      },
      byMethod: byMethod.map((item) => ({
        method: item.method,
        amount: item._sum.amount || 0,
        count: item._count.id,
      })),
      pending: {
        amount: pendingPayments._sum.amount || 0,
        count: pendingPayments._count.id,
      },
    };
  }

  /**
   * 获取开票统计
   */
  async getInvoiceStats(month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // 当月开票统计
    const monthlyStats = await this.prisma.invoice.aggregate({
      where: {
        month: targetMonth,
      },
      _sum: {
        amount: true,
        count: true,
      },
      _count: {
        id: true,
      },
    });

    // 超额统计
    const overLimitInvoices = await this.prisma.invoice.findMany({
      where: {
        month: targetMonth,
        OR: [
          {
            overLimitCount: {
              gt: 0,
            },
          },
          {
            overLimitAmount: {
              gt: 0,
            },
          },
        ],
      },
    });

    const totalOverLimitCount = overLimitInvoices.reduce(
      (sum, inv) => sum + (inv.overLimitCount || 0),
      0,
    );
    const totalOverLimitAmount = overLimitInvoices.reduce(
      (sum, inv) => sum + (inv.overLimitAmount || 0),
      0,
    );

    // 按客户统计
    const topCustomers = await this.prisma.invoice.groupBy({
      by: ['customerId'],
      where: {
        month: targetMonth,
      },
      _sum: {
        amount: true,
        count: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 10,
    });

    return {
      monthly: {
        totalAmount: monthlyStats._sum.amount || 0,
        totalCount: monthlyStats._count.id,
        totalInvoices: monthlyStats._sum.count || 0,
      },
      overLimit: {
        count: totalOverLimitCount,
        amount: totalOverLimitAmount,
        invoiceCount: overLimitInvoices.length,
      },
      topCustomers: await Promise.all(
        topCustomers.map(async (item) => {
          const customer = await this.prisma.customer.findUnique({
            where: { id: item.customerId },
            select: { name: true },
          });
          return {
            customerId: item.customerId,
            customerName: customer?.name || '未知',
            amount: item._sum.amount || 0,
            count: item._sum.count || 0,
          };
        }),
      ),
    };
  }

  /**
   * 获取最近活动记录
   */
  private async getRecentActivities(limit: number = 10) {
    // 获取最近的客户创建记录
    const recentCustomers = await this.prisma.customer.findMany({
      take: Math.ceil(limit / 3),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    // 获取最近的合同创建记录
    const recentContracts = await this.prisma.contract.findMany({
      take: Math.ceil(limit / 3),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        amount: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    // 获取最近的开票记录
    const recentInvoices = await this.prisma.invoice.findMany({
      take: Math.ceil(limit / 3),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        count: true,
        month: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    // 合并并按时间排序
    const activities = [
      ...recentCustomers.map((c) => ({
        type: 'customer',
        id: c.id,
        title: `新增客户: ${c.name}`,
        time: c.createdAt,
      })),
      ...recentContracts.map((c) => ({
        type: 'contract',
        id: c.id,
        title: `创建合同: ${c.code} - ${c.customer.name}`,
        subtitle: `¥${c.amount.toLocaleString()}`,
        time: c.createdAt,
      })),
      ...recentInvoices.map((i) => ({
        type: 'invoice',
        id: i.id,
        title: `开票记录: ${i.customer.name}`,
        subtitle: `${i.month} ¥${i.amount.toLocaleString()} (${i.count}张)`,
        time: i.createdAt,
      })),
    ]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, limit);

    return activities;
  }
}
