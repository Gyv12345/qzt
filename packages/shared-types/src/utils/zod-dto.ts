import { z } from 'zod'

/**
 * Zod Schema 错误类型
 */
export class ZodValidationError extends Error {
  constructor(public issues: z.ZodError['issues']) {
    super('Validation failed')
    this.name = 'ZodValidationError'
  }

  /** @deprecated Use `issues` instead */
  get errors() {
    return this.issues
  }
}

/**
 * 从 Zod Schema 创建 NestJS DTO 类
 *
 * 使用示例：
 * ```ts
 * export class CreateCustomerDto extends createZodDto(createCustomerSchema) {}
 * ```
 */
export function createZodDto<T extends z.ZodTypeAny>(schema: T) {
  class ZodDto {
    /**
     * 验证并解析数据
     */
    static validate(obj: unknown): z.infer<T> {
      const result = schema.safeParse(obj)
      if (!result.success) {
        throw new ZodValidationError(result.error.issues)
      }
      return result.data
    }

    /**
     * 安全验证，返回结果而不是抛出异常
     */
    static safeValidate(obj: unknown): {
      success: boolean
      data?: z.infer<T>
      issues?: z.ZodError['issues']
      /** @deprecated Use `issues` instead */
      errors?: z.ZodError['issues']
    } {
      const result = schema.safeParse(obj)
      if (result.success) {
        return { success: true, data: result.data }
      }
      const issues = result.error.issues
      return { success: false, issues, errors: issues }
    }
  }

  // 存储Schema供外部使用
  ;(ZodDto as any).schema = schema

  return ZodDto
}

/**
 * 获取 DTO 关联的 Zod Schema
 */
export function getDtoSchema(dtoClass: new () => any): z.ZodTypeAny | undefined {
  return (dtoClass as any).schema
}

/**
 * 验证装饰器工厂 - 用于在 NestJS 中使用 Zod 验证
 *
 * 使用示例：
 * ```ts
 * export class UpdateCustomerDto {
 *   @ZodValidate(updateCustomerSchema)
 *   body: any
 * }
 * ```
 */
export function ZodValidate(schema: z.ZodTypeAny) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = function (...args: any[]) {
      const [dto] = args
      const result = schema.safeParse(dto)
      if (!result.success) {
        throw new ZodValidationError(result.error.issues)
      }
      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}
