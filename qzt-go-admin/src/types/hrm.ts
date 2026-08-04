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
