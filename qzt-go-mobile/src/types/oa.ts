// OA 办公模块类型,与后端 oa model 对齐

/** 报销单 */
export interface OaExpense {
  id: number
  expense_no: string
  title: string
  applicant_id: number
  dept_id: number | null
  expense_type: string
  amount: string
  occur_date: string | null
  description: string
  approval_status: string
  payment_status: number
  created_at: string
  updated_at: string
}

/** 报销明细行 */
export interface OaExpenseItem {
  id: number
  expense_id: number
  item_type: string
  amount: string
  occur_date: string | null
  invoice_no: string
  remark: string
}

/** 报销详情(主表+明细) */
export interface OaExpenseDetail {
  expense: OaExpense
  items: OaExpenseItem[]
}

/** 出差申请 */
export interface OaBusinessTrip {
  id: number
  trip_no: string
  title: string
  applicant_id: number
  dept_id: number | null
  destination: string
  purpose: string
  start_date: string
  end_date: string
  transport: string
  budget_amount: string
  description: string
  approval_status: string
  created_at: string
  updated_at: string
}

/** 借款/备用金 */
export interface OaLoan {
  id: number
  loan_no: string
  title: string
  applicant_id: number
  dept_id: number | null
  loan_type: string
  amount: string
  expected_date: string
  reason: string
  approval_status: string
  repaid_status: number
  repaid_amount: string
  created_at: string
  updated_at: string
}

/** 审批状态映射 */
export const APPROVAL_STATUS: Record<string, { text: string; color: string }> = {
  NONE: { text: '未提交', color: 'default' },
  APPROVING: { text: '审批中', color: 'warning' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'danger' },
  REVOKED: { text: '已撤回', color: 'default' },
}

/** 费用类型 */
export const EXPENSE_TYPE: Record<string, string> = {
  TRAVEL: '差旅',
  OFFICE: '办公',
  HOSPITALITY: '招待',
  TRANSPORT: '交通',
  COMMUNICATION: '通讯',
  OTHER: '其他',
}
