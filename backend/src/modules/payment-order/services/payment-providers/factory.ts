import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProvider } from '../../interfaces/payment-provider.interface';
import { WechatPayProvider } from './wechat-pay.provider';
import { AlipayProvider } from './alipay.provider';

/**
 * 支付提供者工厂
 * 根据支付方式返回对应的支付提供者实例
 */
@Injectable()
export class PaymentProviderFactory {
  private readonly logger = new Logger(PaymentProviderFactory.name);

  private readonly providers = new Map<string, IPaymentProvider>([
    ['wechat', new WechatPayProvider()],
    ['alipay', new AlipayProvider()],
  ]);

  /**
   * 根据支付方式获取对应的支付提供者
   */
  getProvider(paymentMethod: string): IPaymentProvider {
    const provider = this.providers.get(paymentMethod);

    if (!provider) {
      this.logger.warn(`不支持的支付方式: ${paymentMethod}`);
      throw new Error(`不支持的支付方式: ${paymentMethod}`);
    }

    return provider;
  }

  /**
   * 获取所有支持的支付方式
   */
  getSupportedPaymentMethods(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 注册支付提供者
   */
  registerProvider(paymentMethod: string, provider: IPaymentProvider): void {
    this.providers.set(paymentMethod, provider);
    this.logger.log(`注册支付提供者: ${paymentMethod}`);
  }
}
