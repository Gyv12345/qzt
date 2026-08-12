import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, FunnelChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Spin } from 'antd'
import type { EChartsOption } from 'echarts'

// 按需注册:仅引入实际用到的图表(pie/bar/line/funnel)与组件,避免全量打包 echarts 进首屏
echarts.use([CanvasRenderer, PieChart, BarChart, LineChart, FunnelChart, GridComponent, LegendComponent, TooltipComponent])

interface ChartProps {
  option: EChartsOption
  height?: number
  loading?: boolean
}

/**
 * ECharts 封装组件,自动初始化/resize/销毁。
 * 统一主题色,与 antd 蓝色主色一致。
 */
export default function Chart({ option, height = 320, loading = false }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    chartRef.current = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, true)
    }
  }, [option])

  return (
    <Spin spinning={loading}>
      <div ref={ref} style={{ width: '100%', height }} />
    </Spin>
  )
}

// ── 图表配置工厂(统一配色) ──
// 第一色与品牌主色 #2f54eb 对齐,后续为同色系渐变 + 互补强调色,避免与 antd 主色打架
const PALETTE = ['#2f54eb', '#597ef7', '#85a5ff', '#ff4d4f', '#faad14', '#52c41a', '#13c2c2', '#722ed1', '#eb2f96', '#fa8c16']

/** 饼图配置 */
export function pieOption(_title: string, data: { name: string; value: number }[]): EChartsOption {
  return {
    color: PALETTE,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [{ type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'], data, label: { formatter: '{b}\n{d}%' } }],
  }
}

/** 柱状图配置 */
export function barOption(
  _title: string,
  categories: string[],
  series: { name: string; data: number[] }[],
  horizontal = false,
): EChartsOption {
  return {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, show: series.length > 1 },
    grid: { left: horizontal ? 100 : 40, right: 20, top: 20, bottom: series.length > 1 ? 40 : 20 },
    xAxis: horizontal ? { type: 'value' } : { type: 'category', data: categories, axisLabel: { rotate: categories.length > 6 ? 30 : 0 } },
    yAxis: horizontal ? { type: 'category', data: categories, axisLabel: { width: 80, overflow: 'truncate' } } : { type: 'value' },
    series: series.map((s) => ({ ...s, type: 'bar', barMaxWidth: 40 })),
  }
}

/** 折线图配置 */
export function lineOption(
  _title: string,
  categories: string[],
  series: { name: string; data: number[] }[],
): EChartsOption {
  return {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, show: series.length > 1 },
    grid: { left: 50, right: 20, top: 20, bottom: series.length > 1 ? 40 : 20 },
    xAxis: { type: 'category', data: categories, boundaryGap: false },
    yAxis: { type: 'value' },
    series: series.map((s) => ({
      ...s,
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.1 },
    })),
  }
}

/** 漏斗图配置 */
export function funnelOption(_title: string, data: { name: string; value: number }[]): EChartsOption {
  return {
    color: PALETTE,
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [{ type: 'funnel', left: '10%', right: '10%', top: 10, bottom: 10, width: '80%', data, gap: 2, label: { show: true, position: 'inside' } }],
  }
}
