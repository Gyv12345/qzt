import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

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
      unreadNotifications,
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

      // 未读通知数
      this.prisma.notification.count({
        where: {
          isRead: false,
        },
      }),
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
      unreadNotifications,
    };
  }

  /**
   * 获取客户增长趋势
   */
  async getCustomerGrowthTrend(months = 12) {
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      const [newCustomers, totalCustomers] = await Promise.all([
        // 当月新增客户
        this.prisma.customer.count({
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
        // 月末总客户数
        this.prisma.customer.count({
          where: {
            createdAt: {
              lte: endOfMonth,
            },
          },
        }),
      ]);

      trends.push({
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        newCustomers,
        totalCustomers,
      });
    }

    return trends;
  }

  /**
   * 获取合同续约率统计
   */
  async getContractRenewalStats(months = 12) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    // 查询期间到期的合同
    const expiringContracts = await this.prisma.contract.findMany({
      where: {
        serviceEnd: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        id: true,
        serviceEnd: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 统计续约情况
    let renewedCount = 0;
    let notRenewedCount = 0;

    for (const contract of expiringContracts) {
      // 检查是否有新合同(续约)
      const renewedContract = await this.prisma.contract.findFirst({
        where: {
          customerId: contract.customer.id,
          serviceStart: {
            gt: contract.serviceEnd,
          },
        },
      });

      if (renewedContract) {
        renewedCount++;
      } else {
        notRenewedCount++;
      }
    }

    const total = renewedCount + notRenewedCount;
    const renewalRate = total > 0 ? (renewedCount / total) * 100 : 0;

    return {
      total: expiringContracts.length,
      renewed: renewedCount,
      notRenewed: notRenewedCount,
      renewalRate: parseFloat(renewalRate.toFixed(2)),
    };
  }

  /**
   * 获取开票金额分析
   */
  async getInvoiceAnalysis(months = 12) {
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      // 查询当月开票数据
      const invoices = await this.prisma.invoice.findMany({
        where: {
          month: monthKey,
        },
        select: {
          amount: true,
          isOverLimit: true,
        },
      });

      const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const overLimitAmount = invoices
        .filter((inv) => inv.isOverLimit)
        .reduce((sum, inv) => sum + inv.amount, 0);
      const overLimitCount = invoices.filter((inv) => inv.isOverLimit).length;

      trends.push({
        month: monthKey,
        totalAmount,
        overLimitAmount,
        overLimitCount,
        normalAmount: totalAmount - overLimitAmount,
      });
    }

    return trends;
  }

  /**
   * 获取销售业绩排行
   */
  async getSalesPerformance(startDate?: Date, endDate?: Date) {
    // 默认查询最近12个月
    if (!startDate) {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
    }
    if (!endDate) {
      endDate = new Date();
    }

    // 查询所有有跟进人的客户
    const customers = await this.prisma.customer.findMany({
      where: {
        followUserId: {
          not: null,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        followUserId: true,
        customerLevel: true,
      },
    });

    // 按销售分组统计
    const salesMap = new Map();

    for (const customer of customers) {
      const userId = customer.followUserId!;

      if (!salesMap.has(userId)) {
        salesMap.set(userId, {
          userId,
          totalCustomers: 0,
          potentialCustomers: 0,
          intentionCustomers: 0,
          formalCustomers: 0,
          vipCustomers: 0,
        });
      }

      const stats = salesMap.get(userId);
      stats.totalCustomers++;

      switch (customer.customerLevel) {
        case 0: // 潜在
          stats.potentialCustomers++;
          break;
        case 1: // 意向
          stats.intentionCustomers++;
          break;
        case 2: // 正式
          stats.formalCustomers++;
          break;
        case 3: // VIP
          stats.vipCustomers++;
          break;
      }
    }

    // 查询用户信息并排序
    const userIds = Array.from(salesMap.keys());
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const performance = [];

    for (const [userId, stats] of salesMap.entries()) {
      const user = users.find((u) => u.id === userId);
      if (user) {
        performance.push({
          ...stats,
          userName: user.name,
          conversionRate:
            stats.totalCustomers > 0
              ? parseFloat(
                  (
                    ((stats.formalCustomers + stats.vipCustomers) /
                      stats.totalCustomers) *
                    100
                  ).toFixed(2),
                )
              : 0,
        });
      }
    }

    // 按正式客户数排序
    return performance.sort(
      (a, b) => b.formalCustomers + b.vipCustomers - (a.formalCustomers + a.vipCustomers),
    );
  }

  /**
   * 获取产品销售统计
   */
  async getProductSalesStats(startDate?: Date, endDate?: Date) {
    if (!startDate) {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
    }
    if (!endDate) {
      endDate = new Date();
    }

    const products = await this.prisma.product.findMany({
      include: {
        _count: {
          select: {
            contracts: {
              where: {
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        },
      },
    });

    // 查询每个产品的合同金额
    const stats = [];

    for (const product of products) {
      const contracts = await this.prisma.contract.findMany({
        where: {
          productId: product.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          amount: true,
        },
      });

      const totalAmount = contracts.reduce((sum, c) => sum + c.amount, 0);

      stats.push({
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        contractCount: product._count.contracts,
        totalAmount,
        avgAmount:
          product._count.contracts > 0
            ? totalAmount / product._count.contracts
            : 0,
      });
    }

    // 按合同数排序
    return stats.sort((a, b) => b.contractCount - a.contractCount);
  }

  /**
   * 获取最近活动记录
   */
  private async getRecentActivities(limit = 10) {
    // 这里简化处理,实际可以从多个表中获取
    const activities = [];

    // 最近添加的客户
    const recentCustomers = await this.prisma.customer.findMany({
      take: Math.floor(limit / 3),
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    activities.push(
      ...recentCustomers.map((c) => ({
        type: 'customer',
        message: `新增客户: ${c.name}`,
        createdAt: c.createdAt,
      })),
    );

    // 最近创建的合同
    const recentContracts = await this.prisma.contract.findMany({
      take: Math.floor(limit / 3),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    activities.push(
      ...recentContracts.map((c) => ({
        type: 'contract',
        message: `创建合同: ${c.customer.name}`,
        createdAt: c.createdAt,
      })),
    );

    // 最近的跟进记录
    const recentFollows = await this.prisma.followRecord.findMany({
      take: Math.floor(limit / 3),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    activities.push(
      ...recentFollows.map((f) => ({
        type: 'follow',
        message: `跟进客户: ${f.customer.name}`,
        createdAt: f.createdAt,
      })),
    );

    // 按时间排序并限制数量
    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * 导出数据
   */
  async exportData(type: string, filters?: any) {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'customers':
        data = await this.prisma.customer.findMany({
          where: filters,
          include: {
            followUser: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        filename = `customers_${Date.now()}.json`;
        break;

      case 'contracts':
        data = await this.prisma.contract.findMany({
          where: filters,
          include: {
            customer: {
              select: {
                name: true,
              },
            },
            product: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        filename = `contracts_${Date.now()}.json`;
        break;

      case 'invoices':
        data = await this.prisma.invoice.findMany({
          where: filters,
          include: {
            customer: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            month: 'desc',
          },
        });
        filename = `invoices_${Date.now()}.json`;
        break;

      default:
        throw new Error(`不支持的导出类型: ${type}`);
    }

    return {
      filename,
      data,
      count: data.length,
    };
  }
}
