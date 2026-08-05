// 首页仪表盘统计 API 契约类型,与 qzt-go-server swagger 定义保持一致
// 注意:金额字段后端以字符串(decimal)返回

/** 首页核心指标 */
export interface DashboardOverview {
  customer_total: number
  customer_public: number
  opportunity_total: number
  opportunity_won: number
  contract_total: number
  contract_amount: string
  received_amount: string
  approval_pending: number
  stock_warning: number
  unread_message: number
}

/** 趋势/汇总数据点(回款趋势、采购汇总共用) */
export interface DashboardTrendPoint {
  date: string
  count: number
  amount: string
}

/** 商机漏斗数据点 */
export interface DashboardFunnelPoint {
  stage: string
  count: number
  amount: string
}

/** 客户分布数据点 */
export interface DashboardDistributionPoint {
  label: string
  count: number
}

/** 财务概览 */
export interface DashboardFinanceSummary {
  purchase_amount: string
  sales_amount: string
  received_amount: string
  stock_value: string
}

// ── BI 扩展类型 ──

/** 标签-值(饼图/柱状图) */
export interface LabelValue {
  label: string
  value: string
}

/** 月度趋势(折线) */
export interface MonthTrend {
  month: string
  amount: string
  count: number
}

/** 销售排行 */
export interface SalesRankingItem {
  owner_id: number
  owner_name: string
  amount: string
  count: number
}

/** 考勤汇总 */
export interface AttendanceSummaryItem {
  department: string
  leave_days: string
  ot_hours: string
}

/** 收支趋势 */
export interface FinanceTrendItem {
  month: string
  income: string
  expense: string
}

/** 仓库库存 */
export interface StockValueItem {
  warehouse: string
  stock_value: string
  quantity: string
}

/** 采购vs销售 */
export interface SalesVsPurchaseItem {
  month: string
  purchase_amount: string
  sales_amount: string
}
