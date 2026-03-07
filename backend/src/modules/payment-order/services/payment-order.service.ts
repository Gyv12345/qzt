import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CryptoUtil } from "@/lib/crypto.util";
import { QrCodeUtil } from "@/lib/qr-code.util";
import { DateUtil } from "@/lib/date.util";
import {
  IPaymentOrderService,
  CreatePaymentOrderInput,
  UpdatePaymentOrderInput,
  QueryPaymentOrderInput,
} from "../interfaces/payment-order.interface";
import { PaymentProviderFactory } from "./payment-providers/factory";
import { PaymentOrder } from "@prisma/client";

@Injectable()
export class PaymentOrderService implements IPaymentOrderService {
  private readonly logger = new Logger(PaymentOrderService.name);

  constructor(
    private prisma: PrismaService,
    private providerFactory: PaymentProviderFactory,
  ) {}

  /**
   * 创建支付订单
   */
  async create(data: CreatePaymentOrderInput): Promise<PaymentOrder> {
    try {
      // 验证合同是否存在（如果提供了合同ID）
      if (data.contractId) {
        const contract = await this.prisma.contract.findUnique({
          where: { id: data.contractId },
        });
        if (!contract) {
          throw new NotFoundException(`合同不存在: ${data.contractId}`);
        }
      }

      // 生成订单号
      const orderNo = this.generateOrderNo(data.paymentMethod);

      // 计算过期时间（2小时后）
      const expiredAt = DateUtil.addHours(new Date(), 2);

      const orderData = {
        ...data,
        orderNo,
        status: "pending",
        expiredAt,
      };

      const order = await this.prisma.paymentOrder.create({
        data: orderData,
      });

      this.logger.log(`创建支付订单成功: ${orderNo}`);
      return order;
    } catch (error) {
      this.logger.error(`创建支付订单失败: ${error.message}`);
      throw new BadRequestException(`创建订单失败: ${error.message}`);
    }
  }

