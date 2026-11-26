import { useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Radio, Spin } from 'antd'
import Gantt from 'frappe-gantt'
import './frappe-gantt.css'
import {
  GANTT_VIEW_MODES,
  GANTT_VIEW_LABELS,
  taskGanttRange,
  type GanttViewMode,
  type ProjTask,
} from '../../types/project'
import './gantt.css'

interface GanttChartProps {
  tasks: ProjTask[]
  loading?: boolean
  /** 点击任务条回调(打开既有任务编辑弹窗回填) */
  onSelectTask: (t: ProjTask) => void
}

const MILESTONE_CLASS = 'qzt-gantt-milestone'
const DONE_CLASS = 'qzt-gantt-done'

/** 里程碑条后处理:单日条改菱形 + 标签挪到菱形右侧(frappe-gantt 1.x 无内置里程碑) */
function fixMilestoneBars(root: HTMLElement) {
  root.querySelectorAll<SVGRectElement>(`.${MILESTONE_CLASS} .bar`).forEach((bar) => {
    // 去掉宽度补间动画,避免后处理被 SMIL 覆盖
    bar.querySelectorAll('animate').forEach((a) => a.remove())
    const x = Number(bar.getAttribute('x')) || 0
    const y = Number(bar.getAttribute('y')) || 0
    const size = 20
    // 菱形锚在条起点(即里程碑日期),宽高改方形供 CSS 旋转
    bar.setAttribute('x', String(x))
    bar.setAttribute('y', String(y + 5))
    bar.setAttribute('width', String(size))
    bar.setAttribute('height', String(size))
    const label = bar.closest('.bar-wrapper')?.querySelector<SVGTextElement>('.bar-label')
    if (label) {
      label.setAttribute('x', String(x + size + 10))
    }
  })
}

/** 项目甘特图(只读):任务条按起止日期展示、进度内条、里程碑渲染菱形,点击任务条打开编辑 */
export default function GanttChart({ tasks, loading, onSelectTask }: GanttChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<GanttViewMode>('Month')

  const ganttTasks = useMemo(() => {
    const byId = new Map<number, ProjTask>()
    const bars = tasks.flatMap((t) => {
      const range = taskGanttRange(t)
      if (!range) return []
      byId.set(t.id, t)
      const cls =
        t.is_milestone === 1
          ? MILESTONE_CLASS
          : t.status === 3
            ? DONE_CLASS
            : t.status === 4
              ? 'qzt-gantt-cancelled'
              : undefined
      return [
        {
          id: String(t.id),
          name: t.title,
          start: range.start,
          end: range.end,
          progress: Math.min(100, Math.max(0, Math.round(t.progress ?? 0))),
          custom_class: cls,
        },
      ]
    })
    return { bars, byId }
  }, [tasks])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el || ganttTasks.bars.length === 0) return
    el.innerHTML = ''
    const chart = new Gantt(el, ganttTasks.bars, {
      view_mode: viewMode,
      view_modes: [...GANTT_VIEW_MODES],
      date_format: 'YYYY-MM-DD',
      language: 'zh-CN',
      readonly: true,
      readonly_dates: true,
      readonly_progress: true,
      popup_on: 'click',
      today_button: false,
      view_mode_select: false,
      scroll_to: 'today',
      bar_height: 30,
      on_click: (bar) => {
        const origin = ganttTasks.byId.get(Number(bar.id))
        if (origin) onSelectTask(origin)
      },
    })
    fixMilestoneBars(el)
    return () => {
      el.innerHTML = ''
      void chart
    }
  }, [ganttTasks, viewMode, onSelectTask])

  if (loading) {
    return <Spin style={{ display: 'block', margin: '60px auto' }} />
  }
  if (ganttTasks.bars.length === 0) {
    return (
      <div style={{ padding: '48px 0' }}>
        <Empty description="暂无任务,或任务未设置开始/截止日期" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <Radio.Group
          size="small"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as GanttViewMode)}
          optionType="button"
          buttonStyle="solid"
          options={GANTT_VIEW_MODES.map((m) => ({ label: GANTT_VIEW_LABELS[m], value: m }))}
        />
        <span style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)' }}>
          共 {ganttTasks.bars.length} 条 · 里程碑 {tasks.filter((t) => t.is_milestone === 1).length} 个 · 点击任务条可编辑
        </span>
      </div>
      <div style={{ maxHeight: 520, overflow: 'auto' }}>
        <div ref={wrapperRef} />
      </div>
    </div>
  )
}
