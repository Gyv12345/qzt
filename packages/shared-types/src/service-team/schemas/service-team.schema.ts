import { z } from 'zod'

/**
 * 服务团队角色枚举
 */
export const serviceRoleCodeSchema = z.enum(['SALE', 'FINANCE', 'OUTWORK'], {
  errorMap: () => ({ message: '角色代码必须是 SALE、FINANCE 或 OUTWORK' }),
})

export type ServiceRoleCode = z.infer<typeof serviceRoleCodeSchema>

/**
 * 基础服务团队 Schema
 */
export const serviceTeamBaseSchema = z.object({
  customerId: z.string().cuid('请选择有效的客户'),
  userId: z.string().cuid('请选择有效的用户'),
  roleCode: serviceRoleCodeSchema,
})

export type ServiceTeamBase = z.infer<typeof serviceTeamBaseSchema>

/**
 * 完整服务团队 Schema
 */
export const serviceTeamSchema = serviceTeamBaseSchema.extend({
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ServiceTeam = z.infer<typeof serviceTeamSchema>

/**
 * 服务团队详情 Schema（含关联信息）
 */
export const serviceTeamDetailSchema = serviceTeamSchema.extend({
  customer: z.any().optional(), // Customer
  user: z.any().optional(), // User
})

export type ServiceTeamDetail = z.infer<typeof serviceTeamDetailSchema>

/**
 * 创建服务团队 DTO Schema
 */
export const createServiceTeamSchema = serviceTeamBaseSchema

/**
 * 更新服务团队 DTO Schema
 */
export const updateServiceTeamSchema = serviceTeamBaseSchema.partial()

/**
 * 服务团队角色映射（用于显示）
 */
export const serviceRoleCodeMap: Record<ServiceRoleCode, string> = {
  SALE: '销售',
  FINANCE: '财务',
  OUTWORK: '外勤',
}

/**
 * 获取服务团队角色显示名称
 */
export function getServiceRoleCodeLabel(roleCode: ServiceRoleCode): string {
  return serviceRoleCodeMap[roleCode]
}
