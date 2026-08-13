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

/** 考勤打卡记录 */
export interface HrmClockRecord {
  id: number
  employee_id: number
  /** 打卡日期 yyyy-MM-dd */
  clock_date: string
  /** CHECK_IN 上班 / CHECK_OUT 下班 */
  clock_type: string
  /** 打卡时间 */
  clock_time: string
  location: string
  remark: string
  /** 来源 APP / WECOM */
  source: string
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

/** 部门 */
export interface HrmDepartment {
  id: number
  parent_id: number
  name: string
  code: string
  leader_id: number | null
  sort: number
  status: number
  children?: HrmDepartment[]
  created_at: string
}

/** 岗位 */
export interface HrmPosition {
  id: number
  name: string
  code: string
  department_id: number | null
  department_name?: string
  sort: number
  status: number
  remark: string
  created_at: string
}

/** 绩效考核项 */
export interface HrmPerfItem {
  id: number
  perf_id: number
  item_name: string
  weight: string
  target_desc: string
  self_score: string
  review_score: string
  remark: string
}

/** 绩效考核 */
export interface HrmPerformance {
  id: number
  perf_no: string
  title: string
  employee_id: number
  employee_name: string
  dept_id: number | null
  dept_name: string
  period: string
  start_date: string
  end_date: string
  status: number
  reviewer_id: number | null
  self_score: string
  self_comment: string
  self_time: string | null
  review_score: string
  review_comment: string
  review_time: string | null
  final_score: string
  grade: string
  created_at: string
}

/** 招聘职位 */
export interface HrmJob {
  id: number
  job_no: string
  title: string
  dept_id: number | null
  dept_name: string
  position_id: number | null
  headcount: number
  salary_range: string
  education: string
  experience: string
  description: string
  requirement: string
  hiring_manager_id: number | null
  status: number
  publish_date: string | null
  created_at: string
}

/** 招聘候选人 */
export interface HrmCandidate {
  id: number
  job_id: number
  name: string
  phone: string
  email: string
  gender: string
  age: number
  education: string
  experience: string
  company: string
  resume_url: string
  status: number
  source: string
  interview_date: string
  remark: string
  evaluator_id: number | null
  created_at: string
}

/** 考勤月度汇总 */
export interface HrmAttendanceSummary {
  id: number
  employee_id: number
  employee_name?: string
  year_month: string
  work_days: number
  actual_days: number
  late_count: number
  early_count: number
  absent_days: string
  leave_days: string
  overtime_hours: string
  created_at: string
}

/** 工资条 */
export interface HrmPayroll {
  id: number
  employee_id: number
  employee_name?: string
  year_month: string
  base_salary: string
  position_allowance: string
  performance_allowance: string
  other_allowance: string
  overtime_pay: string
  gross_pay: string
  social_ins_deduction: string
  housing_fund_deduction: string
  absence_deduction: string
  taxable_income: string
  tax: string
  net_pay: string
  status: string
  remark: string
  created_at: string
}

/** 薪酬结构 */
export interface HrmSalaryStructure {
  id: number
  employee_id: number
  base_salary: string
  position_allowance: string
  performance_allowance: string
  meal_allowance: string
  transport_allowance: string
  social_ins_rate: string
  housing_fund_rate: string
  social_ins_base: string
  housing_fund_base: string
  remark: string
  created_at: string
}

export const PERF_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '草稿', color: 'default' },
  2: { text: '进行中', color: 'warning' },
  3: { text: '自评完成', color: 'primary' },
  4: { text: '评审中', color: 'primary' },
  5: { text: '已完成', color: 'success' },
  6: { text: '已取消', color: 'default' },
}

export const JOB_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '草稿', color: 'default' },
  2: { text: '招聘中', color: 'success' },
  3: { text: '暂停', color: 'warning' },
  4: { text: '已关闭', color: 'default' },
  5: { text: '已满编', color: 'primary' },
}

export const CANDIDATE_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '新简历', color: 'default' },
  2: { text: '筛选', color: 'primary' },
  3: { text: '面试', color: 'warning' },
  4: { text: 'Offer', color: 'success' },
  5: { text: '录用', color: 'success' },
  6: { text: '淘汰', color: 'danger' },
}

export const PAYROLL_STATUS: Record<string, { text: string; color: string }> = {
  DRAFT: { text: '草稿', color: 'default' },
  CONFIRMED: { text: '已确认', color: 'primary' },
  PAID: { text: '已发放', color: 'success' },
}
