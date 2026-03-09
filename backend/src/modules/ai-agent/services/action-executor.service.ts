import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { CustomerService } from "../../customer/customer.service";
import { FollowRecordService } from "../../follow-record/follow-record.service";
import { ContractService } from "../../contract/contract.service";
import { PaymentService } from "../../payment/payment.service";

/**
 * 操作执行结果
 */
export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * 操作执行服务
 * 执行实际的业务操作
 */
@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly followRecordService: FollowRecordService,
    private readonly contractService: ContractService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * 执行意图对应的操作
   */
  async execute(
    intent: string,
    entities: Record<string, unknown>,
    userId: string,
    isAdmin: boolean,
  ): Promise<ActionResult> {
    this.logger.debug(`执行操作: ${intent}, 实体: ${JSON.stringify(entities)}`);

    try {
      switch (intent) {
        case "create_customer":
          return await this.createCustomer(entities, userId);
        case "create_follow_record":
          return await this.createFollowRecord(entities, userId, isAdmin);
        case "create_contract":
          return await this.createContract(entities, userId, isAdmin);
        case "create_payment":
          return await this.createPayment(entities, userId, isAdmin);
        case "query_customer":
          return await this.queryCustomer(entities, userId, isAdmin);
        case "help":
          return {
            success: true,
            message: this.getHelpMessage(),
          };
        default:
          return {
            success: false,
            message: "未知的操作类型",
            error: "UNKNOWN_INTENT",
          };
      }
    } catch (error) {
      this.logger.error(`操作执行失败: ${error}`);
      return {
        success: false,
        message: `操作失败: ${error instanceof Error ? error.message : "未知错误"}`,
        error: "EXECUTION_ERROR",
      };
    }
  }

  /**
   * 创建客户
   */
  private async createCustomer(
    entities: Record<string, unknown>,
    userId: string,
  ): Promise<ActionResult> {
    const customerData = {
      name: entities.companyName as string,
      shortName: (entities.shortName as string) || "",
      industry: (entities.industry as string) || "",
      address: (entities.address as string) || "",
      sourceChannel: "企业微信AI助手",
    };

    const customer = await this.customerService.create(customerData, userId);

    // 如果有联系人信息，创建联系人
    if (entities.contactName || entities.phone) {
      const contact = await this.prisma.contact.create({
        data: {
          name: (entities.contactName as string) || "未知",
          phone: (entities.phone as string) || "",
          email: (entities.email as string) || "",
        },
      });

      // 关联联系人和客户
      await this.prisma.customerContact.create({
        data: {
          customerId: customer.id,
          contactId: contact.id,
          isPrimary: true,
          status: 1,
        },
      });
    }

    return {
      success: true,
      message: `客户【${customer.name}】创建成功！`,
      data: {
        customerId: customer.id,
        customerName: customer.name,
      },
    };
  }

  /**
   * 创建跟进记录
   */
  private async createFollowRecord(
    entities: Record<string, unknown>,
    userId: string,
    isAdmin: boolean,
  ): Promise<ActionResult> {
    // 需要先找到客户
    let customerId = entities.customerId as string;

    if (!customerId && entities.customerName) {
      const customers = await this.customerService.findAll(
        { keyword: entities.customerName as string, page: 1, pageSize: 1 },
        userId,
        isAdmin,
      );
      if (customers.data && customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        return {
          success: false,
          message: `未找到客户【${entities.customerName}】`,
          error: "CUSTOMER_NOT_FOUND",
        };
      }
    }

    if (!customerId) {
      return {
        success: false,
        message: "缺少客户信息，无法创建跟进记录",
        error: "MISSING_CUSTOMER",
      };
    }

    const followRecord = await this.prisma.followRecord.create({
      data: {
        customerId,
        userId,
        content: (entities.content as string) || "",
        type: this.mapFollowRecordType(entities.type as string),
      },
    });

    return {
      success: true,
      message: `跟进记录已添加！`,
      data: {
        followRecordId: followRecord.id,
        customerId,
      },
    };
  }

  /**
   * 创建合同
   */
  private async createContract(
    entities: Record<string, unknown>,
    userId: string,
    isAdmin: boolean,
  ): Promise<ActionResult> {
    // 需要先找到客户
    let customerId = entities.customerId as string;

    if (!customerId && entities.customerName) {
      const customers = await this.customerService.findAll(
        { keyword: entities.customerName as string, page: 1, pageSize: 1 },
        userId,
        isAdmin,
      );
      if (customers.data && customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        return {
          success: false,
          message: `未找到客户【${entities.customerName}】`,
          error: "CUSTOMER_NOT_FOUND",
        };
      }
    }

    if (!customerId) {
      return {
        success: false,
        message: "缺少客户信息，无法创建合同",
        error: "MISSING_CUSTOMER",
      };
    }

    // 生成合同编号
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await this.prisma.contract.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
        },
      },
    });
    const contractNo = `HT${dateStr}${String(count + 1).padStart(3, "0")}`;

    const contract = await this.prisma.contract.create({
      data: {
        contractNo,
        customerId,
        originalAmount: entities.amount as number,
        totalAmount: entities.amount as number,
        serviceStart: new Date(entities.serviceStart as string),
        serviceEnd: new Date(entities.serviceEnd as string),
        status: "UNPAID",
        remark: (entities.contractName as string) || `合同-${contractNo}`,
      },
    });

    return {
      success: true,
      message: `合同创建成功！\n合同编号：${contractNo}\n金额：¥${entities.amount?.toLocaleString()}`,
      data: {
        contractId: contract.id,
        contractNo,
        customerId,
      },
    };
  }

  /**
   * 创建回款
   */
  private async createPayment(
    entities: Record<string, unknown>,
    userId: string,
    isAdmin: boolean,
  ): Promise<ActionResult> {
    // 需要先找到合同
    let contractId = entities.contractId as string;

    if (!contractId && entities.customerName) {
      // 通过客户名找最近的合同
      const customers = await this.customerService.findAll(
        { keyword: entities.customerName as string, page: 1, pageSize: 1 },
        userId,
        isAdmin,
      );
      if (customers.data && customers.data.length > 0) {
        const customerId = customers.data[0].id;
        const contract = await this.prisma.contract.findFirst({
          where: { customerId },
          orderBy: { createdAt: "desc" },
        });
        if (contract) {
          contractId = contract.id;
        }
      }
    }

    if (!contractId) {
      return {
        success: false,
        message: "缺少合同信息，无法创建回款",
        error: "MISSING_CONTRACT",
      };
    }

    const payment = await this.prisma.payment.create({
      data: {
        contractId,
        amount: entities.amount as number,
        method: "BANK_TRANSFER", // 默认银行转账
        payTime: entities.paymentDate
          ? new Date(entities.paymentDate as string)
          : new Date(),
        status: "PENDING",
        remark: (entities.remark as string) || "",
      },
    });

    return {
      success: true,
      message: `回款记录创建成功！\n金额：¥${entities.amount?.toLocaleString()}`,
      data: {
        paymentId: payment.id,
        contractId,
      },
    };
  }

  /**
   * 查询客户
   */
  private async queryCustomer(
    entities: Record<string, unknown>,
    userId: string,
    isAdmin: boolean,
  ): Promise<ActionResult> {
    const keyword =
      (entities.companyName as string) ||
      (entities.contactName as string) ||
      (entities.phone as string);

    if (!keyword) {
      return {
        success: false,
        message: "请提供要查询的客户名称或联系人信息",
        error: "MISSING_KEYWORD",
      };
    }

    const result = await this.customerService.findAll(
      { keyword, page: 1, pageSize: 5 },
      userId,
      isAdmin,
    );

    if (!result.data || result.data.length === 0) {
      return {
        success: true,
        message: `未找到与【${keyword}】相关的客户`,
        data: { total: 0 },
      };
    }

    const customerList = result.data
      .map(
        (c: Record<string, unknown>, i: number) =>
          `${i + 1}. ${c.name}${c.contactName ? ` (联系人: ${c.contactName})` : ""}`,
      )
      .join("\n");

    return {
      success: true,
      message: `找到 ${result.total} 个相关客户：\n${customerList}`,
      data: {
        customers: result.data,
        total: result.total,
      },
    };
  }

  /**
   * 获取帮助信息
   */
  private getHelpMessage(): string {
    return `我是您的企业CRM助手，可以帮您：
📝 创建客户：发送"新建客户 北京科技公司，联系人张三，电话13800138000"
📋 添加跟进：发送"给北京科技公司添加跟进记录，今天电话沟通了合作意向"
📄 创建合同：发送"创建合同，客户北京科技公司，金额5万元，服务期一年"
💰 创建回款：发送"添加回款，合同编号HT202401001，金额2万元"
🔍 查询客户：发送"查询客户 北京科技"

有什么可以帮您的吗？`;
  }

  /**
   * 映射跟进类型字符串到数字
   * 1:电话 2:微信 3:上门 4:邮件 5:其他
   */
  private mapFollowRecordType(type?: string): number {
    if (!type) return 5; // 默认其他
    const typeMap: Record<string, number> = {
      电话: 1,
      微信: 2,
      上门: 3,
      拜访: 3,
      邮件: 4,
      其他: 5,
    };
    return typeMap[type] || 5;
  }
}
