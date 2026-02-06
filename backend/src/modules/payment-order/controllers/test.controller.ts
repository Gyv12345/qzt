import {
  Controller,
  Post,
  Param,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PaymentOrderService } from "../services/payment-order.service";
import { PrismaService } from "@/common/prisma/prisma.service";

/**
 * 支付测试控制器
 * 提供测试环境专用的支付模拟接口
 */
@ApiTags("payment-test")
@Controller("payment-test")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentTestController {
  constructor(
    private config: ConfigService,
    private paymentService: PaymentOrderService,
    private prisma: PrismaService,
  ) {}

  @Post("pay/:orderNo")
  @ApiOperation({ summary: "测试支付(仅测试环境)" })
  async testPay(@Param("orderNo") orderNo: string) {
    // 检查是否为测试环境
    if (this.config.get("NODE_ENV") === "production") {
      throw new ForbiddenException("生产环境不可用测试接口");
    }

    // 查找订单
    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new Error("订单不存在");
    }

    if (order.status === "paid") {
      return {
        message: "订单已支付",
        order,
      };
    }

    // 模拟支付成功
    const updated = await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        transactionId: `test_transaction_${Date.now()}`,
        paidAt: new Date(),
      },
    });

    // 如果关联合同，创建收款记录
    if (order.contractId) {
      await this.prisma.payment.create({
        data: {
          contractId: order.contractId,
          amount: order.amount,
          method: order.paymentMethod === "wechat" ? "WECHAT" : "ALIPAY",
          payTime: new Date(),
          status: "CONFIRMED",
        },
      });
    }

    return {
      message: "测试支付成功",
      order: updated,
    };
  }

  @Post("reset/:orderNo")
  @ApiOperation({ summary: "重置订单状态(仅测试环境)" })
  async resetOrder(@Param("orderNo") orderNo: string) {
    // 检查是否为测试环境
    if (this.config.get("NODE_ENV") === "production") {
      throw new ForbiddenException("生产环境不可用测试接口");
    }

    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new Error("订单不存在");
    }

    const updated = await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "pending",
        transactionId: null,
        paidAt: null,
      },
    });

    return {
      message: "订单重置成功",
      order: updated,
    };
  }
}
