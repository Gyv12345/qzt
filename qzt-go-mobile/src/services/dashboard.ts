import request from '../utils/request'
import type {
  DashboardOverview,
  DashboardTrendPoint,
  DashboardDistItem,
  DashboardFunnelStage,
  DashboardSalesRankingItem,
  DashboardMonthValue,
  DashboardLabelValue,
} from '../types/dashboard'

/** 首页核心指标 */
export const getDashboardOverview = () =>
  request.get<unknown, DashboardOverview>('/api/dashboard/overview')

/** 回款趋势(近 N 天) */
export const getSalesTrend = (days = 30) =>
  request.get<unknown, DashboardTrendPoint[]>('/api/dashboard/sales-trend', { params: { days } })

/** 客户分布 */
export const getCustomerDistribution = (
  dimension: 'level' | 'source' | 'industry' | 'status' = 'level',
) =>
  request.get<unknown, DashboardDistItem[]>('/api/dashboard/customer-distribution', { params: { dimension } })

/** 商机漏斗 */
export const getOpportunityFunnel = () =>
  request.get<unknown, DashboardFunnelStage[]>('/api/dashboard/opportunity-funnel')

/** 销售业绩排行 TOP N */
export const getSalesRanking = (limit = 10) =>
  request.get<unknown, DashboardSalesRankingItem[]>('/api/dashboard/sales-ranking', { params: { limit } })

/** 合同签约趋势(近 N 月) */
export const getContractTrend = (months = 6) =>
  request.get<unknown, DashboardMonthValue[]>('/api/dashboard/contract-trend', { params: { months } })

/** 线索来源分布 */
export const getLeadSourceDistribution = () =>
  request.get<unknown, DashboardLabelValue[]>('/api/dashboard/lead-source-distribution')
