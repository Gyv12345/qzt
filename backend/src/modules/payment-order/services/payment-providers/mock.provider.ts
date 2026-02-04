import { Injectable, Logger } from '@nestjs/common';
import { QrCodeParams, QrCodeResult, CallbackResult, OrderStatus, RefundResult } from '../../interfaces/payment-provider.interface';
import { QrCodeUtil } from '@/lib/qr-code.util';
import { BasePaymentProvider } from './base-provider';

/**
 * Mock支付提供者
 * 用于开发和测试环境,无需真实证书即可模拟支付流程
 */
@Injectable()
export class MockPaymentProvider extends BasePaymentProvider {
  constructor() {
    super('MockPaymentProvider');
  }

  /**
   * 生成模拟支付二维码
   */
  async generateQrCode(params: QrCodeParams): Promise<QrCodeResult> {
    this.logger.log(`[Mock] 生成支付二维码: ${params.orderNo}`);

    // 模拟二维码数据（包含订单号）
    const mockQrData = JSON.stringify({
      mock: true,
      orderNo: params.orderNo,
      amount: params.amount,
      timestamp: Date.now(),
    });

    // 生成二维码图片
    const qrCodeUrl = await QrCodeUtil.generateDataUrl(mockQrData);

    return {
      qrCodeUrl,
      qrCodeData: mockQrData,
      prepayId: `mock_prepay_${params.orderNo}`,
      expiresAt: params.timeExpire || new Date(Date.now() + 2 * 60 * 60 * 1000),
    };
  }

  /**
   * 处理支付回调（Mock版本）
   */
  async handleCallback(data: any): Promise<CallbackResult> {
    this.logger.log(`[Mock] 处理支付回调`);

    // Mock回调总是成功
    return {
      success: true,
      orderNo: data.orderNo || data.out_trade_no,
      transactionId: `mock_transaction_${Date.now()}`,
      amount: data.total_amount || data.amount || 0,
      paidAt: new Date(),
    };
  }

  /**
   * 查询订单状态（Mock版本）
   */
  async queryOrder(orderNo: string): Promise<OrderStatus> {
    this.logger.log(`[Mock] 查询订单: ${orderNo}`);

    // 模拟订单已支付
    return {
      orderNo,
      status: 'paid',
      paidAt: new Date(),
      transactionId: `mock_transaction_${orderNo}`,
      amount: 0,
    };
  }

  /**
   * 退款（Mock版本）
   */
  async refund(orderNo: string, amount: number, reason?: string): Promise<RefundResult> {
    this.logger.log(`[Mock] 退款: ${orderNo}, 金额: ${amount}`);

    return {
      success: true,
      refundId: `mock_refund_${Date.now()}`,
      amount,
    };
  }

  /**
   * 关闭订单（Mock版本）
   */
  async closeOrder(orderNo: string): Promise<boolean> {
    this.logger.log(`[Mock] 关闭订单: ${orderNo}`);
    return true;
  }

  /**
   * 验证签名（Mock版本，总是返回true）
   */
  verifySignature(data: any, signature: string): boolean {
    return true;
  }
}
