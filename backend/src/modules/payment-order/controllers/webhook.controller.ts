import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  Logger,
  Query,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentOrderService } from "../services/payment-order.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("payment-webhooks")
@Controller("payment")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly orderService: PaymentOrderService) {}

  @Post("wechat")
  @ApiOperation({ summary: "微信支付回调" })
  async wechatCallback(
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: any,
  ) {
    this.logger.log(`收到微信支付回调: ${JSON.stringify(body)}`);

    const result = await this.orderService.handleCallback("wechat", {
      body: JSON.stringify(body),
      headers,
      ...body,
    });

    // 返回微信要求的格式
    if (result.success) {
      return {
        code: "SUCCESS",
        message: "成功",
      };
    } else {
      return {
        code: "FAIL",
        message: result.error || "处理失败",
      };
    }
  }

  @Post("alipay")
  @ApiOperation({ summary: "支付宝支付回调" })
  async alipayCallback(
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: any,
  ) {
    this.logger.log(`收到支付宝支付回调: ${JSON.stringify(body)}`);

    const result = await this.orderService.handleCallback("alipay", {
      body: JSON.stringify(body),
      headers,
      ...body,
    });

    // 返回支付宝要求的格式
    if (result.success) {
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        error: result.error,
      };
    }
  }

  @Get("orders/:id/callback-logs")
  @ApiOperation({ summary: "查询支付订单的回调日志" })
  async getCallbackLogsByOrder(
    @Param("id") orderId: string,
    @Query() query: { page?: number; pageSize?: number },
  ) {
    const result = await this.orderService.getCallbackLogs(orderId, query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }

  @Get("callback-logs")
  @ApiOperation({ summary: "查询所有支付回调日志" })
  async getAllCallbackLogs(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      paymentMethod?: string;
      status?: string;
    },
  ) {
    const result = await this.orderService.getAllCallbackLogs(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }
}

// 公开的回调控制器（不需要认证）
@ApiTags("payment-webhooks-public")
@Controller("payment/webhook")
export class PublicPaymentWebhookController {
  private readonly logger = new Logger(PublicPaymentWebhookController.name);

  constructor(private readonly orderService: PaymentOrderService) {}

  @Post("wechat")
  @ApiOperation({ summary: "微信支付回调" })
  async wechatCallback(
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: any,
  ) {
    this.logger.log(`收到微信支付回调: ${JSON.stringify(body)}`);

    const result = await this.orderService.handleCallback("wechat", {
      body: JSON.stringify(body),
      headers,
      ...body,
    });

    // 返回微信要求的格式
    if (result.success) {
      return {
        code: "SUCCESS",
        message: "成功",
      };
    } else {
      return {
        code: "FAIL",
        message: result.error || "处理失败",
      };
    }
  }

  @Post("alipay")
  @ApiOperation({ summary: "支付宝支付回调" })
  async alipayCallback(
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: any,
  ) {
    this.logger.log(`收到支付宝支付回调: ${JSON.stringify(body)}`);

    const result = await this.orderService.handleCallback("alipay", {
      body: JSON.stringify(body),
      headers,
      ...body,
    });

    // 返回支付宝要求的格式
    if (result.success) {
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        error: result.error,
      };
    }
  }
}
