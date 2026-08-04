import request from '../utils/request'
import type {
  DashboardDistributionPoint,
  DashboardFinanceSummary,
  DashboardFunnelPoint,
  DashboardOverview,
  DashboardTrendPoint,
} from '../types/dashboard'

// ---------- 首页仪表盘统计 ----------

export const getDashboardOverview = () =>
  request.get<unknown, DashboardOverview>('/api/dashboard/overview')

/** 回款趋势,days 默认 30 */
export const getSalesTrend = (days = 30) =>
  request.get<unknown, DashboardTrendPoint[]>('/api/dashboard/sales-trend', { params: { days } })

export const getOpportunityFunnel = () =>
  request.get<unknown, DashboardFunnelPoint[]>('/api/dashboard/opportunity-funnel')

/** 客户分布, dimension: level / source / industry */
export const getCustomerDistribution = (dimension = 'level') =>
  request.get<unknown, DashboardDistributionPoint[]>('/api/dashboard/customer-distribution', {
    params: { dimension },
  })

export const getFinanceSummary = (params?: { start_date?: string; end_date?: string }) =>
  request.get<unknown, DashboardFinanceSummary>('/api/dashboard/finance-summary', { params })
