import { z } from 'zod'

/**
 * 定价规则类型枚举
 */
export const pricingRuleTypeSchema = z.enum(['AMOUNT_TIER', 'COUNT_TIER', 'ZERO_DECLARATION'], {
  message: '定价规则类型必须是 AMOUNT_TIER、COUNT_TIER 或 ZERO_DECLARATION',
})

export type PricingRuleType = z.infer<typeof pricingRuleTypeSchema>

/**
 * 定价阶梯 Schema
 */
export const pricingTierSchema = z.object({
  minThreshold: z.number().min(0, '最小阈值必须大于等于0'),
  maxThreshold: z.number().min(0, '最大阈值必须大于等于0').optional(),
  price: z.number().min(0, '价格必须大于等于0'),
  additionalPrice: z.number().min(0, '额外价格必须大于等于0').optional(),
  description: z.string().optional(),
  order: z.number().int().min(0, '排序值必须大于等于0'),
})

export type PricingTier = z.infer<typeof pricingTierSchema>

/**
 * 基础定价规则 Schema
 */
export const pricingRuleBaseSchema = z.object({
  productId: z.string().cuid('请选择有效的产品'),
  name: z.string().min(1, '规则名称不能为空').max(100, '规则名称最多100个字符'),
  ruleType: pricingRuleTypeSchema,
  tiers: z.array(pricingTierSchema).min(1, '至少需要一个定价阶梯'),
  expiryDate: z.coerce.date().optional(),
})

export type PricingRuleBase = z.infer<typeof pricingRuleBaseSchema>

/**
 * 完整定价规则 Schema
 */
export const pricingRuleSchema = pricingRuleBaseSchema.extend({
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PricingRule = z.infer<typeof pricingRuleSchema>

/**
 * 创建定价规则 DTO Schema
 */
export const createPricingRuleSchema = pricingRuleBaseSchema

/**
 * 更新定价规则 DTO Schema
 */
export const updatePricingRuleSchema = pricingRuleBaseSchema.partial()

/**
 * 定价规则类型映射（用于显示）
 */
export const pricingRuleTypeMap: Record<PricingRuleType, string> = {
  AMOUNT_TIER: '按金额阶梯',
  COUNT_TIER: '按次数计费',
  ZERO_DECLARATION: '零申报',
}

/**
 * 获取定价规则类型显示名称
 */
export function getPricingRuleTypeLabel(type: PricingRuleType): string {
  return pricingRuleTypeMap[type]
}

/**
 * 价格计算请求 Schema
 */
export const calculatePriceSchema = z.object({
  productId: z.string().cuid('请选择有效的产品'),
  amount: z.number().min(0, '金额必须大于等于0').optional(),
  count: z.number().int().min(0, '次数必须大于等于0').optional(),
})

export type CalculatePriceParams = z.infer<typeof calculatePriceSchema>

/**
 * 价格计算响应 Schema
 */
export const priceResultSchema = z.object({
  productId: z.string().cuid(),
  originalPrice: z.number(),
  finalPrice: z.number(),
  discount: z.number().optional(),
  appliedRule: z.string().optional(),
})

export type PriceResult = z.infer<typeof priceResultSchema>
