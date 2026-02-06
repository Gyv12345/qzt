import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IPaymentProvider } from "../../interfaces/payment-provider.interface";
import { MockPaymentProvider } from "./mock.provider";
import { WechatPayProvider } from "./wechat-pay.provider";
import { AlipayProvider } from "./alipay.provider";

/**
 * 支付提供者工厂
 * 根据支付方式返回对应的支付提供者实例
 * 支持Mock模式和真实支付模式
 */
@Injectable()
export class PaymentProviderFactory {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private providers: Map<string, IPaymentProvider> = new Map();

  constructor(
    private mockProvider: MockPaymentProvider,
    private wechatPayProvider: WechatPayProvider,
    private alipayProvider: AlipayProvider,
    private config: ConfigService,
  ) {
    // 根据配置决定使用哪个提供者
    const paymentMode = this.config.get("PAYMENT_MODE", "mock");

    if (paymentMode === "mock") {
      this.logger.log("使用Mock支付模式");
      this.providers.set("wechat", mockProvider);
      this.providers.set("alipay", mockProvider);
      this.providers.set("bank", mockProvider);
    } else {
      this.logger.log("使用真实支付模式");
      this.providers.set("wechat", wechatPayProvider);
      this.providers.set("alipay", alipayProvider);
      this.providers.set("bank", mockProvider); // 银行转账使用Mock
    }
  }

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
   * 动态切换支付模式
   */
  setPaymentMode(mode: "mock" | "production") {
    this.logger.log(`切换支付模式到: ${mode}`);

    if (mode === "mock") {
      this.providers.set("wechat", this.mockProvider);
      this.providers.set("alipay", this.mockProvider);
      this.providers.set("bank", this.mockProvider);
    } else {
      this.providers.set("wechat", this.wechatPayProvider);
      this.providers.set("alipay", this.alipayProvider);
      this.providers.set("bank", this.mockProvider);
    }
  }

  /**
   * 注册支付提供者
   */
  registerProvider(paymentMethod: string, provider: IPaymentProvider): void {
    this.providers.set(paymentMethod, provider);
    this.logger.log(`注册支付提供者: ${paymentMethod}`);
  }
}
