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

// ── 财务维度(补充) ──

/** 财务趋势(近 N 月) */
export const getFinanceTrend = (months = 6) =>
  request.get<unknown, DashboardMonthValue[]>('/api/dashboard/finance-trend', { params: { months } })

/** 财务概要(收入/支出/利润等) */
export const getFinanceSummary = () =>
  request.get<unknown, Record<string, any>>('/api/dashboard/finance-summary')

// ── 人事维度(补充) ──

/** 员工分布(按部门/学历等) */
export const getEmployeeDistribution = (dimension = 'dept') =>
  request.get<unknown, DashboardDistItem[]>('/api/dashboard/employee-distribution', { params: { dimension } })

/** 人数趋势(近 N 月) */
export const getHeadcountTrend = (months = 6) =>
  request.get<unknown, DashboardMonthValue[]>('/api/dashboard/headcount-trend', { params: { months } })

// ── 进销存维度(补充) ──

/** 各仓库库存价值 */
export const getStockValueByWarehouse = () =>
  request.get<unknown, DashboardDistItem[]>('/api/dashboard/stock-value-by-warehouse')

/** 销采对比(近 N 月) */
export const getSalesVsPurchase = (months = 6) =>
  request.get<unknown, DashboardMonthValue[]>('/api/dashboard/sales-vs-purchase', { params: { months } })
