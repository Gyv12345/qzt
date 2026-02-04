# 在线支付集成实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完善在线支付功能，支持Mock/测试/生产三种模式，实现证书灵活管理

**Architecture:**
- 支付提供者工厂模式，支持多种支付方式
- Mock模式：无需证书，模拟支付流程
- 测试模式：使用沙箱环境
- 生产模式：真实支付，证书管理
- 降级策略：找不到证书时自动降级

**Tech Stack:**
- Axios for HTTP requests
- Crypto for signing and encryption
- Node.js fs for certificate files
- QRCode for payment QR codes

---

## Task 1: 创建Mock支付提供者

**Files:**
- Create: `backend/src/modules/payment-order/services/payment-providers/mock.provider.ts`

**Step 1: 创建Mock支付提供者**

```typescript
// backend/src/modules/payment-order/services/payment-providers/mock.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { QrCodeParams, QrCodeResult, CallbackResult, OrderStatus, RefundResult } from '../../interfaces/payment-provider.interface';
import { QrCodeUtil } from '@/lib/qr-code.util';

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
```

**Step 2: 更新支付提供者工厂**

```typescript
// backend/src/modules/payment-order/services/payment-providers/factory.ts

@Injectable()
export class PaymentProviderFactory {
  private providers: Map<string, any> = new Map();

  constructor(
    private mockProvider: MockPaymentProvider,
    private wechatPayProvider: WechatPayProvider,
    private alipayProvider: AlipayProvider,
    private config: ConfigService,
  ) {
    // 根据配置决定使用哪个提供者
    const paymentMode = this.config.get('PAYMENT_MODE', 'mock');

    if (paymentMode === 'mock') {
      this.logger.log('Using Mock payment provider');
      this.providers.set('wechat', mockProvider);
      this.providers.set('alipay', mockProvider);
      this.providers.set('bank', mockProvider);
    } else {
      this.providers.set('wechat', wechatPayProvider);
      this.providers.set('alipay', alipayProvider);
      this.providers.set('bank', mockProvider); // 银行转账使用Mock
    }
  }

  getProvider(paymentMethod: string): BasePaymentProvider {
    const provider = this.providers.get(paymentMethod);
    if (!provider) {
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
    return provider;
  }

  /**
   * 动态切换支付模式
   */
  setPaymentMode(mode: 'mock' | 'production') {
    this.logger.log(`Switching payment mode to: ${mode}`);

    if (mode === 'mock') {
      this.providers.set('wechat', this.mockProvider);
      this.providers.set('alipay', this.mockProvider);
      this.providers.set('bank', this.mockProvider);
    } else {
      this.providers.set('wechat', this.wechatPayProvider);
      this.providers.set('alipay', this.alipayProvider);
      this.providers.set('bank', this.mockProvider);
    }
  }
}
```

**Step 3: 注册Mock提供者到模块**

```typescript
// backend/src/modules/payment-order/payment-order.module.ts
import { MockPaymentProvider } from './services/payment-providers/mock.provider';

@Module({
  providers: [
    // ...existing providers
    MockPaymentProvider,
  ],
})
export class PaymentOrderModule {}
```

**Step 4: 测试Mock支付**

```bash
# 启动服务
PAYMENT_MODE=mock pnpm run start:dev

# 创建Mock订单
curl -X POST http://localhost:7890/api/payment-orders \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "paymentMethod": "wechat",
    "body": "测试订单"
  }'

# 生成二维码
curl -X POST http://localhost:7890/api/payment-orders/{orderId}/qrcode

# 测试支付（新增的测试接口）
curl -X POST http://localhost:7890/api/payment-orders/test-pay/{orderNo}
```

**Step 5: 提交变更**

