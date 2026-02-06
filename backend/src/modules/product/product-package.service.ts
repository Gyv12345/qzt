import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";

@Injectable()
export class ProductPackageService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有产品套餐
   */
  async findAll(includeProducts?: boolean) {
    return this.prisma.productPackage.findMany({
      where: { status: 1 },
      orderBy: { createdAt: "desc" },
      include: includeProducts
        ? {
            products: {
              select: {
                id: true,
                name: true,
                code: true,
                price: true,
                description: true,
              },
            },
          }
        : undefined,
    });
  }

  /**
   * 获取套餐详情
   */
  async findOne(id: string) {
    return this.prisma.productPackage.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            package: true,
          },
        },
      },
    });
  }

  /**
   * 创建产品套餐
   */
  async create(data: {
    name: string;
    code: string;
    description?: string;
    discount?: number;
    duration?: number;
    productIds?: string[];
  }) {
    const { productIds, ...packageData } = data;

    return this.prisma.productPackage.create({
      data: {
        ...packageData,
        ...(productIds && {
          products: {
            connect: productIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        products: true,
      },
    });
  }

  /**
   * 更新产品套餐
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      discount?: number;
      duration?: number;
      productIds?: string[];
      status?: number;
    },
  ) {
    const { productIds, ...packageData } = data;

    // 如果更新产品列表，先断开旧关联
    if (productIds !== undefined) {
      await this.prisma.productPackage.update({
        where: { id },
        data: {
          products: {
            set: [],
          },
        },
      });
    }

    return this.prisma.productPackage.update({
      where: { id },
      data: {
        ...packageData,
        ...(productIds && {
          products: {
            connect: productIds.map((pid) => ({ id: pid })),
          },
        }),
      },
      include: {
        products: true,
      },
    });
  }

  /**
   * 删除产品套餐
   */
  async remove(id: string) {
    // 检查是否有产品使用此套餐
    const packageWithProducts = await this.prisma.productPackage.findUnique({
      where: { id },
      include: {
        products: {
          select: { id: true },
        },
      },
    });

    if (!packageWithProducts) {
      throw new Error("套餐不存在");
    }

    if (packageWithProducts.products.length > 0) {
      throw new Error("套餐中还有产品，无法删除");
    }

    return this.prisma.productPackage.delete({
      where: { id },
    });
  }

  /**
   * 添加产品到套餐
   */
  async addProduct(packageId: string, productId: string) {
    // 先检查产品是否已在其他套餐中
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { packageId: true },
    });

    if (existingProduct?.packageId) {
      throw new Error("该产品已属于其他套餐");
    }

    return this.prisma.productPackage.update({
      where: { id: packageId },
      data: {
        products: {
          connect: { id: productId },
        },
      },
      include: {
        products: true,
      },
    });
  }

  /**
   * 从套餐中移除产品
   */
  async removeProduct(packageId: string, productId: string) {
    return this.prisma.productPackage.update({
      where: { id: packageId },
      data: {
        products: {
          disconnect: { id: productId },
        },
      },
      include: {
        products: true,
      },
    });
  }
}
