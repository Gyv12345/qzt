import { createZodDto } from '../../utils'
import {
  createProductSchema,
  updateProductSchema,
  queryProductSchema,
  productSchema,
} from '../schemas'

/**
 * 创建产品 DTO
 */
export class CreateProductDto extends createZodDto(createProductSchema) {}

/**
 * 更新产品 DTO
 */
export class UpdateProductDto extends createZodDto(updateProductSchema) {}

/**
 * 查询产品 DTO
 */
export class QueryProductDto extends createZodDto(queryProductSchema) {}

/**
 * 产品实体 DTO
 */
export class ProductDto extends createZodDto(productSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createProductSchema,
  updateProductSchema,
  queryProductSchema,
  productSchema,
} from '../schemas'
