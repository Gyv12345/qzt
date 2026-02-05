import { z } from 'zod'

/**
 * 仪表盘总览数据 Schema
 */
export const dashboardOverviewSchema = z.object({
  totalCustomers: z.number().int().min(0),
  totalContracts: z.number().int().min(0),
  totalProducts: z.number().int().min(0),
  totalInvoices: z.number().int().min(0),
})

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>

/**
 * 仪表盘本月数据 Schema
 */
export const dashboardMonthlySchema = z.object({
  newCustomers: z.number().int().min(0),
  newContracts: z.number().int().min(0),
  contractAmount: z.number().min(0),
  invoiceAmount: z.number().min(0),
})

export type DashboardMonthly = z.infer<typeof dashboardMonthlySchema>

/**
 * 仪表盘统计数据 Schema
 */
export const dashboardStatsSchema = z.object({
  overview: dashboardOverviewSchema,
  monthly: dashboardMonthlySchema,
  recentActivities: z.array(z.any()).optional(), // Activity[]
  unreadNotifications: z.number().int().min(0).default(0),
})

export type DashboardStats = z.infer<typeof dashboardStatsSchema>

/**
 * 统计查询参数 Schema
 */
export const statsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  departmentId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
})

export type StatsQueryParams = z.infer<typeof statsQuerySchema>

/**
 * 销售统计 Schema
 */
export const salesStatsSchema = z.object({
  totalAmount: z.number().min(0),
  paidAmount: z.number().min(0),
  unpaidAmount: z.number().min(0),
  contractCount: z.number().int().min(0),
  avgContractAmount: z.number().min(0),
})

export type SalesStats = z.infer<typeof salesStatsSchema>

/**
 * 客户统计 Schema
 */
export const customerStatsSchema = z.object({
  totalCustomers: z.number().int().min(0),
  newCustomers: z.number().int().min(0),
  activeCustomers: z.number().int().min(0),
  vipCustomers: z.number().int().min(0),
  leadsCount: z.number().int().min(0),
})

export type CustomerStats = z.infer<typeof customerStatsSchema>
