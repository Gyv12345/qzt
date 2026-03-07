import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class CommonPhraseService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取常用语列表
   */
  async findAll(userId?: string) {
    const where: any = {};

    if (userId) {
      where.OR = [
        { userId }, // 个人常用语
        { userId: null }, // 系统常用语
      ];
    } else {
      // 如果不指定用户,只返回系统常用语
      where.userId = null;
    }

    // SQLite 需要特殊处理 NULL 值查询
    // Prisma 会自动转换 userId: null 为 IS NULL 查询
    return this.prisma.commonPhrase.findMany({
      where,
      orderBy: [{ useCount: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * 创建常用语
   */
  async create(
    userId: string,
    content: string,
    category?: string,
    isSystem?: boolean,
  ) {
    return this.prisma.commonPhrase.create({
      data: {
        userId: isSystem ? null : userId,
        content,
        category: category || "OTHER",
        useCount: 0,
        isSystem: isSystem || false,
      },
    });
  }

  /**
   * 更新常用语
   */
  async update(id: string, content?: string, category?: string) {
    return this.prisma.commonPhrase.update({
      where: { id },
      data: {
        ...(content && { content }),
        ...(category && { category }),
      },
    });
  }

  /**
   * 删除常用语
   */
  async remove(id: string) {
    await this.prisma.commonPhrase.delete({
      where: { id },
    });

    return { message: "Common phrase deleted successfully" };
  }

  /**
   * 增加使用次数
   */
  async incrementUseCount(id: string) {
    return this.prisma.commonPhrase.update({
      where: { id },
      data: {
        useCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * 搜索常用语
   */
  async search(keyword: string, userId?: string) {
    const where: any = {
      AND: [
        {
          OR: [
            { content: { contains: keyword } },
            { category: { contains: keyword } },
          ],
        },
      ],
    };

    if (userId) {
      where.AND.push({
        OR: [{ userId }, { userId: null }],
      });
    }

    return this.prisma.commonPhrase.findMany({
      where,
      orderBy: { useCount: "desc" },
      take: 20,
    });
  }
}
