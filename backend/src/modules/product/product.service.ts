import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductDto } from "./dto/query-product.dto";
import { CreateProductFlowDto } from "./dto/create-product-flow.dto";
import { UpdateProductFlowDto } from "./dto/update-product-flow.dto";

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async findAll(query: QueryProductDto) {
    const { page = 1, pageSize = 10, keyword, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
      ];
    }

    if (status !== undefined) {
      where.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      total,
      data,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        flows: {
          where: { enabled: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: "Product deleted successfully" };
  }

  // ==================== 产品流程管理 ====================

  async createFlow(createFlowDto: CreateProductFlowDto) {
    // 验证产品是否存在
    const product = await this.prisma.product.findUnique({
      where: { id: createFlowDto.productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Product #${createFlowDto.productId} not found`,
      );
    }

    return this.prisma.productFlow.create({
      data: createFlowDto,
    });
  }

  async findFlows(productId?: string) {
    const where = productId ? { productId } : {};

    return this.prisma.productFlow.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findFlow(id: string) {
    const flow = await this.prisma.productFlow.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException(`ProductFlow #${id} not found`);
    }

    return flow;
  }

  async updateFlow(id: string, updateFlowDto: UpdateProductFlowDto) {
    const flow = await this.prisma.productFlow.findUnique({
      where: { id },
    });

    if (!flow) {
      throw new NotFoundException(`ProductFlow #${id} not found`);
    }

    return this.prisma.productFlow.update({
      where: { id },
      data: updateFlowDto,
    });
  }

  async removeFlow(id: string) {
    const flow = await this.prisma.productFlow.findUnique({
      where: { id },
    });

    if (!flow) {
      throw new NotFoundException(`ProductFlow #${id} not found`);
    }

    await this.prisma.productFlow.delete({
      where: { id },
    });

    return { message: "ProductFlow deleted successfully" };
  }
}
