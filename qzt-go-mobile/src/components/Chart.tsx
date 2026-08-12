import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart as EBarChart, FunnelChart as EFunnelChart, LineChart as ELineChart, PieChart as EPieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册图表与组件(控制打包体积)
echarts.use([
  EBarChart,
  EFunnelChart,
  ELineChart,
  EPieChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent,
  CanvasRenderer,
])

const PALETTE = ['#2f54eb', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

export interface PieData {
  name: string
  value: number
}
export interface LineSeries {
  name: string
  data: number[]
}

/** 环形饼图 */
export function PieChart({ data, height = 240 }: { data: PieData[]; height?: number }) {
  const option = {
    color: PALETTE,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        label: { fontSize: 10 },
        data,
      },
    ],
  }
  return <ReactEChartsCore echarts={echarts} option={option} style={{ height }} />
}

/** 折线图(面积) */
export function LineChart({
  categories,
  series,
  height = 240,
}: {
  categories: string[]
  series: LineSeries[]
  height?: number
}) {
  const option = {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 12, top: 16, bottom: 36, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: categories, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.1 },
      data: s.data,
    })),
  }
  return <ReactEChartsCore echarts={echarts} option={option} style={{ height }} />
}

/** 柱状图(可横向) */
export function BarChart({
  categories,
  series,
  horizontal = false,
  height = 240,
}: {
  categories: string[]
  series: LineSeries[]
  horizontal?: boolean
  height?: number
}) {
  const option = {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: horizontal
      ? { type: 'value', axisLabel: { fontSize: 10 } }
      : { type: 'category', data: categories, axisLabel: { fontSize: 10 } },
    yAxis: horizontal
      ? { type: 'category', data: categories, axisLabel: { fontSize: 10 }, inverse: true }
      : { type: 'value', axisLabel: { fontSize: 10 } },
    series: series.map((s) => ({
      name: s.name,
      type: 'bar',
      barMaxWidth: 28,
      data: s.data,
    })),
  }
  return <ReactEChartsCore echarts={echarts} option={option} style={{ height }} />
}

/** 漏斗图 */
export function FunnelChart({ data, height = 260 }: { data: PieData[]; height?: number }) {
  const option = {
    color: PALETTE,
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [
      {
        type: 'funnel',
        left: '10%',
        width: '80%',
        gap: 2,
        label: { show: true, position: 'inside', fontSize: 11 },
        data,
      },
    ],
  }
  return <ReactEChartsCore echarts={echarts} option={option} style={{ height }} />
}
