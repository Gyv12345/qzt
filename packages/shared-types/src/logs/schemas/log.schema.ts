import { z } from 'zod'

/**
 * 操作日志 Schema
 */
export const operationLogSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid().optional(),
  username: z.string().optional(),
  action: z.string(), // 操作类型：CREATE、UPDATE、DELETE等
  resource: z.string().optional(), // 资源类型：Customer、Contract等
  resourceId: z.string().optional(), // 资源ID
  description: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.coerce.date(),
})

export type OperationLog = z.infer<typeof operationLogSchema>

/**
 * 查询操作日志 Schema
 */
export const queryOperationLogSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  userId: z.string().cuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export type QueryOperationLogParams = z.infer<typeof queryOperationLogSchema>

/**
 * 操作日志列表响应
 */
export interface OperationLogListResponse {
  data: OperationLog[]
  total: number
  page: number
  pageSize: number
  totalPages?: number
}

/**
 * 系统日志 Schema
 */
export const systemLogSchema = z.object({
  id: z.string().cuid(),
  level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']),
  message: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.coerce.date(),
})

export type SystemLog = z.infer<typeof systemLogSchema>

/**
 * 查询系统日志 Schema
 */
export const querySystemLogSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export type QuerySystemLogParams = z.infer<typeof querySystemLogSchema>

/**
 * 日志级别映射（用于显示）
 */
export const logLevelMap: Record<'INFO' | 'WARN' | 'ERROR' | 'DEBUG', string> = {
  INFO: '信息',
  WARN: '警告',
  ERROR: '错误',
  DEBUG: '调试',
}

/**
 * 获取日志级别显示名称
 */
export function getLogLevelLabel(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'): string {
  return logLevelMap[level]
}
