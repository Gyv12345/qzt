// 项目管理模块类型

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
  status: number
  priority: number
  start_date: string | null
  end_date: string | null
  progress: number
  tags: string
  created_at: string
  updated_at: string
}

export interface ProjTask {
  id: number
  project_id: number
  title: string
  description: string
  assignee_id: number | null
  status: number
  priority: number
  sort_order: number
  due_date: string | null
  done_at: string | null
  created_at: string
  updated_at: string
}

export interface ProjectDetail {
  project: ProjProject
  tasks: ProjTask[]
}

export const PROJECT_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '规划中', color: 'default' },
  2: { text: '进行中', color: 'primary' },
  3: { text: '暂停', color: 'warning' },
  4: { text: '已完成', color: 'success' },
  5: { text: '已取消', color: 'danger' },
}

export const TASK_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '待办', color: 'default' },
  2: { text: '进行中', color: 'primary' },
  3: { text: '已完成', color: 'success' },
  4: { text: '已取消', color: 'danger' },
}