```bash
git add src/modules/payment-order/
git commit -m "feat: 添加Mock支付提供者

- 无需证书即可测试支付流程
- 模拟生成二维码
- 模拟支付回调
- 支持工厂模式切换

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: 创建证书管理服务

**Files:**
- Create: `backend/src/modules/payment-order/services/certificate.service.ts`
- Create: `backend/src/modules/payment-order/dto/certificate.dto.ts`

**Step 1: 创建证书DTO**

```typescript
// backend/src/modules/payment-order/dto/certificate.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum CertificateType {
  WECHAT_APICLIENT_CERT = 'WECHAT_APICLIENT_CERT',
  WECHAT_PRIVATE_KEY = 'WECHAT_PRIVATE_KEY',
  WECHAT_PUBLIC_KEY = 'WECHAT_PUBLIC_KEY',
  WECHAT_API_KEY = 'WECHAT_API_KEY',
  ALIPAY_PRIVATE_KEY = 'ALIPAY_PRIVATE_KEY',
  ALIPAY_PUBLIC_KEY = 'ALIPAY_PUBLIC_KEY',
}

export class CertificateConfigDto {
  @IsString()
  paymentMethod: 'wechat' | 'alipay';

  @IsString()
  certificateType: CertificateType;

  @IsString()
  @IsOptional()
  certPath?: string;

  @IsString()
  @IsOptional()
  certContent?: string;

  @IsEnum(['development', 'production'])
  @IsOptional()
  environment?: 'development' | 'production';
}

export class VerifyCertificateDto {
  @IsString()
  paymentMethod: 'wechat' | 'alipay';

