import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class CustomerRuleService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有客户规则
   */
  async findAll() {
    return this.prisma.customerRule.findMany({
      orderBy: [{ code: "asc" }],
    });
  }

  /**
   * 获取单个规则（通过 code）
   */
  async findByCode(code: string) {
    return this.prisma.customerRule.findUnique({
      where: { code },
    });
  }

  /**
   * 获取单个规则（通过 ID）
   */
  async findOne(id: number) {
    return this.prisma.customerRule.findUnique({
      where: { id },
    });
  }

  /**
   * 创建新规则
   * 注意：仅用于初始化预设规则，不允许手动添加预设规则之外的规则
   */
  async create(data: {
    code: string;
    title: string;
    description?: string;
    daysValue: number;
    enabled?: boolean;
  }) {
    // 检查 code 是否已存在
    const existing = await this.prisma.customerRule.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(`规则 code "${data.code}" 已存在`);
    }

    return this.prisma.customerRule.create({
      data,
    });
  }

  /**
   * 更新规则
   */
  async update(
    id: number,
    data: {
      title?: string;
      description?: string;
      daysValue?: number;
      enabled?: boolean;
    },
  ) {
    return this.prisma.customerRule.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除规则（谨慎使用）
   */
  async remove(id: number) {
    return this.prisma.customerRule.delete({
      where: { id },
    });
  }
}
