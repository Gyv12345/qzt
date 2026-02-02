import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建产品
   */
  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...createProductDto,
      },
    });
  }

  /**
   * 查询产品列表
   */
  async findAll(query: QueryProductDto) {
    const { page = 0, pageSize = 10, keyword, status } = query;
    const where: any = {};

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    // 状态筛选
    if (status !== undefined) {
      where.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      data,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }

  /**
   * 获取产品详情
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`产品 ID ${id} 不存在`);
    }

    return product;
  }

  /**
   * 更新产品
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    // 检查产品是否存在
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  /**
   * 删除产品
   */
  async remove(id: string) {
    // 检查产品是否存在
    await this.findOne(id);

    return this.prisma.product.delete({
      where: { id },
    });
  }

  /**
   * 获取所有启用的产品（用于下拉选择）
   */
  async findActive() {
    return this.prisma.product.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        price: true,
      },
    });
  }
}
