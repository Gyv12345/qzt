// 静态站一键发布(qzt-go-server /deploy 模块)契约类型,与 swagger 保持一致

/** 发布目标:cms=官网(2026-11-13 双主题合并后仅此一目标) */
export type DeployTarget = 'cms'

/** 单目标最近一次重建状态 */
export interface DeployTargetStatus {
  target: DeployTarget
  /** running / success / failed */
  status: 'running' | 'success' | 'failed'
  started_at?: string
  finished_at?: string
  log_file?: string
  /** 末 30 行日志 */
  log_tail?: string[]
}

/** GET /deploy/status 返回体 */
export interface DeployStatus {
  /** ''=空闲,否则为正在执行的 target */
  running: '' | DeployTarget
  last_per_target: Partial<Record<DeployTarget, DeployTargetStatus>>
}
