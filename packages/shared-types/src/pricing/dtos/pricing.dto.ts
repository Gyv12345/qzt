import { createZodDto } from '../../utils'
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  pricingRuleSchema,
  calculatePriceSchema,
} from '../schemas'

/**
 * 创建定价规则 DTO
 */
export class CreatePricingRuleDto extends createZodDto(createPricingRuleSchema) {}

/**
 * 更新定价规则 DTO
 */
export class UpdatePricingRuleDto extends createZodDto(updatePricingRuleSchema) {}

/**
 * 定价规则实体 DTO
 */
export class PricingRuleDto extends createZodDto(pricingRuleSchema) {}

/**
 * 计算价格请求 DTO
 */
export class CalculatePriceDto extends createZodDto(calculatePriceSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  pricingRuleSchema,
  calculatePriceSchema,
} from '../schemas'
