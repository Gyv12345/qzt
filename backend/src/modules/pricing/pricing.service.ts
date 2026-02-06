import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  CreatePricingRuleDto,
  PricingRuleType,
} from "./dto/create-pricing-rule.dto";
import { UpdatePricingRuleDto } from "./dto/update-pricing-rule.dto";
import { CalculatePriceDto } from "./dto/calculate-price.dto";

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建定价规则
   */
  async create(createPricingRuleDto: CreatePricingRuleDto) {
    const { productId, tiers, ...ruleData } = createPricingRuleDto;

    // 验证产品是否存在
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException("产品不存在");
    }

    // 创建定价规则和阶梯
    const pricingRule = await this.prisma.pricingRule.create({
      data: {
        ...ruleData,
        product: {
          connect: { id: productId },
        },
        tiers: {
          create: tiers,
        },
      },
      include: {
        tiers: {
          orderBy: { order: "asc" },
        },
        product: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return pricingRule;
  }

  /**
   * 查询所有定价规则
   */
  async findAll(productId?: string) {
    const where = productId ? { productId } : {};

    return this.prisma.pricingRule.findMany({
      where,
      include: {
        tiers: {
          orderBy: { order: "asc" },
        },
        product: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * 查询单个定价规则
   */
  async findOne(id: string) {
    const pricingRule = await this.prisma.pricingRule.findUnique({
      where: { id },
      include: {
        tiers: {
          orderBy: { order: "asc" },
        },
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            price: true,
          },
        },
      },
    });

    if (!pricingRule) {
      throw new NotFoundException("定价规则不存在");
    }

    return pricingRule;
  }

  /**
   * 更新定价规则
   */
  async update(id: string, updatePricingRuleDto: UpdatePricingRuleDto) {
    const { tiers, ...ruleData } = updatePricingRuleDto;

    // 验证规则是否存在
    await this.findOne(id);

    // 如果更新阶梯,需要先删除旧的阶梯
    if (tiers && tiers.length > 0) {
      await this.prisma.pricingTier.deleteMany({
        where: { pricingRuleId: id },
      });
    }

    return this.prisma.pricingRule.update({
      where: { id },
      data: {
        ...ruleData,
        ...(tiers && {
          tiers: {
            create: tiers,
          },
        }),
      },
      include: {
        tiers: {
          orderBy: { order: "asc" },
        },
      },
    });
  }

  /**
   * 删除定价规则
   */
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.pricingRule.delete({
      where: { id },
    });
  }

  /**
   * 计算服务价格(核心功能)
   */
  async calculatePrice(dto: CalculatePriceDto) {
    const { contractId, invoiceAmount, invoiceCount = 0 } = dto;

    // 查询合同信息
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        product: true,
      },
    });

    if (!contract) {
      throw new NotFoundException("合同不存在");
    }

    const { product } = contract;

    // 获取产品的定价规则(取最新的生效规则)
    const pricingRule = await this.prisma.pricingRule.findFirst({
      where: {
        productId: product.id,
        status: 1,
        effectiveDate: { lte: new Date() },
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
      },
      include: {
        tiers: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: {
        effectiveDate: "desc",
      },
    });

    if (!pricingRule) {
      // 没有定价规则,返回产品基础价格
      return {
        contractId,
        productId: product.id,
        productName: product.name,
        basePrice: product.price,
        finalPrice: product.price,
        additionalPrice: 0,
        ruleType: "FIXED",
        ruleName: "固定价格",
      };
    }

    // 根据不同规则类型计算价格
    const result = await this.calculateByRuleType(
      pricingRule.ruleType as PricingRuleType,
      pricingRule,
      product.price,
      invoiceAmount,
      invoiceCount,
    );

    return {
      contractId,
      productId: product.id,
      productName: product.name,
      basePrice: product.price,
      finalPrice: result.finalPrice,
      additionalPrice: result.additionalPrice,
      ruleType: pricingRule.ruleType,
      ruleName: pricingRule.name,
      matchedTier: result.matchedTier,
    };
  }

  /**
   * 根据规则类型计算价格
   */
  private async calculateByRuleType(
    ruleType: PricingRuleType,
    pricingRule: any,
    basePrice: number,
    invoiceAmount: number,
    invoiceCount: number,
  ) {
    const tiers = pricingRule.tiers;

    switch (ruleType) {
      case PricingRuleType.AMOUNT_TIER:
        return this.calculateByAmountTier(tiers, invoiceAmount);

      case PricingRuleType.COUNT_TIER:
        return this.calculateByCountTier(tiers, invoiceCount);

      case PricingRuleType.ZERO_DECLARATION:
        return this.calculateZeroDeclaration(tiers, invoiceCount);

      default:
        return {
          finalPrice: basePrice,
          additionalPrice: 0,
          matchedTier: null,
        };
    }
  }

  /**
   * 按金额阶梯计算
   */
  private calculateByAmountTier(tiers: any[], invoiceAmount: number) {
    // 找到匹配的阶梯
    const matchedTier = tiers.find(
      (tier) =>
        invoiceAmount >= tier.minThreshold &&
        (!tier.maxThreshold || invoiceAmount <= tier.maxThreshold),
    );

    if (!matchedTier) {
      // 没有匹配的阶梯,使用基础价格
      return {
        finalPrice: 0,
        additionalPrice: 0,
        matchedTier: null,
      };
    }

    return {
      finalPrice: matchedTier.price,
      additionalPrice: matchedTier.additionalPrice || 0,
      matchedTier: {
        minThreshold: matchedTier.minThreshold,
        maxThreshold: matchedTier.maxThreshold,
        price: matchedTier.price,
        description: matchedTier.description,
      },
    };
  }

  /**
   * 按次数阶梯计算
   */
  private calculateByCountTier(tiers: any[], invoiceCount: number) {
    // 找到匹配的阶梯
    const matchedTier = tiers.find(
      (tier) =>
        invoiceCount >= tier.minThreshold &&
        (!tier.maxThreshold || invoiceCount <= tier.maxThreshold),
    );

    if (!matchedTier) {
      return {
        finalPrice: 0,
        additionalPrice: 0,
        matchedTier: null,
      };
    }

    return {
      finalPrice: matchedTier.price,
      additionalPrice: matchedTier.additionalPrice || 0,
      matchedTier: {
        minThreshold: matchedTier.minThreshold,
        maxThreshold: matchedTier.maxThreshold,
        price: matchedTier.price,
        description: matchedTier.description,
      },
    };
  }

  /**
   * 零申报模式计算
   */
  private calculateZeroDeclaration(tiers: any[], invoiceCount: number) {
    // 零申报:前N次免费,超过后按次收费
    const freeTier = tiers[0]; // 第一阶梯:免费次数
    const paidTier = tiers[1]; // 第二阶梯:超额价格

    if (!freeTier || !paidTier) {
      throw new BadRequestException("零申报规则配置错误,需要两个阶梯");
    }

    const freeCount = freeTier.minThreshold; // 免费次数
    const overPrice = paidTier.price; // 超额单价

    if (invoiceCount <= freeCount) {
      // 未超出免费次数
      return {
        finalPrice: 0,
        additionalPrice: 0,
        matchedTier: freeTier,
      };
    } else {
      // 超出免费次数,计算超额费用
      const overCount = invoiceCount - freeCount;
      const totalPrice = overCount * overPrice;

      return {
        finalPrice: totalPrice,
        additionalPrice: totalPrice,
        matchedTier: paidTier,
        overCount,
      };
    }
  }

  /**
   * 查询产品的定价规则
   */
  async findByProduct(productId: string) {
    return this.prisma.pricingRule.findMany({
      where: { productId },
      include: {
        tiers: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: {
        effectiveDate: "desc",
      },
    });
  }
}
