import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ContractTemplateService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有合同模板
   */
  async findAll() {
    return this.prisma.contractTemplate.findMany({
      where: { status: 1 },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取模板详情
   */
  async findOne(id: string) {
    return this.prisma.contractTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * 创建合同模板
   */
  async create(data: {
    name: string;
    code: string;
    content: string;
    variables?: string;
    description?: string;
  }) {
    return this.prisma.contractTemplate.create({
      data,
    });
  }

  /**
   * 更新合同模板
   */
  async update(id: string, data: {
    name?: string;
    content?: string;
    variables?: string;
    description?: string;
    status?: number;
  }) {
    return this.prisma.contractTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除合同模板
   */
  async remove(id: string) {
    // 检查是否有合同使用此模板
    const contractCount = await this.prisma.contract.count({
      where: { templateId: id },
    });

    if (contractCount > 0) {
      throw new Error('该模板正在被使用，无法删除');
    }

    return this.prisma.contractTemplate.delete({
      where: { id },
    });
  }

  /**
   * 预览合同（替换变量）
   */
  async preview(id: string, variables: Record<string, any>) {
    const template = await this.prisma.contractTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('模板不存在');
    }

    let content = template.content;

    // 替换变量占位符 {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      content = content.replace(regex, value);
    }

    return {
      ...template,
      previewContent: content,
    };
  }

  /**
   * 获取模板变量定义
   */
  async getVariables(id: string) {
    const template = await this.prisma.contractTemplate.findUnique({
      where: { id },
      select: { variables: true },
    });

    if (!template) {
      throw new Error('模板不存在');
    }

    try {
      return JSON.parse(template.variables || '[]');
    } catch {
      return [];
    }
  }
}
