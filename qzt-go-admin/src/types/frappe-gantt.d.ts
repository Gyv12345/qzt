/**
 * frappe-gantt 1.x(vanilla JS)模块声明。
 * 参考官方 README 与 dist/frappe-gantt.es.js 实际导出核对手写,仅声明本项目用到的子集。
 */
declare module 'frappe-gantt' {
  /** 甘特图任务条数据 */
  export interface GanttTask {
    id: string | number
    name: string
    /** YYYY-MM-DD */
    start: string
    /** YYYY-MM-DD(与 start 同日 = 单日条) */
    end: string
    /** 0-100 进度内条 */
    progress?: number
    /** 自定义 class(叠加在 .bar-wrapper 上) */
    custom_class?: string
    dependencies?: string[] | string
    color?: string
    thumbnail?: string
    [key: string]: unknown
  }

  /** 弹出自定义回调入参 */
  export interface GanttPopupContext {
    task: GanttTask
    set_title: (t: string) => void
    set_subtitle: (t: string) => void
    set_details: (t: string) => void
  }

  export interface GanttOptions {
    view_mode?: string
    /** 可用视图(名称须为内置 Day/Week/Month/Year 等) */
    view_modes?: string[]
    date_format?: string
    /** Intl locale(如 zh-CN,影响月份文字) */
    language?: string
    /** 只读:禁拖拽/缩放/进度手柄 */
    readonly?: boolean
    readonly_dates?: boolean
    readonly_progress?: boolean
    popup_on?: 'click' | 'hover'
    today_button?: boolean
    view_mode_select?: boolean
    scroll_to?: string
    bar_height?: number
    column_width?: number
    padding?: number
    container_height?: string | number
    lines?: 'both' | 'vertical' | 'horizontal' | 'none'
    infinite_padding?: boolean
    popup?: (ctx: GanttPopupContext) => void
    on_click?: (task: GanttTask) => void
    on_double_click?: (task: GanttTask) => void
    on_date_change?: (task: GanttTask, start: string, end: string) => void
    on_progress_change?: (task: GanttTask, progress: number) => void
    on_view_change?: (mode: string) => void
    on_date_click?: (date: string) => void
    on_hover?: (task: GanttTask, x: number, y: number, e: MouseEvent) => void
  }

  export default class Gantt {
    constructor(
      wrapper: string | HTMLElement | SVGElement,
      tasks: GanttTask[],
      options?: GanttOptions,
    )
    /** 切换视图(传内置视图名,如 'Week') */
    change_view_mode(mode?: string): void
    /** 以新任务集重渲染 */
    refresh(tasks: GanttTask[]): void
    update_task(id: string, task: Partial<GanttTask>): void
    $container: HTMLElement
  }
}
