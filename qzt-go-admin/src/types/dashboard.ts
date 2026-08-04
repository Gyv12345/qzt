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
