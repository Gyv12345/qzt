import { z } from 'zod'

/**
 * 登录状态枚举
 */
export const loginStatusSchema = z.enum(['SUCCESS', 'FAILED'], {
  message: '登录状态必须是 SUCCESS 或 FAILED',
})

export type LoginStatus = z.infer<typeof loginStatusSchema>

/**
 * 登录日志 Schema
 */
export const loginLogSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid().optional(),
  username: z.string().optional(),
  email: z.string().email().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  status: loginStatusSchema,
  failReason: z.string().optional(),
  createdAt: z.coerce.date(),
})

export type LoginLog = z.infer<typeof loginLogSchema>

/**
 * 查询登录日志 Schema
 */
export const queryLoginLogSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  userId: z.string().cuid().optional(),
  username: z.string().optional(),
  status: loginStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export type QueryLoginLogParams = z.infer<typeof queryLoginLogSchema>

/**
 * 登录日志列表响应
 */
export interface LoginLogListResponse {
  data: LoginLog[]
  total: number
  page: number
  pageSize: number
  totalPages?: number
}

/**
 * 登录状态映射（用于显示）
 */
export const loginStatusMap: Record<LoginStatus, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
}

/**
 * 获取登录状态显示名称
 */
export function getLoginStatusLabel(status: LoginStatus): string {
  return loginStatusMap[status]
}
