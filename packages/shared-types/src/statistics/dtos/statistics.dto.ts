import { createZodDto } from '../../utils'
import {
  dashboardStatsSchema,
  statsQuerySchema,
  salesStatsSchema,
  customerStatsSchema,
} from '../schemas'

/**
 * 仪表盘统计 DTO
 */
export class DashboardStatsDto extends createZodDto(dashboardStatsSchema) {}

/**
 * 统计查询 DTO
 */
export class StatsQueryDto extends createZodDto(statsQuerySchema) {}

/**
 * 销售统计 DTO
 */
export class SalesStatsDto extends createZodDto(salesStatsSchema) {}

/**
 * 客户统计 DTO
 */
export class CustomerStatsDto extends createZodDto(customerStatsSchema) {}

// 导出关联的 Schema 供外部使用
export {
  dashboardStatsSchema,
  statsQuerySchema,
  salesStatsSchema,
  customerStatsSchema,
} from '../schemas'
