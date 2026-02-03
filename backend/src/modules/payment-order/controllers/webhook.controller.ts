import { Controller, Post, Body, Headers, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentOrderService } from '../services/payment-order.service';

@ApiTags('支付回调')
@Controller('payment/webhook')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly orderService: PaymentOrderService) {}

  @Post('wechat')
  @ApiOperation({ summary: '微信支付回调' })
  async wechatCallback(@Body() body: any, @Headers() headers: any, @Req() req: any) {
    this.logger.log(`收到微信支付回调: ${JSON.stringify(body)}`);

    const result = await this.orderService.handleCallback('wechat', {
      body: JSON.stringify(body),
      headers,
      ...body,
    });

    // 返回微信要求的格式
    if (result.success) {
      return {
        code: 'SUCCESS',
        message: '成功',
      };
    } else {
      return {
        code: 'FAIL',
        message: result.error || '处理失败',
      };
    }
  }

  @Post('alipay')
  @ApiOperation({ summary: '支付宝支付回调' })
  async alipayCallback(@Body() body: any, @Headers() headers: any, @Req() req: any) {
    this.logger.log(`收到支付宝支付回调: ${JSON.stringify(body)}`);

    const result = await this.orderService.handleCallback('alipay', {
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
