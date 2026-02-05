import { z } from 'zod'

/**
 * API 响应包装 Schema
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    message: z.string().optional(),
    code: z.number().optional(),
  })

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  message?: string
  code?: number
}

/**
 * 分页响应 Schema
 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  })

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 错误响应 Schema
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  code: z.number().optional(),
  errors: z.array(z.object({ message: z.string(), field: z.string().optional() })).optional(),
})

export type ErrorResponse = {
  success: false
  message: string
  code?: number
  errors?: Array<{ message: string; field?: string }>
}
