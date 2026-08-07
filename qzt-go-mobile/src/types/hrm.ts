// HRM 人事模块类型(移动端子集)

/** 员工 */
export interface HrmEmployee {
  id: number
  emp_no: string
  name: string
  gender: string
  phone: string
  email: string
  department_id: number | null
  department_name: string
  position_id: number | null
  position_name: string
  status: number
  hire_date: string | null
  created_at: string
}

/** 请假单 */
export interface HrmLeave {
  id: number
  leave_no: string
  employee_id: number
  leave_type: string
  start_date: string
  end_date: string
  duration_days: string
  reason: string
  status: string
  approval_status: string
  approver_id: number | null
  approve_time: string | null
  approve_remark: string
  created_at: string
}

export const EMPLOYEE_STATUS: Record<number, string> = {
  1: '在职', 2: '试用', 3: '离职',
}

export const LEAVE_TYPE: Record<string, string> = {
  PERSONAL: '事假', SICK: '病假', ANNUAL: '年假',
  MARRIAGE: '婚假', MATERNITY: '产假', OTHER: '其他',
}

export const LEAVE_APPROVAL_STATUS: Record<string, { text: string; color: string }> = {
  NONE: { text: '未提交', color: 'default' },
  APPROVING: { text: '审批中', color: 'warning' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'danger' },
  REVOKED: { text: '已撤回', color: 'default' },
}
