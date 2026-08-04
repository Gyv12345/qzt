// 首页仪表盘统计类型(移动端子集),与 qzt-go-server swagger 对齐
// 金额(decimal)为字符串

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
