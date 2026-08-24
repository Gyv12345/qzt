// HRM 人事模块 API 契约类型,与 qzt-go-server swagger 定义保持一致

/** 部门 */
export interface HrmDepartment {
  id: number
  parent_id: number
  name: string
  code: string
  leader_id: number | null
  sort: number
  /** 1 启用 0 停用 */
  status: number
  children?: HrmDepartment[]
  created_at: string
  updated_at: string
}

/** 创建/更新部门请求 */
export interface HrmDepartmentPayload {
  name: string
  code: string
  parent_id?: number
  leader_id?: number
  sort?: number
  status?: number
}

/** 岗位 */
export interface HrmPosition {
  id: number
  name: string
  code: string
  department_id: number
  sort: number
  /** 1 启用 0 停用 */
  status: number
  remark: string
  created_at: string
  updated_at: string
}

/** 创建/更新岗位请求 */
export interface HrmPositionPayload {
  name: string
  code: string
  department_id: number
  sort?: number
  status?: number
  remark?: string
}

/** 员工 */
export interface HrmEmployee {
  id: number
  emp_no: string
  name: string
  /** 1 男 2 女 */
  gender: number
  phone: string
  email: string
  department_id: number
  position_id: number
  /** 关联系统用户 */
  user_id: number | null
  entry_date: string | null
  resign_date: string | null
  /** 1 在职 0 离职 */
  status: number
  remark: string
  created_at: string
  updated_at: string
}

/** 创建/更新员工请求 */
export interface HrmEmployeePayload {
  name: string
  emp_no: string
  department_id: number
  position_id: number
  gender?: number
  phone?: string
  email?: string
  user_id?: number
  entry_date?: string
  resign_date?: string
  status?: number
  remark?: string
}

/** 员工变更履历 */
export interface HrmEmployeeChange {
  id: number
  employee_id: number
  from_department_id: number | null
  to_department_id: number | null
  from_position_id: number | null
  to_position_id: number | null
  /** HIRE 入职 / TRANSFER 调动 / RESIGN 离职 等 */
  change_type: string
  reason: string
  operator_id: number
  created_at: string
  updated_at: string
}

// ---------- 请假 ----------

/** 请假单 */
export interface HrmLeave {
  id: number
  leave_no: string
  employee_id: number
  /** 请假类型, 字典 LEAVE_TYPE: PERSONAL/SICK/ANNUAL/MARRIAGE/MATERNITY/OTHER */
  leave_type: string
  /** yyyy-MM-dd HH:mm:ss */
  start_date: string
  end_date: string
  /** 请假天数(decimal 字符串) */
  duration_days: string
  reason: string
  /** 旧审批状态(兼容): PENDING/APPROVED/REJECTED/CANCELED */
  status: string
  /** 审批引擎状态: NONE/APPROVING/APPROVED/REJECTED/REVOKED */
  approval_status: string
  approver_id: number | null
  approve_time: string | null
  approve_remark: string
  created_at: string
  updated_at: string
}

/** 审批状态映射 */
export const LEAVE_APPROVAL_STATUS: Record<string, { text: string; color: string }> = {
  NONE: { text: '未提交', color: 'default' },
  APPROVING: { text: '审批中', color: 'processing' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
  UNAPPROVED: { text: '已驳回', color: 'error' },
  REVOKED: { text: '已撤回', color: 'warning' },
}

// ---------- 招聘 ----------

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
  /** 1草稿 2招聘中 3暂停 4已关闭 5已满编 */
  status: number
  publish_date: string | null
  created_at: string
  updated_at: string
}

/** 候选人 */
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
  /** 1新简历 2筛选 3面试 4offer 5录用 6淘汰 */
  status: number
  source: string
  interview_date: string
  remark: string
  evaluator_id: number | null
  created_at: string
  updated_at: string
}

export const JOB_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '草稿', color: 'default' },
  2: { text: '招聘中', color: 'processing' },
  3: { text: '暂停', color: 'warning' },
  4: { text: '已关闭', color: 'default' },
  5: { text: '已满编', color: 'success' },
}

export const CANDIDATE_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '新简历', color: 'default' },
  2: { text: '筛选中', color: 'blue' },
  3: { text: '面试中', color: 'processing' },
  4: { text: '已发offer', color: 'warning' },
  5: { text: '已录用', color: 'success' },
  6: { text: '已淘汰', color: 'error' },
}

// ---------- 绩效考核 ----------

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
  updated_at: string
}

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

export const PERF_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '草稿', color: 'default' },
  2: { text: '进行中', color: 'processing' },
  3: { text: '自评完成', color: 'blue' },
  4: { text: '评审中', color: 'warning' },
  5: { text: '已完成', color: 'success' },
  6: { text: '已取消', color: 'default' },
}

/** 考勤汇总 */
export interface HrmAttendanceSummary {
  id: number
  emp_no: string
  emp_name: string
  dept_name: string
  year_month: string
  should_days: number
  actual_days: number
  late_count: number
  early_count: number
  miss_count: number
  leave_days: number
  overtime_hours: number
}