  /**
   * 更新支付订单
   */
  async update(
    id: string,
    data: UpdatePaymentOrderInput,
  ): Promise<PaymentOrder> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`订单不存在: ${id}`);
    }

    try {
      const order = await this.prisma.paymentOrder.update({
        where: { id },
        data,
      });

      this.logger.log(`更新支付订单成功: ${id}`);
      return order;
    } catch (error) {
      this.logger.error(`更新支付订单失败: ${error.message}`);
      throw new BadRequestException(`更新订单失败: ${error.message}`);
    }
  }

  /**
   * 删除订单
   */
  async delete(id: string): Promise<PaymentOrder> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`订单不存在: ${id}`);
    }

    // 已支付或正在处理中的订单不允许删除
    if (existing.status === "paid" || existing.status === "pending") {
      throw new BadRequestException("该状态下的订单不允许删除");
    }

    try {
      const order = await this.prisma.paymentOrder.delete({
        where: { id },
      });

      this.logger.log(`删除支付订单成功: ${id}`);
      return order;
    } catch (error) {
      this.logger.error(`删除支付订单失败: ${error.message}`);
      throw new BadRequestException(`删除订单失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找订单
   */
  async findById(id: string): Promise<PaymentOrder | null> {
    try {
      const order = await this.prisma.paymentOrder.findUnique({
        where: { id },
      });
      return order;
    } catch (error) {
      this.logger.error(`查找订单失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 根据订单号查找订单
   */
  async findByOrderNo(orderNo: string): Promise<PaymentOrder | null> {
    try {
      const order = await this.prisma.paymentOrder.findUnique({
        where: { orderNo },
      });
      return order;
    } catch (error) {
      this.logger.error(`查找订单失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 查询订单列表
   */
  async findAll(
    query: QueryPaymentOrderInput,
  ): Promise<{ data: PaymentOrder[]; total: number }> {
    const {
      contractId,
      orderNo,
      paymentMethod,
      status,
      page = 1,
      pageSize = 10,
    } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (contractId) {
      where.contractId = contractId;
    }
    if (orderNo) {
      where.orderNo = { contains: orderNo };
    }
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }
    if (status) {
      where.status = status;
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.paymentOrder.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.paymentOrder.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      this.logger.error(`查询订单列表失败: ${error.message}`);
      throw new BadRequestException(`查询失败: ${error.message}`);
    }
  }

  /**
   * 生成支付二维码
   */
  async generateQrCode(
    orderId: string,
    clientIp?: string,
  ): Promise<{ qrCodeUrl: string; qrCodeData: string; expiresAt: Date }> {
    const order = await this.findById(orderId);
    if (!order) {
      throw new NotFoundException(`订单不存在: ${orderId}`);
    }

    if (order.status !== "pending") {
      throw new BadRequestException(`订单状态不正确: ${order.status}`);
    }

    // 检查订单是否过期
    if (order.expiredAt && DateUtil.isExpired(order.expiredAt)) {
      throw new BadRequestException("订单已过期");
    }

    try {
      // 获取支付提供者
      const provider = this.providerFactory.getProvider(order.paymentMethod);

      // 生成支付二维码
      const result = await provider.generateQrCode({
        orderNo: order.orderNo,
        amount: order.amount,
        description: order.body || "支付订单",
        notifyUrl: order.notifyUrl,
        returnUrl: order.returnUrl,
        clientIp: clientIp || order.clientIp,
        timeExpire: order.expiredAt,
      });

      // 更新订单信息
      await this.prisma.paymentOrder.update({
        where: { id: orderId },
        data: {
          qrCodeUrl: result.qrCodeUrl,
          qrCodeData: result.qrCodeData,
          prepayId: result.prepayId,
        },
      });

      this.logger.log(`生成支付二维码成功: ${order.orderNo}`);
      return {
        qrCodeUrl: result.qrCodeUrl,
        qrCodeData: result.qrCodeData,
        expiresAt: result.expiresAt, // 这里的字段名保持不变，因为这是返回给前端的
      };
    } catch (error) {
      this.logger.error(`生成支付二维码失败: ${error.message}`);
      throw new BadRequestException(`生成二维码失败: ${error.message}`);
    }
  }

  /**
   * 处理支付回调
   */
  async handleCallback(
    paymentMethod: string,
    data: any,
  ): Promise<{
    success: boolean;
    orderNo: string;
    transactionId?: string;
    amount: number;
    error?: string;
  }> {
    try {
      this.logger.log(`处理支付回调: ${paymentMethod}`);

      // 记录回调日志
      await this.prisma.paymentCallbackLog.create({
        data: {
          orderId: data.order_no || data.out_trade_no,
          paymentMethod,
          status: "pending",
          rawData: JSON.stringify(data),
          ip: data.client_ip || "",
        },
      });

      // 获取支付提供者
      const provider = this.providerFactory.getProvider(paymentMethod);

      // 处理回调
      const result = await provider.handleCallback(data);

      if (!result.success) {
        // 更新回调日志
        await this.prisma.paymentCallbackLog.updateMany({
          where: {
            orderId: result.orderNo,
            paymentMethod,
          },
          data: {
            status: "failed",
            error: result.error,
          },
        });

        return result;
      }

      // 查找订单
      const order = await this.findByOrderNo(result.orderNo);
      if (!order) {
        throw new NotFoundException(`订单不存在: ${result.orderNo}`);
      }

      // 更新订单状态
      const updated = await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: "paid",
          transactionId: result.transactionId,
          paidAt: result.paidAt,
        },
      });

      // 如果关联合同，创建收款记录
      if (order.contractId) {
        await this.prisma.payment.create({
          data: {
            contractId: order.contractId,
            amount: order.amount,
            method:
              paymentMethod === "wechat"
                ? "WECHAT"
                : paymentMethod === "alipay"
                  ? "ALIPAY"
                  : "BANK_TRANSFER",
            payTime: result.paidAt,
            status: "CONFIRMED",
          },
        });
      }

      // 更新回调日志
      await this.prisma.paymentCallbackLog.updateMany({
        where: {
          orderId: result.orderNo,
          paymentMethod,
        },
        data: {
          status: "success",
          responseData: JSON.stringify(result),
        },
      });

      this.logger.log(`支付回调处理成功: ${result.orderNo}`);
      return result;
    } catch (error) {
      this.logger.error(`处理支付回调失败: ${error.message}`);
      return {
        success: false,
        orderNo: "",
        amount: 0,
        error: error.message,
      };
    }
  }

  /**
   * 退款
   */
  async refund(
    orderId: string,
    amount: number,
    reason?: string,
  ): Promise<PaymentOrder> {
    const order = await this.findById(orderId);
    if (!order) {
      throw new NotFoundException(`订单不存在: ${orderId}`);
    }

    if (order.status !== "paid") {
      throw new BadRequestException("只有已支付的订单才能退款");
    }

    if (amount > order.amount) {
      throw new BadRequestException("退款金额不能超过订单金额");
    }

    try {
      // 获取支付提供者
      const provider = this.providerFactory.getProvider(order.paymentMethod);

      // 执行退款
      const refundResult = await provider.refund(order.orderNo, amount, reason);

      if (!refundResult.success) {
        throw new Error(refundResult.error || "退款失败");
      }

      // 更新订单状态
      const updated = await this.prisma.paymentOrder.update({
        where: { id: orderId },
        data: {
          status: "refunded",
        },
      });

      this.logger.log(`退款成功: ${order.orderNo}, 金额: ${amount}`);
      return updated;
    } catch (error) {
      this.logger.error(`退款失败: ${error.message}`);
      throw new BadRequestException(`退款失败: ${error.message}`);
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(id: string): Promise<PaymentOrder> {
    const order = await this.findById(id);
    if (!order) {
      throw new NotFoundException(`订单不存在: ${id}`);
    }

    if (order.status !== "pending") {
      throw new BadRequestException("只有待支付状态的订单才能取消");
    }

    try {
      // 获取支付提供者
      const provider = this.providerFactory.getProvider(order.paymentMethod);

      // 关闭订单
      await provider.closeOrder(order.orderNo);

      // 更新订单状态
      const updated = await this.prisma.paymentOrder.update({
        where: { id },
        data: {
          status: "cancelled",
        },
      });

      this.logger.log(`取消订单成功: ${order.orderNo}`);
      return updated;
    } catch (error) {
      this.logger.error(`取消订单失败: ${error.message}`);
      throw new BadRequestException(`取消订单失败: ${error.message}`);
    }
  }

  /**
   * 检查订单状态
   */
  async checkOrderStatus(orderNo: string): Promise<{
    orderNo: string;
    status: string;
    paidAt?: Date;
    transactionId?: string;
  }> {
    const order = await this.findByOrderNo(orderNo);
    if (!order) {
      throw new NotFoundException(`订单不存在: ${orderNo}`);
    }

    try {
      // 获取支付提供者
      const provider = this.providerFactory.getProvider(order.paymentMethod);

      // 查询订单状态
      const status = await provider.queryOrder(orderNo);

      // 如果状态变化，更新本地订单
      if (status.status !== order.status && status.status === "paid") {
        await this.prisma.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: "paid",
            transactionId: status.transactionId,
            paidAt: status.paidAt,
          },
        });
      }

      return {
        orderNo: status.orderNo,
        status: status.status,
        paidAt: status.paidAt,
        transactionId: status.transactionId,
      };
    } catch (error) {
      this.logger.error(`检查订单状态失败: ${error.message}`);
      throw new BadRequestException(`检查订单状态失败: ${error.message}`);
    }
  }

  /**
   * 生成订单号
   */
  private generateOrderNo(paymentMethod: string): string {
    const prefix =
      paymentMethod === "wechat"
        ? "WX"
        : paymentMethod === "alipay"
          ? "ALI"
          : "BNK";
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * 查询支付订单的回调日志
   */
  async getCallbackLogs(
    orderId: string,
    query: { page?: number; pageSize?: number },
  ) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      this.prisma.paymentCallbackLog.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.paymentCallbackLog.count({
        where: { orderId },
      }),
    ]);

    return {
      data: logs,
      total,
    };
  }

  /**
   * 查询所有支付回调日志
   */
  async getAllCallbackLogs(query: {
    page?: number;
    pageSize?: number;
    paymentMethod?: string;
    status?: string;
  }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [logs, total] = await Promise.all([
      this.prisma.paymentCallbackLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.paymentCallbackLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
    };
  }
}
