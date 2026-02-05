import { z } from 'zod'

/**
 * 跟进类型枚举（字符串版本）
 */
export const followTypeSchema = z.enum(['PHONE', 'WECHAT', 'VISIT', 'EMAIL', 'OTHER'], {
  errorMap: () => ({ message: '跟进类型必须是 PHONE、WECHAT、VISIT、EMAIL 或 OTHER' }),
})

export type FollowType = z.infer<typeof followTypeSchema>

/**
 * 基础跟进记录 Schema
 */
export const followRecordBaseSchema = z.object({
  customerId: z.string().cuid('请选择有效的客户'),
  type: followTypeSchema,
  content: z.string().min(1, '跟进内容不能为空').max(1000, '跟进内容最多1000个字符'),
  nextTime: z.coerce.date().optional(),
  images: z.string().optional(), // JSON数组字符串
})

export type FollowRecordBase = z.infer<typeof followRecordBaseSchema>

/**
 * 完整跟进记录 Schema
 */
export const followRecordSchema = followRecordBaseSchema.extend({
  id: z.string().cuid(),
  userId: z.string().cuid(), // 跟进人ID
  userName: z.string().optional(), // 跟进人姓名
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type FollowRecord = z.infer<typeof followRecordSchema>

/**
 * 创建跟进记录 DTO Schema
 */
export const createFollowRecordSchema = followRecordBaseSchema

/**
 * 更新跟进记录 DTO Schema
 */
export const updateFollowRecordSchema = followRecordBaseSchema.partial()

/**
 * 跟进类型映射（用于显示）
 */
export const followTypeMap: Record<FollowType, string> = {
  PHONE: '电话',
  WECHAT: '微信',
  VISIT: '上门',
  EMAIL: '邮件',
  OTHER: '其他',
}

/**
 * 获取跟进类型显示名称
 */
export function getFollowTypeLabel(type: FollowType): string {
  return followTypeMap[type]
}

// Legacy 数字枚举支持
export const followTypeLegacySchema = z.union([
  z.literal(1), // 电话 -> PHONE
  z.literal(2), // 微信 -> WECHAT
  z.literal(3), // 上门 -> VISIT
  z.literal(4), // 邮件 -> EMAIL
  z.literal(5), // 其他 -> OTHER
])

export type FollowTypeLegacy = z.infer<typeof followTypeLegacySchema>

export function toFollowType(legacy: FollowTypeLegacy): FollowType {
  const map = { 1: 'PHONE', 2: 'WECHAT', 3: 'VISIT', 4: 'EMAIL', 5: 'OTHER' } as const
  return map[legacy]
}

export function toFollowTypeLegacy(type: FollowType): FollowTypeLegacy {
  const map = { PHONE: 1, WECHAT: 2, VISIT: 3, EMAIL: 4, OTHER: 5 } as const
  return map[type]
}
