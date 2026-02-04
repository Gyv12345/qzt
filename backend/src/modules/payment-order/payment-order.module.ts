import { Module } from '@nestjs/common';
import { PaymentOrderController } from './controllers/payment-order.controller';
import { PaymentConfigController } from './controllers/payment-config.controller';
import { PaymentWebhookController } from './controllers/webhook.controller';
import { PaymentOrderService } from './services/payment-order.service';
import { PaymentConfigService } from './services/payment-config.service';
import { PaymentProviderFactory } from './services/payment-providers/factory';
import { MockPaymentProvider } from './services/payment-providers/mock.provider';
import { WechatPayProvider } from './services/payment-providers/wechat-pay.provider';
import { AlipayProvider } from './services/payment-providers/alipay.provider';
import { PrismaService } from '@/common/prisma/prisma.service';

@Module({
  controllers: [
    PaymentOrderController,
    PaymentConfigController,
    PaymentWebhookController,
  ],
  providers: [
    PaymentOrderService,
    PaymentConfigService,
    PaymentProviderFactory,
    MockPaymentProvider,
    WechatPayProvider,
    AlipayProvider,
    PrismaService,
  ],
  exports: [
    PaymentOrderService,
    PaymentConfigService,
    PaymentProviderFactory,
  ],
})
export class PaymentOrderModule {}
