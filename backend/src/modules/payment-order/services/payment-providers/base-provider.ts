import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProvider } from '../../interfaces/payment-provider.interface';
import { QrCodeParams, QrCodeResult, CallbackResult, OrderStatus, RefundResult } from '../../interfaces/payment-provider.interface';

/**
 * 支付提供者基类
 * 所有支付提供者应该继承此类并实现抽象方法
 */
@Injectable()
export abstract class BasePaymentProvider implements IPaymentProvider {
  protected readonly logger: Logger;

  constructor(name: string) {
    this.logger = new Logger(name);
  }

  /**
   * 生成支付二维码
   * 子类必须实现
   */
  abstract generateQrCode(params: QrCodeParams): Promise<QrCodeResult>;

  /**
   * 处理支付回调
   * 子类必须实现
   */
  abstract handleCallback(data: any): Promise<CallbackResult>;

  /**
   * 查询订单状态
   * 子类必须实现
   */
  abstract queryOrder(orderNo: string): Promise<OrderStatus>;

  /**
   * 退款
   * 子类必须实现
   */
  abstract refund(orderNo: string, amount: number, reason?: string): Promise<RefundResult>;

  /**
   * 验证回调签名
   * 子类必须实现
   */
  abstract verifySignature(data: any, signature: string): boolean;

  /**
   * 关闭订单
   * 默认实现
   */
  async closeOrder(orderNo: string): Promise<boolean> {
    this.logger.log(`关闭订单: ${orderNo}`);
    // 默认实现，子类可以重写
    return true;
  }

  /**
   * HTTP请求辅助方法
   */
  protected async httpPost(url: string, data: any, headers?: Record<string, string>): Promise<any> {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.post(url, data, { headers });
      return response.data;
    } catch (error) {
      this.logger.error(`HTTP请求失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * HTTP GET请求辅助方法
   */
  protected async httpGet(url: string, params?: any, headers?: Record<string, string>): Promise<any> {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(url, { params, headers });
      return response.data;
    } catch (error) {
      this.logger.error(`HTTP请求失败: ${error.message}`);
      throw error;
    }
  }
}
