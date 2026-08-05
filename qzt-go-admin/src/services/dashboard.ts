import request from '../utils/request'
import type {
  AttendanceSummaryItem,
  DashboardDistributionPoint,
  DashboardFinanceSummary,
  DashboardFunnelPoint,
  DashboardOverview,
  DashboardTrendPoint,
  FinanceTrendItem,
  LabelValue,
  MonthTrend,
  SalesRankingItem,
  SalesVsPurchaseItem,
  StockValueItem,
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

// ---------- BI 扩展:CRM ----------

export const getContractTrend = (months = 6) =>
  request.get<unknown, MonthTrend[]>('/api/dashboard/contract-trend', { params: { months } })

export const getSalesRanking = (limit = 10) =>
  request.get<unknown, SalesRankingItem[]>('/api/dashboard/sales-ranking', { params: { limit } })

export const getLeadSourceDistribution = () =>
  request.get<unknown, LabelValue[]>('/api/dashboard/lead-source-distribution')

// ---------- BI 扩展:HRM ----------

export const getEmployeeDistribution = (dimension: 'department' | 'gender' | 'status' = 'department') =>
  request.get<unknown, LabelValue[]>('/api/dashboard/employee-distribution', { params: { dimension } })

export const getHeadcountTrend = (months = 6) =>
  request.get<unknown, MonthTrend[]>('/api/dashboard/headcount-trend', { params: { months } })

export const getAttendanceSummary = (month?: string) =>
  request.get<unknown, AttendanceSummaryItem[]>('/api/dashboard/attendance-summary', { params: { month } })

// ---------- BI 扩展:财务 ----------

export const getFinanceTrend = (months = 6) =>
  request.get<unknown, FinanceTrendItem[]>('/api/dashboard/finance-trend', { params: { months } })

// ---------- BI 扩展:进销存 ----------

export const getStockValueByWarehouse = () =>
  request.get<unknown, StockValueItem[]>('/api/dashboard/stock-value-by-warehouse')

export const getSalesVsPurchase = (months = 6) =>
  request.get<unknown, SalesVsPurchaseItem[]>('/api/dashboard/sales-vs-purchase', { params: { months } })
