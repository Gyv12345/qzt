import { Module } from '@nestjs/common';
import { PaymentOrderController } from './controllers/payment-order.controller';
import { PaymentConfigController } from './controllers/payment-config.controller';
import { PaymentWebhookController } from './controllers/webhook.controller';
import { CertificateController } from './controllers/certificate.controller';
import { PaymentOrderService } from './services/payment-order.service';
import { PaymentConfigService } from './services/payment-config.service';
import { CertificateService } from './services/certificate.service';
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
    CertificateController,
  ],
  providers: [
    PaymentOrderService,
    PaymentConfigService,
    CertificateService,
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
    CertificateService,
  ],
})
export class PaymentOrderModule {}
