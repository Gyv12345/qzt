// 项目管理模块类型

/** 项目 */
export interface ProjProject {
  id: number
  project_no: string
  name: string
  description: string
  customer_id: number | null
  customer_name: string
  contract_id: number | null
  manager_id: number | null
  member_ids: string
  /** 1规划 2进行 3暂停 4完成 5取消 */
  status: number
  /** 1低 2中 3高 4紧急 */
  priority: number
  start_date: string | null
  end_date: string | null
  /** 进度 0-100 */
  progress: number
  tags: string
  created_at: string
  updated_at: string
}

/** 任务 */
export interface ProjTask {
  id: number
  project_id: number
  title: string
  description: string
  assignee_id: number | null
  /** 1待办 2进行 3完成 4取消 */
  status: number
  priority: number
  sort_order: number
  due_date: string | null
  done_at: string | null
  created_at: string
  updated_at: string
}

/** 项目详情(含任务) */
export interface ProjectDetail {
  project: ProjProject
  tasks: ProjTask[]
}

export const PROJECT_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '规划中', color: 'default' },
  2: { text: '进行中', color: 'processing' },
  3: { text: '暂停', color: 'warning' },
  4: { text: '已完成', color: 'success' },
  5: { text: '已取消', color: 'error' },
}

export const PRIORITY_MAP: Record<number, { text: string; color: string }> = {
  1: { text: '低', color: 'default' },
  2: { text: '中', color: 'blue' },
  3: { text: '高', color: 'orange' },
  4: { text: '紧急', color: 'red' },
}

export const TASK_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '待办', color: 'default' },
  2: { text: '进行中', color: 'processing' },
  3: { text: '已完成', color: 'success' },
  4: { text: '已取消', color: 'error' },
}
