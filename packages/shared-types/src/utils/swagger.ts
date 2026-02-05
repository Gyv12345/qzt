/**
 * Swagger 装饰器生成工具
 *
 * 为从 Zod Schema 创建的 DTO 添加 @ApiProperty 装饰器
 * 确保Swagger 能正确展示类型信息
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { ApiPropertyOptions } from '@nestjs/swagger'
import { z } from 'zod'

/**
 * 从 Zod Schema 提取 Swagger 配置
 */
function extractSwaggerConfig(zodType: z.ZodTypeAny): ApiPropertyOptions {
  const config: ApiPropertyOptions = {}

  // 处理枚举
  if (zodType instanceof z.ZodEnum) {
    config.enum = zodType.options
    config.type = 'enum' as any
    return config
  }

  // 处理字符串
  if (zodType instanceof z.ZodString) {
    config.type = String
    // 检查是否有 URL 验证
    const checks = zodType._def.checks || []
    for (const check of checks) {
      if (check.kind === 'url') {
        config.format = 'url'
      }
    }
    return config
  }

  // 处理数字
  if (zodType instanceof z.ZodNumber) {
    config.type = Number
    return config
  }

  // 处理布尔
  if (zodType instanceof z.ZodBoolean) {
    config.type = Boolean
    return config
  }

  // 处理日期
  if (zodType instanceof z.ZodDate) {
    config.type = Date
    return config
  }

  // 处理数组
  if (zodType instanceof z.ZodArray) {
    config.type = extractSwaggerConfig(zodType.element).type
    config.isArray = true
    return config
  }

  // 处理可选
  if (zodType instanceof z.ZodOptional) {
    return extractSwaggerConfig(zodType._def.innerType)
  }

  // 处理默认值
  if (zodType instanceof z.ZodDefault) {
    return extractSwaggerConfig(zodType._def.innerType)
  }

  // 处理 coerce（类型转换）
  if (zodType instanceof z.ZodEffects) {
    return extractSwaggerConfig(zodType._def.schema)
  }

  // 处理对象
  if (zodType instanceof z.ZodObject) {
    config.type = 'object' as any
    return config
  }

  // 默认返回 any
  return config
}

/**
 * 判断 Zod 类型是否可选
 */
export function isOptional(zodType: z.ZodTypeAny): boolean {
  if (zodType instanceof z.ZodOptional) return true
  if (zodType instanceof z.ZodDefault) return true
  if (zodType.isOptional?.()) return true
  return false
}

/**
 * 为 DTO 类添加 Swagger 装饰器
 *
 * 使用示例：
 * ```ts
 * // shared-types/src/customer/dtos/create-customer.dto.ts
 * export class CreateCustomerDto extends createZodDto(createCustomerSchema) {}
 *
 * // backend/src/modules/customer/dto/create-customer.dto.ts
 * export { CreateCustomerDto } from '@qzt/shared-types/customer'
 * export const CreateCustomerDtoWithSwagger = applySwaggerDecorators(CreateCustomerDto, createCustomerSchema, {
 *   name: { description: '公司名称', example: 'XX科技有限公司' },
 *   shortName: { description: '公司简称' },
 * })
 * ```
 */
export function applySwaggerDecorators<T extends { new (...args: any[]): any }>(
  DTOClass: T,
  schema: z.ZodTypeAny,
  customMetadata?: Record<string, Partial<ApiPropertyOptions>>,
): T {
  // 如果 schema 不是对象类型，直接返回原类
  if (!(schema instanceof z.ZodObject)) {
    return DTOClass
  }

  const shape = schema.shape

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const optional = isOptional(fieldSchema as z.ZodTypeAny)
    const swaggerConfig = extractSwaggerConfig(fieldSchema as z.ZodTypeAny)
    const custom = customMetadata?.[key] || {}

    // 合并配置
    const finalConfig: ApiPropertyOptions = {
      ...swaggerConfig,
      ...custom,
      required: !optional,
    }

    // 创建装饰器
    const decorator = optional
      ? ApiPropertyOptional(finalConfig)
      : ApiProperty(finalConfig)

    // 应用装饰器到原型
    decorator(DTOClass.prototype, key)
  }

  return DTOClass
}

/**
 * 快速创建带 Swagger 装饰器的 DTO
 *
 * 使用示例：
 * ```ts
 * export const CreateCustomerDto = createDtoWithSwagger(
 *   'CreateCustomerDto',
 *   createCustomerSchema,
 *   {
 *     name: { description: '公司名称', example: 'XX科技有限公司' },
 *     shortName: { description: '公司简称' },
 *   }
 * )
 * ```
 */
export function createDtoWithSwagger(
  className: string,
  schema: z.ZodObject<any>,
  customMetadata?: Record<string, Partial<ApiPropertyOptions>>,
) {
  // 创建动态类
  class DynamicDto {
    /**
     * 验证并解析数据
     */
    static validate(obj: unknown) {
      const result = schema.safeParse(obj)
      if (!result.success) {
        throw new Error(JSON.stringify(result.error.errors))
      }
      return result.data
    }

    /**
     * 安全验证
     */
    static safeValidate(obj: unknown) {
      const result = schema.safeParse(obj)
      if (result.success) {
        return { success: true, data: result.data }
      }
      return { success: false, errors: result.error.errors }
    }
  }

  // 设置类名
  Object.defineProperty(DynamicDto, 'name', { value: className })

  // 存储 Schema
  ;(DynamicDto as any).schema = schema

  const shape = schema.shape

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const optional = isOptional(fieldSchema as z.ZodTypeAny)
    const swaggerConfig = extractSwaggerConfig(fieldSchema as z.ZodTypeAny)
    const custom = customMetadata?.[key] || {}

    // 合并配置
    const finalConfig: ApiPropertyOptions = {
      ...swaggerConfig,
      ...custom,
      required: !optional,
    }

    // 添加装饰器
    const decorator = optional
      ? ApiPropertyOptional(finalConfig)
      : ApiProperty(finalConfig)

    decorator(DynamicDto.prototype, key)

    // 添加属性类型定义（用于 TypeScript）
    Object.defineProperty(DynamicDto.prototype, key, {
      writable: true,
      enumerable: true,
      configurable: true,
    })
  }

  return DynamicDto as any
}

/**
 * 导出工具函数
 */
export { extractSwaggerConfig as zodToSwaggerConfig }
