import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CryptoUtil } from '@/lib/crypto.util';
import { IPaymentConfigService, CreatePaymentConfigInput, UpdatePaymentConfigInput, QueryPaymentConfigInput } from '../interfaces/payment-config.interface';
import { PaymentConfig } from '@prisma/client';

@Injectable()
export class PaymentConfigService implements IPaymentConfigService {
  private readonly logger = new Logger(PaymentConfigService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建支付配置
   */
  async create(data: CreatePaymentConfigInput): Promise<PaymentConfig> {
    try {
      // 检查是否已存在相同配置
      const existing = await this.prisma.paymentConfig.findFirst({
        where: {
          paymentMethod: data.paymentMethod,
          paymentChannel: data.paymentChannel,
        },
      });

      if (existing) {
        throw new BadRequestException('该支付方式和渠道的配置已存在');
      }

      // 加密敏感信息
      const encryptedData = {
        ...data,
        appSecret: data.appSecret ? CryptoUtil.encrypt(data.appSecret) : null,
        apiKey: data.apiKey ? CryptoUtil.encrypt(data.apiKey) : null,
      };

      const config = await this.prisma.paymentConfig.create({
        data: encryptedData,
      });

      this.logger.log(`创建支付配置成功: ${config.id}`);
      return config;
    } catch (error) {
      this.logger.error(`创建支付配置失败: ${error.message}`);
      throw new BadRequestException(`创建配置失败: ${error.message}`);
    }
  }

  /**
   * 更新支付配置
   */
  async update(id: string, data: UpdatePaymentConfigInput): Promise<PaymentConfig> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`配置不存在: ${id}`);
    }

    try {
      const updateData: any = { ...data };

      // 如果提供了敏感信息，需要加密
      if (data.appSecret) {
        updateData.appSecret = CryptoUtil.encrypt(data.appSecret);
      }
      if (data.apiKey) {
        updateData.apiKey = CryptoUtil.encrypt(data.apiKey);
      }

      const config = await this.prisma.paymentConfig.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`更新支付配置成功: ${id}`);
      return config;
    } catch (error) {
      this.logger.error(`更新支付配置失败: ${error.message}`);
      throw new BadRequestException(`更新配置失败: ${error.message}`);
    }
  }

  /**
   * 删除配置
   */
  async delete(id: string): Promise<PaymentConfig> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`配置不存在: ${id}`);
    }

    try {
      const config = await this.prisma.paymentConfig.delete({
        where: { id },
      });

      this.logger.log(`删除支付配置成功: ${id}`);
      return config;
    } catch (error) {
      this.logger.error(`删除支付配置失败: ${error.message}`);
      throw new BadRequestException(`删除配置失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找配置
   */
  async findById(id: string): Promise<PaymentConfig | null> {
    try {
      const config = await this.prisma.paymentConfig.findUnique({
        where: { id },
      });
      return config;
    } catch (error) {
      this.logger.error(`查找配置失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 根据支付方式和渠道查找配置
   */
  async findByMethodAndChannel(paymentMethod: string, paymentChannel: string): Promise<PaymentConfig | null> {
    try {
      const config = await this.prisma.paymentConfig.findFirst({
        where: {
          paymentMethod,
          paymentChannel,
        },
      });
      return config;
    } catch (error) {
      this.logger.error(`查找配置失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 查询配置列表
   */
  async findAll(query: QueryPaymentConfigInput): Promise<PaymentConfig[]> {
    const { paymentMethod, paymentChannel } = query;
    const where: any = {};

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }
    if (paymentChannel) {
      where.paymentChannel = paymentChannel;
    }

    try {
      const configs = await this.prisma.paymentConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return configs;
    } catch (error) {
      this.logger.error(`查询配置列表失败: ${error.message}`);
      throw new BadRequestException(`查询失败: ${error.message}`);
    }
  }

  /**
   * 获取启用的配置
   */
  async getActiveConfig(paymentMethod: string, paymentChannel: string): Promise<PaymentConfig | null> {
    try {
      const config = await this.prisma.paymentConfig.findFirst({
        where: {
          paymentMethod,
          paymentChannel,
          status: 1,
        },
      });
      return config;
    } catch (error) {
      this.logger.error(`获取启用配置失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 解密敏感信息
   */
  async decryptSensitiveInfo(config: PaymentConfig): Promise<PaymentConfig> {
    const decrypted = { ...config };

    if (config.appSecret) {
      try {
        decrypted.appSecret = CryptoUtil.decrypt(config.appSecret);
      } catch (error) {
        this.logger.warn(`解密 appSecret 失败: ${error.message}`);
      }
    }

    if (config.apiKey) {
      try {
        decrypted.apiKey = CryptoUtil.decrypt(config.apiKey);
      } catch (error) {
        this.logger.warn(`解密 apiKey 失败: ${error.message}`);
      }
    }

    return decrypted;
  }
}
