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

// ==================== 工作日志 ====================

/** 工作日志 */
export interface OaWorkLog {
  id: number
  log_no: string
  /** DAILY/WEEKLY/MONTHLY */
  log_type: string
  /** yyyy-MM-dd */
  log_date: string
  content: string
  plan: string
  problems: string
  creator_id: number
  dept_id: number | null
  created_at: string
  updated_at: string
}

/** 日志类型选项 */
export const LOG_TYPE_OPTIONS = [
  { label: '日报', value: 'DAILY' },
  { label: '周报', value: 'WEEKLY' },
  { label: '月报', value: 'MONTHLY' },
]

export const LOG_TYPE_MAP: Record<string, string> = {
  DAILY: '日报',
  WEEKLY: '周报',
  MONTHLY: '月报',
}

// ==================== 日程安排 ====================

/** 日程安排 */
export interface OaSchedule {
  id: number
  schedule_no: string
  title: string
  /** MEETING/TASK/REMINDER/OUT/OTHER */
  event_type: string
  start_time: string
  end_time: string
  location: string
  content: string
  /** NONE/MIN5/MIN15/HOUR1/DAY1 */
  remind_type: string
  /** PENDING/DONE/CANCELED */
  status: string
  creator_id: number
  created_at: string
  updated_at: string
}

/** 日程类型选项 */
export const SCHEDULE_TYPE_OPTIONS = [
  { label: '会议', value: 'MEETING' },
  { label: '任务', value: 'TASK' },
  { label: '提醒', value: 'REMINDER' },
  { label: '外出', value: 'OUT' },
  { label: '其他', value: 'OTHER' },
]

export const SCHEDULE_TYPE_MAP: Record<string, { text: string; color: string }> = {
  MEETING: { text: '会议', color: 'blue' },
  TASK: { text: '任务', color: 'orange' },
  REMINDER: { text: '提醒', color: 'purple' },
  OUT: { text: '外出', color: 'cyan' },
  OTHER: { text: '其他', color: 'default' },
}

/** 提醒类型选项 */
export const REMIND_TYPE_OPTIONS = [
  { label: '不提醒', value: 'NONE' },
  { label: '提前5分钟', value: 'MIN5' },
  { label: '提前15分钟', value: 'MIN15' },
  { label: '提前1小时', value: 'HOUR1' },
  { label: '提前1天', value: 'DAY1' },
]

/** 日程状态选项 */
export const SCHEDULE_STATUS_OPTIONS = [
  { label: '待处理', value: 'PENDING' },
  { label: '已完成', value: 'DONE' },
  { label: '已取消', value: 'CANCELED' },
]

export const SCHEDULE_STATUS_MAP: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待处理', color: 'processing' },
  DONE: { text: '已完成', color: 'success' },
  CANCELED: { text: '已取消', color: 'default' },
}

// ==================== 会议室 ====================

/** 会议室 */
export interface OaMeetingRoom {
  id: number
  name: string
  location: string
  capacity: number
  equipment: string
  /** ENABLED/DISABLED/MAINTENANCE */
  status: string
  remark: string
  created_at: string
  updated_at: string
}

/** 会议室状态选项 */
export const MEETING_ROOM_STATUS_OPTIONS = [
  { label: '可用', value: 'ENABLED' },
  { label: '停用', value: 'DISABLED' },
  { label: '维护中', value: 'MAINTENANCE' },
]

export const MEETING_ROOM_STATUS_MAP: Record<string, { text: string; color: string }> = {
  ENABLED: { text: '可用', color: 'success' },
  DISABLED: { text: '停用', color: 'default' },
  MAINTENANCE: { text: '维护中', color: 'warning' },
}

/** 常见设备列表 */
export const EQUIPMENT_OPTIONS = [
  { label: '投影仪', value: '投影仪' },
  { label: '白板', value: '白板' },
  { label: '视频会议', value: '视频会议' },
  { label: '电话', value: '电话' },
  { label: '空调', value: '空调' },
  { label: '电视', value: '电视' },
  { label: '音响', value: '音响' },
]

// ==================== 会议预订 ====================

/** 会议预订 */
export interface OaMeetingBooking {
  id: number
  booking_no: string
  title: string
  room_id: number
  organizer_id: number
  dept_id: number | null
  start_time: string
  end_time: string
  attendees: number
  topic: string
  approval_status: string
  remark: string
  created_at: string
  updated_at: string
}
