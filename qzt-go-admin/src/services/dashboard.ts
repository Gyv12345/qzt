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
  request.get<unknown, DashboardOverview>('/api/dashboard/overview', { silent: true })

/** 回款趋势,days 默认 30 */
export const getSalesTrend = (days = 30) =>
  request.get<unknown, DashboardTrendPoint[]>('/api/dashboard/sales-trend', { params: { days }, silent: true })

export const getOpportunityFunnel = () =>
  request.get<unknown, DashboardFunnelPoint[]>('/api/dashboard/opportunity-funnel', { silent: true })

/** 客户分布, dimension: level / source / industry */
export const getCustomerDistribution = (dimension = 'level') =>
  request.get<unknown, DashboardDistributionPoint[]>('/api/dashboard/customer-distribution', {
    params: { dimension },
    silent: true,
  })

export const getFinanceSummary = (params?: { start_date?: string; end_date?: string }) =>
  request.get<unknown, DashboardFinanceSummary>('/api/dashboard/finance-summary', { params, silent: true })

// ---------- BI 扩展:CRM ----------

export const getContractTrend = (months = 6) =>
  request.get<unknown, MonthTrend[]>('/api/dashboard/contract-trend', { params: { months }, silent: true })

export const getSalesRanking = (limit = 10) =>
  request.get<unknown, SalesRankingItem[]>('/api/dashboard/sales-ranking', { params: { limit }, silent: true })

export const getLeadSourceDistribution = () =>
  request.get<unknown, LabelValue[]>('/api/dashboard/lead-source-distribution', { silent: true })

// ---------- BI 扩展:HRM ----------

export const getEmployeeDistribution = (dimension: 'department' | 'gender' | 'status' = 'department') =>
  request.get<unknown, LabelValue[]>('/api/dashboard/employee-distribution', { params: { dimension }, silent: true })

export const getHeadcountTrend = (months = 6) =>
  request.get<unknown, MonthTrend[]>('/api/dashboard/headcount-trend', { params: { months }, silent: true })

export const getAttendanceSummary = (month?: string) =>
  request.get<unknown, AttendanceSummaryItem[]>('/api/dashboard/attendance-summary', { params: { month }, silent: true })

// ---------- BI 扩展:财务 ----------

export const getFinanceTrend = (months = 6) =>
  request.get<unknown, FinanceTrendItem[]>('/api/dashboard/finance-trend', { params: { months }, silent: true })

// ---------- BI 扩展:进销存 ----------

export const getStockValueByWarehouse = () =>
  request.get<unknown, StockValueItem[]>('/api/dashboard/stock-value-by-warehouse', { silent: true })

export const getSalesVsPurchase = (months = 6) =>
  request.get<unknown, SalesVsPurchaseItem[]>('/api/dashboard/sales-vs-purchase', { params: { months }, silent: true })

// ---------- 统一日历(聚合各模块待办) ----------

import type { CalendarEvent } from '../types/oa'

/** 统一日历:聚合各业务模块带日期的待办(仅当前用户)。sources 省略=全部 */
export const listCalendarEvents = (startDate: string, endDate: string, sources?: string[]) =>
  request.get<unknown, { list: CalendarEvent[] }>('/api/calendar', {
    params: { start_date: startDate, end_date: endDate, sources: sources?.join(',') },
  })
