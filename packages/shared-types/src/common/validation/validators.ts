import { z } from 'zod'

/**
 * 共享的 Zod v4 验证器
 *
 * 用于前后端共享的验证逻辑
 * 所有错误消息为键，由各层自行替换为实际 i18n 消息
 */

/**
 * 验证消息键（用于 i18n 映射）
 */
export const ValidationMessageKeys = {
  EMAIL_INVALID: 'validation.string.email',
  PHONE_INVALID: 'validation.string.phone',
  URL_INVALID: 'validation.string.url',
  CUID_INVALID: 'validation.string.cuid',
  STRING_REQUIRED: 'validation._required',
  STRING_MIN: 'validation.string.min',
  STRING_MAX: 'validation.string.max',
  NUMBER_POSITIVE: 'validation.number.positive',
  NUMBER_NONNEGATIVE: 'validation.number.nonnegative',
  ENUM_INVALID: 'validation.enum.invalid',
} as const

/**
 * 创建带消息键的验证器
 * 消息键会被各层（前端/后端）替换为实际 i18n 消息
 */
export const createValidators = (t: (key: string, params?: Record<string, unknown>) => string) => ({
  /**
   * 邮箱验证
   */
  email: () =>
    z.string().min(1, { error: t(ValidationMessageKeys.STRING_REQUIRED) })
      .email({ error: t(ValidationMessageKeys.EMAIL_INVALID) }),

  /**
   * 手机号验证（中国大陆）
   */
  phone: () =>
    z.string().min(1, { error: t(ValidationMessageKeys.STRING_REQUIRED) })
      .regex(/^1[3-9]\d{9}$/, { error: t(ValidationMessageKeys.PHONE_INVALID) }),

  /**
   * URL 验证
   */
  url: () =>
    z.string().optional()
      .refine(
        (val) => !val || /^(https?:\/\/)/.test(val),
        { error: t(ValidationMessageKeys.URL_INVALID) }
      )
      .or(z.literal('')),

  /**
   * CUID 验证
   */
  cuid: (message?: string) =>
    z.string().cuid({ error: message || t(ValidationMessageKeys.CUID_INVALID) }),

  /**
   * 必填字符串
   */
  requiredString: (min = 1, max = 100) =>
    z.string()
      .min(min, { error: t(ValidationMessageKeys.STRING_MIN, { min }) })
      .max(max, { error: t(ValidationMessageKeys.STRING_MAX, { max }) }),

  /**
   * 正数验证
   */
  positiveNumber: () =>
    z.number({ error: t(ValidationMessageKeys.NUMBER_POSITIVE) })
      .positive({ error: t(ValidationMessageKeys.NUMBER_POSITIVE) }),

  /**
   * 非负数验证
   */
  nonNegativeNumber: () =>
    z.number({ error: t(ValidationMessageKeys.NUMBER_NONNEGATIVE) })
      .nonnegative({ error: t(ValidationMessageKeys.NUMBER_NONNEGATIVE) }),

  /**
   * 枚举验证
   */
  enum: <T extends readonly [string, ...string[]]>(
    values: T,
    customMessage?: string
  ) => z.enum(values, { message: customMessage || t(ValidationMessageKeys.ENUM_INVALID) }),
})

/**
 * 默认中文验证器（用于 shared-types 内部）
 */
export const validators = createValidators((key) => {
  const messages: Record<string, string> = {
    'validation._required': '此字段为必填项',
    'validation.string.email': '请输入有效的邮箱地址',
    'validation.string.phone': '手机号格式不正确',
    'validation.string.url': '请输入有效的网址',
    'validation.string.cuid': '请选择有效的记录',
    'validation.string.min': '至少需要 {{min}} 个字符',
    'validation.string.max': '最多 {{max}} 个字符',
    'validation.number.positive': '必须大于 0',
    'validation.number.nonnegative': '必须大于等于 0',
    'validation.enum.invalid': '请选择有效选项',
  }
  return messages[key] || key
})
