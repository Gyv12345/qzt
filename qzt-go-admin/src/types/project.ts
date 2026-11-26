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
  /** 开始日期(YYYY-MM-DD,可空;P33 甘特图新增) */
  start_date: string | null
  /** 进度 0-100 */
  progress: number
  /** 里程碑:0普通 1里程碑 */
  is_milestone: 0 | 1
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

/** 甘特图支持的时间视图 */
export const GANTT_VIEW_MODES = ['Day', 'Week', 'Month'] as const
export type GanttViewMode = (typeof GANTT_VIEW_MODES)[number]

export const GANTT_VIEW_LABELS: Record<GanttViewMode, string> = {
  Day: '日',
  Week: '周',
  Month: '月',
}

/** 任务日期兜底:甘特条起止(无 start_date 的任务回退用 due_date 单日条) */
export function taskGanttRange(t: ProjTask): { start: string; end: string } | null {
  const day = (v?: string | null) => (v ? v.slice(0, 10) : '')
  const due = day(t.due_date)
  const start = day(t.start_date) || due
  if (!start) return null
  // 无截止日期或起止倒挂时,退化为开始日单日条
  const end = due && due >= start ? due : start
  return { start, end }
}
