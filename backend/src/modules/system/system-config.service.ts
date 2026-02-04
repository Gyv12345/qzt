import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有系统配置
   */
  async findAll(category?: string) {
    const where = category ? { category } : {};

    return this.prisma.systemConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * 获取单个配置
   */
  async findOne(key: string) {
    return this.prisma.systemConfig.findUnique({
      where: { key },
    });
  }

  /**
   * 获取公开配置（前端可访问）
   */
  async findPublic() {
    return this.prisma.systemConfig.findMany({
      where: { isPublic: true },
      select: {
        key: true,
        value: true,
        category: true,
      },
    });
  }

  /**
   * 创建或更新配置
   */
  async upsert(key: string, data: {
    value: string;
    category: string;
    description?: string;
    isPublic?: boolean;
    updatedBy?: string;
  }) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: {
        value: data.value,
        description: data.description,
        isPublic: data.isPublic,
        updatedBy: data.updatedBy,
      },
      create: {
        key,
        value: data.value,
        category: data.category,
        description: data.description,
        isPublic: data.isPublic ?? false,
        updatedBy: data.updatedBy,
      },
    });
  }

  /**
   * 批量更新配置
   */
  async batchUpdate(configs: Array<{
    key: string;
    value: string;
    category: string;
    description?: string;
    isPublic?: boolean;
  }>, updatedBy?: string) {
    const results = [];

    for (const config of configs) {
      const result = await this.upsert(config.key, {
        ...config,
        updatedBy,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * 删除配置
   */
  async remove(key: string) {
    return this.prisma.systemConfig.delete({
      where: { key },
    });
  }

  /**
   * 获取基础配置（系统名称、Logo等）
   */
  async getBasicConfig() {
    const configs = await this.prisma.systemConfig.findMany({
      where: { category: 'basic' },
    });

    const configMap: Record<string, any> = {};
    for (const config of configs) {
      try {
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        configMap[config.key] = config.value;
      }
    }

    return configMap;
  }
}