  @IsEnum(['development', 'production'])
  environment: 'development' | 'production';
}
```

**Step 2: 创建证书管理服务**

```typescript
// backend/src/modules/payment-order/services/certificate.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { CertificateConfigDto, CertificateType } from '../dto/certificate.dto';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  private readonly certBasePath = process.env.CERT_BASE_PATH || '/opt/qzt/certificates';

  constructor(private config: ConfigService) {}

  /**
   * 读取证书文件内容
   */
  getCertificate(
    paymentMethod: string,
    certificateType: CertificateType,
    environment: 'development' | 'production' = 'development',
  ): string {
    const certPath = this.getCertificatePath(
      paymentMethod,
      certificateType,
      environment,
    );

    try {
      if (fs.existsSync(certPath)) {
        return fs.readFileSync(certPath, 'utf8');
      }

      // 尝试从环境变量读取
      const envKey = this.getEnvKey(paymentMethod, certificateType);
      const envValue = this.config.get(envKey);

      if (envValue) {
        this.logger.warn(`Using ${envKey} from environment variable`);
        return envValue;
      }

      throw new NotFoundException(
        `Certificate not found: ${paymentMethod}/${certificateType}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to read certificate: ${error.message}`);
      throw error;
    }
  }

  /**
   * 保存证书文件
   */
  saveCertificate(
    paymentMethod: string,
    certificateType: CertificateType,
    content: string,
    environment: 'development' | 'production' = 'development',
  ): { success: boolean; path: string; error?: string } {
    try {
      const certPath = this.getCertificatePath(
        paymentMethod,
        certificateType,
        environment,
      );

      // 确保目录存在
      const certDir = path.dirname(certPath);
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
      }

      // 写入证书文件
      fs.writeFileSync(certPath, content, { mode: 0o600 });

      this.logger.log(`Certificate saved: ${certPath}`);

      return {
        success: true,
        path: certPath,
      };
    } catch (error: any) {
      this.logger.error(`Failed to save certificate: ${error.message}`);
      return {
        success: false,
        path: '',
        error: error.message,
      };
    }
  }

  /**
   * 验证证书配置
   */
  async verifyCertificates(dto: VerifyCertificateDto): Promise<{
    valid: boolean;
    certificates: string[];
    missing: string[];
  }> {
    const certificates: string[] = [];
    const missing: string[] = [];

    const requiredCerts =
      dto.paymentMethod === 'wechat'
        ? [
            CertificateType.WECHAT_APICLIENT_CERT,
            CertificateType.WECHAT_PRIVATE_KEY,
            CertificateType.WECHAT_PUBLIC_KEY,
            CertificateType.WECHAT_API_KEY,
          ]
        : [
            CertificateType.ALIPAY_PRIVATE_KEY,
            CertificateType.ALIPAY_PUBLIC_KEY,
          ];

    for (const certType of requiredCerts) {
      try {
        const content = this.getCertificate(
          dto.paymentMethod,
          certType,
          dto.environment,
        );
        certificates.push(certType);
      } catch (error) {
        missing.push(certType);
      }
    }

    return {
      valid: missing.length === 0,
      certificates,
      missing,
    };
  }

  /**
   * 获取证书文件路径
   */
  private getCertificatePath(
    paymentMethod: string,
    certificateType: CertificateType,
    environment: string,
  ): string {
    const filename = this.getFilename(certificateType);
    return path.join(
      this.certBasePath,
      paymentMethod,
      environment,
      filename,
    );
  }

  /**
   * 获取证书文件名
   */
  private getFilename(certificateType: CertificateType): string {
    const fileNames: Record<CertificateType, string> = {
      [CertificateType.WECHAT_APICLIENT_CERT]: 'apiclient_cert.p12',
      [CertificateType.WECHAT_PRIVATE_KEY]: 'apiclient_key.pem',
      [CertificateType.WECHAT_PUBLIC_KEY]: 'platform_public_key.pem',
      [CertificateType.WECHAT_API_KEY]: 'api_key.txt',
      [CertificateType.ALIPAY_PRIVATE_KEY]: 'alipay_private_key.txt',
      [CertificateType.ALIPAY_PUBLIC_KEY]: 'alipay_public_key.txt',
    };

    return fileNames[certificateType];
  }

  /**
   * 获取环境变量键名
   */
  private getEnvKey(paymentMethod: string, certificateType: CertificateType): string {
    const envKeys: Record<string, string> = {
      wechat_wechat_apiclient_cert: 'WECHAT_APICLIENT_CERT',
      wechat_wechat_private_key: 'WECHAT_PRIVATE_KEY',
      wechat_wechat_public_key: 'WECHAT_PUBLIC_KEY',
      wechat_wechat_api_key: 'WECHAT_API_KEY',
      alipay_alipay_private_key: 'ALIPAY_PRIVATE_KEY',
      alipay_alipay_public_key: 'ALIPAY_PUBLIC_KEY',
    };

    return envKeys[`${paymentMethod}_${certificateType}`] || '';
  }

  /**
   * 检查证书是否存在
   */
  certificateExists(
    paymentMethod: string,
    certificateType: CertificateType,
    environment: string = 'development',
  ): boolean {
    try {
      this.getCertificate(paymentMethod, certificateType, environment);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Step 3: 创建证书管理控制器**

```typescript
// backend/src/modules/payment-order/controllers/certificate.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CertificateService } from '../services/certificate.service';
import { CertificateConfigDto, VerifyCertificateDto } from '../dto/certificate.dto';

@ApiTags('payment-certificates')
@Controller('payment-certificates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificateController {
  constructor(private certificateService: CertificateService) {}

  @Post('save')
  @ApiOperation({ summary: '保存证书文件' })
  async saveCertificate(@Body() dto: CertificateConfigDto) {
    if (!dto.certContent) {
      return {
        success: false,
        error: 'Certificate content is required',
      };
    }

    return this.certificateService.saveCertificate(
      dto.paymentMethod,
      dto.certificateType,
      dto.certContent,
      dto.environment,
    );
  }

  @Post('verify')
  @ApiOperation({ summary: '验证证书配置' })
  async verifyCertificates(@Body() dto: VerifyCertificateDto) {
    return this.certificateService.verifyCertificates(dto);
  }

  @Get('list')
  @ApiOperation({ summary: '列出所有证书文件' })
  async listCertificates() {
    const fs = require('fs');
    const path = require('path');

    const certBasePath =
      process.env.CERT_BASE_PATH || '/opt/qzt/certificates';
    const certificates: any[] = [];

    try {
      const methods = ['wechat', 'alipay'];
      const environments = ['development', 'production'];

      for (const method of methods) {
        for (const env of environments) {
          const certDir = path.join(certBasePath, method, env);

          if (fs.existsSync(certDir)) {
            const files = fs.readdirSync(certDir);

            for (const file of files) {
              const filePath = path.join(certDir, file);
              const stats = fs.statSync(filePath);

              certificates.push({
                paymentMethod: method,
                environment: env,
                filename: file,
                size: stats.size,
                modified: stats.mtime,
                exists: true,
              });
            }
          }
        }
      }

      return { certificates };
    } catch (error: any) {
      return {
        certificates: [],
        error: error.message,
      };
    }
  }
}
```

**Step 4: 注册服务和控制器**

```typescript
// backend/src/modules/payment-order/payment-order.module.ts
import { CertificateService } from './services/certificate.service';
import { CertificateController } from './controllers/certificate.controller';

@Module({
  providers: [CertificateService],
  controllers: [CertificateController],
})
export class PaymentOrderModule {}
```

**Step 5: 提交变更**

```bash
git add src/modules/payment-order/
git commit -m "feat: 创建证书管理服务

- CertificateService: 读写证书文件
- 支持文件存储和环境变量
- 证书验证和列出功能
- 安全的文件权限设置

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: 更新微信/支付宝提供者使用证书

**Files:**
- Modify: `backend/src/modules/payment-order/services/payment-providers/wechat-pay.provider.ts`
- Modify: `backend/src/modules/payment-order/services/payment-providers/alipay.provider.ts`

**Step 1: 更新WechatPayProvider**

```typescript
// backend/src/modules/payment-order/services/payment-providers/wechat-pay.provider.ts

import { CertificateService } from '../certificate.service';

@Injectable()
export class WechatPayProvider extends BasePaymentProvider {
  constructor(
    private certificateService: CertificateService,
  ) {
    super('WechatPayProvider');
  }

  /**
   * 获取私钥
   */
  private getPrivateKey(): string {
    try {
      // 优先从文件读取
      if (
        this.certificateService.certificateExists(
          'wechat',
          CertificateType.WECHAT_PRIVATE_KEY,
        )
      ) {
        return this.certificateService.getCertificate(
          'wechat',
          CertificateType.WECHAT_PRIVATE_KEY,
        );
      }

      // 从环境变量读取
      return process.env.WECHAT_PRIVATE_KEY || '';
    } catch (error) {
      this.logger.error('Failed to get WeChat private key');
      return '';
    }
  }

  /**
   * 获取公钥
   */
  private getPublicKey(): string {
    try {
      if (
        this.certificateService.certificateExists(
          'wechat',
          CertificateType.WECHAT_PUBLIC_KEY,
        )
      ) {
        return this.certificateService.getCertificate(
          'wechat',
          CertificateType.WECHAT_PUBLIC_KEY,
        );
      }

      return process.env.WECHAT_PUBLIC_KEY || '';
    } catch (error) {
      this.logger.error('Failed to get WeChat public key');
      return '';
    }
  }

  /**
   * 获取API密钥
   */
  private getApiKey(): Buffer {
    try {
      let apiKey = '';

      if (
        this.certificateService.certificateExists(
          'wechat',
          CertificateType.WECHAT_API_KEY,
        )
      ) {
        apiKey = this.certificateService.getCertificate(
          'wechat',
          CertificateType.WECHAT_API_KEY,
        );
      } else {
        apiKey = process.env.WECHAT_API_KEY || '';
      }

      return Buffer.from(apiKey, 'utf8').slice(0, 32);
    } catch (error) {
      this.logger.error('Failed to get WeChat API key');
      return Buffer.alloc(32);
    }
  }
}
```

**Step 2: 更新AlipayProvider**

```typescript
// backend/src/modules/payment-order/services/payment-providers/alipay.provider.ts

import { CertificateService } from '../certificate.service';

@Injectable()
export class AlipayProvider extends BasePaymentProvider {
  constructor(
    private certificateService: CertificateService,
  ) {
    super('AlipayProvider');
  }

  /**
   * 获取私钥
   */
  private getPrivateKey(): string {
    try {
      if (
        this.certificateService.certificateExists(
          'alipay',
          CertificateType.ALIPAY_PRIVATE_KEY,
        )
      ) {
        return this.certificateService.getCertificate(
          'alipay',
          CertificateType.ALIPAY_PRIVATE_KEY,
        );
      }

      return process.env.ALIPAY_PRIVATE_KEY || '';
    } catch (error) {
      this.logger.error('Failed to get Alipay private key');
      return '';
    }
  }

  /**
   * 获取支付宝公钥
   */
  private getAlipayPublicKey(): string {
    try {
      if (
        this.certificateService.certificateExists(
          'alipay',
          CertificateType.ALIPAY_PUBLIC_KEY,
        )
      ) {
        return this.certificateService.getCertificate(
          'alipay',
          CertificateType.ALIPAY_PUBLIC_KEY,
        );
      }

      return process.env.ALIPAY_PUBLIC_KEY || '';
    } catch (error) {
      this.logger.error('Failed to get Alipay public key');
      return '';
    }
  }
}
```

**Step 3: 注入CertificateService**

```typescript
// backend/src/modules/payment-order/payment-order.module.ts

@Module({
  providers: [
    WechatPayProvider,
    AlipayProvider,
    CertificateService,
  ],
})
export class PaymentOrderModule {}
```

**Step 4: 提交变更**

```bash
git add src/modules/payment-order/
git commit -m "feat: 微信/支付宝提供者使用证书服务

- 从文件或环境变量读取证书
- 降级策略：找不到时使用环境变量
- 统一的证书管理接口

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: 添加测试支付接口

**Files:**
- Create: `backend/src/modules/payment-order/controllers/test.controller.ts`

**Step 1: 创建测试控制器**

```typescript
// backend/src/modules/payment-order/controllers/test.controller.ts
import {
  Controller,
  Post,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentOrderService } from '../services/payment-order.service';
import { PrismaService } from '@/common/prisma/prisma.service';

@ApiTags('payment-test')
@Controller('payment-test')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentTestController {
  constructor(
    private config: ConfigService,
    private paymentService: PaymentOrderService,
    private prisma: PrismaService,
  ) {}

  @Post('pay/:orderNo')
  @ApiOperation({ summary: '测试支付（仅测试环境）' })
  async testPay(@Param('orderNo') orderNo: string) {
    // 检查是否为测试环境
    if (this.config.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Test endpoint is not available in production');
    }

    // 查找订单
    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderNo },
      include: {
        contract: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'paid') {
      return {
        message: 'Order already paid',
        order,
      };
    }

    // 模拟支付成功
    const updated = await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: 'paid',
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
          method: order.paymentMethod === 'wechat' ? '2' : '3',
          payTime: new Date(),
          status: 1,
        },
      });
    }

    return {
      message: 'Test payment successful',
      order: updated,
    };
  }

  @Post('reset/:orderNo')
  @ApiOperation({ summary: '重置订单状态（仅测试环境）' })
  async resetOrder(@Param('orderNo') orderNo: string) {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Test endpoint is not available in production');
    }

    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const updated = await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: 'pending',
        transactionId: null,
        paidAt: null,
      },
    });

    return {
      message: 'Order reset successfully',
      order: updated,
    };
  }
}
```

**Step 2: 注册控制器**

```typescript
// backend/src/modules/payment-order/payment-order.module.ts
import { PaymentTestController } from './controllers/test.controller';

@Module({
  controllers: [
    // ...existing controllers
    PaymentTestController,
  ],
})
export class PaymentOrderModule {}
```

**Step 3: 测试接口**

```bash
# 测试支付
curl -X POST http://localhost:7890/api/payment-test/pay/{orderNo}

# 重置订单
curl -X POST http://localhost:7890/api/payment-test/reset/{orderNo}
```

**Step 4: 提交变更**

```bash
git add src/modules/payment-order/controllers/test.controller.ts
git commit -m "feat: 添加支付测试接口

- POST /payment-test/pay/: 模拟支付成功
- POST /payment-test/reset/: 重置订单状态
- 仅在测试环境可用

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: 创建支付配置管理API

**Files:**
- Modify: `backend/src/modules/payment-order/controllers/payment-config.controller.ts`

**Step 1: 完善支付配置控制器**

```typescript
// backend/src/modules/payment-order/controllers/payment-config.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentConfigService } from '../services/payment-config.service';
import { CreatePaymentConfigDto, UpdatePaymentConfigDto } from '../dto/payment-config.dto';

@ApiTags('payment-configs')
@Controller('payment-configs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentConfigController {
  constructor(private paymentConfigService: PaymentConfigService) {}

  @Post()
  @ApiOperation({ summary: '创建支付配置' })
  async create(@Body() dto: CreatePaymentConfigDto) {
    return this.paymentConfigService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询所有支付配置' })
  async findAll() {
    return this.paymentConfigService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '查询支付配置详情' })
  async findOne(@Param('id') id: string) {
    return this.paymentConfigService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新支付配置' })
  async update(@Param('id') id: string, @Body() dto: UpdatePaymentConfigDto) {
    return this.paymentConfigService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除支付配置' })
  async remove(@Param('id') id: string) {
    return this.paymentConfigService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: '启用/禁用支付配置' })
  async toggle(@Param('id') id: string) {
    return this.paymentConfigService.toggleEnabled(id);
  }

  @Get('active/:paymentMethod')
  @ApiOperation({ summary: '获取激活的支付配置' })
  async getActiveConfig(@Param('paymentMethod') paymentMethod: string) {
    return this.paymentConfigService.getActiveConfig(paymentMethod);
  }
}
```

**Step 2: 测试支付配置API**

```bash
# 创建配置
curl -X POST http://localhost:7890/api/payment-configs \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "wechat",
    "environment": "mock",
    "enabled": true
  }'

# 查询激活的配置
curl http://localhost:7890/api/payment-configs/active/wechat
```

**Step 3: 提交变更**

```bash
git add src/modules/payment-order/
git commit -m "feat: 完善支付配置管理API

- 创建/查询/更新/删除配置
- 启用/禁用配置
- 查询激活的配置

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: 添加部署文档

**Files:**
- Create: `backend/certificates/README.md`

**Step 1: 创建证书目录说明文档**

```markdown
# 支付证书管理

## 目录结构

```
certificates/
├── wechat/
│   ├── development/        # 开发/测试环境
│   │   ├── apiclient_cert.p12
│   │   ├── apiclient_key.pem
│   │   ├── platform_public_key.pem
│   │   └── api_key.txt
│   └── production/         # 生产环境
│       └── ...
└── alipay/
    ├── development/
    │   ├── alipay_private_key.txt
    │   └── alipay_public_key.txt
    └── production/
        └── ...
```

## 证书获取

### 微信支付
1. 登录微信商户平台
2. 下载API证书
3. 获取API密钥
4. 保存到对应目录

### 支付宝
1. 登录支付宝开放平台
2. 生成RSA密钥对
3. 上传公钥到支付宝
4. 保存私钥到本地

## 文件权限

证书文件包含敏感信息，必须设置正确的权限：

```bash
chmod 600 certificates/*/*
chown app:app certificates/*/*
```

## 环境变量配置

如果不使用文件存储，可以通过环境变量配置：

```env
# 微信支付
WECHAT_APP_ID=xxx
WECHAT_MCH_ID=xxx
WECHAT_CERT_SERIAL_NO=xxx
WECHAT_APICLIENT_CERT=xxx
WECHAT_PRIVATE_KEY=xxx
WECHAT_PUBLIC_KEY=xxx
WECHAT_API_KEY=xxx

# 支付宝
ALIPAY_APP_ID=xxx
ALIPAY_PRIVATE_KEY=xxx
ALIPAY_PUBLIC_KEY=xxx
```

## 测试模式

开发环境无需证书，使用Mock模式：

```env
PAYMENT_MODE=mock
```
```

**Step 2: 创建证书目录**

```bash
mkdir -p certificates/wechat/development
mkdir -p certificates/wechat/production
mkdir -p certificates/alipay/development
mkdir -p certificates/alipay/production
```

**Step 3: 添加.gitignore**

```bash
# 证书文件不上传到Git
echo "certificates/" >> .gitignore
```

**Step 4: 提交文档**

```bash
git add certificates/README.md
git commit -m "docs: 添加支付证书管理说明

- 目录结构说明
- 证书获取指南
- 文件权限配置
- 环境变量配置

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

- ✅ Mock模式无需证书即可工作
- ✅ 证书从文件或环境变量读取
- ✅ 找不到证书时自动降级
- ✅ 测试接口模拟支付成功
- ✅ 证书管理API正常工作
- ✅ 生产模式正确加载证书
- ✅ 文档完整清晰

---

**预估时间**: 2天
