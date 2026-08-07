// OA 模块类型(与后端 oa model 对齐)

/** 报销单 */
export interface OaExpense {
  id: number
  expense_no: string
  title: string
  applicant_id: number
  dept_id: number | null
  /** 费用类型, 字典 EXPENSE_TYPE */
  expense_type: string
  /** 报销总额(decimal 字符串) */
  amount: string
  /** 费用发生日期 yyyy-MM-dd */
  occur_date: string | null
  description: string
  /** 审批状态: NONE/APPROVING/APPROVED/REJECTED/REVOKED */
  approval_status: string
  /** 打款状态: 0未打款 1已打款 */
  payment_status: number
  created_at: string
  updated_at: string
}

/** 报销明细行 */
export interface OaExpenseItem {
  id?: number
  expense_id?: number
  item_type: string
  amount: string
  occur_date: string | null
  invoice_no: string
  remark: string
}

/** 报销单详情(主表 + 明细) */
export interface OaExpenseDetail {
  expense: OaExpense
  items: OaExpenseItem[]
}

/** 审批状态映射 */
export const APPROVAL_STATUS_MAP: Record<string, { text: string; color: string }> = {
  NONE: { text: '未提交', color: 'default' },
  APPROVING: { text: '审批中', color: 'processing' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
  REVOKED: { text: '已撤回', color: 'warning' },
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
  /** 借款类型 */
  loan_type: string
  /** 借款金额(decimal 字符串) */
  amount: string
  expected_date: string
  reason: string
  approval_status: string
  /** 还款状态: 0未还 1部分 2已还清 */
  repaid_status: number
  repaid_amount: string
  created_at: string
  updated_at: string
}

/** 借款类型选项 */
export const LOAN_TYPE_OPTIONS = [
  { label: '备用金', value: '备用金' },
  { label: '差旅借支', value: '差旅借支' },
  { label: '个人借款', value: '个人借款' },
  { label: '其他', value: '其他' },
]
