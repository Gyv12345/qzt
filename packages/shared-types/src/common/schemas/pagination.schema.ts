import { z } from 'zod'

/**
 * 分页查询参数 Schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
})

export type PaginationParams = z.infer<typeof paginationSchema>

/**
 * 排序参数 Schema
 */
export const sortingSchema = z.object({
  sortField: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type SortingParams = z.infer<typeof sortingSchema>

/**
 * 分页 + 排序参数 Schema
 */
export const queryWithPaginationSchema = paginationSchema.merge(sortingSchema)

export type QueryWithPaginationParams = z.infer<typeof queryWithPaginationSchema>
