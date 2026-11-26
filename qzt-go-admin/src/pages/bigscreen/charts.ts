import type { EChartsOption } from 'echarts'

// 经营数据大屏专用 ECharts 暗色配置工厂。
// 图表组件复用 src/components/Chart.tsx(按需注册已含 line/bar/funnel),此处只负责出暗色 option。

/** 大屏暗色系调色板:青蓝为主,紫/绿/黄点缀 */
export const BS_PALETTE = ['#38bdf8', '#22d3ee', '#818cf8', '#34d399', '#fbbf24', '#f472b6', '#fb7185', '#a3e635']

const AXIS_TEXT = '#8aa3c7'
const SPLIT_LINE = 'rgba(80, 120, 180, 0.16)'
const TOOLTIP_BG = 'rgba(8, 15, 30, 0.92)'

const darkTooltip = {
  backgroundColor: TOOLTIP_BG,
  borderColor: '#2b4a7a',
  borderWidth: 1,
  textStyle: { color: '#d7e6ff', fontSize: 12 },
} as const

/** 近30天销售(回款)趋势:面积折线 */
export function trendOption(points: { date: string; amount: string }[]): EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...darkTooltip, valueFormatter: (v) => `¥${Number(v).toLocaleString()}` },
    grid: { left: 62, right: 20, top: 26, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((p) => p.date.slice(5)),
      axisLine: { lineStyle: { color: 'rgba(120, 160, 220, 0.35)' } },
      axisTick: { show: false },
      axisLabel: { color: AXIS_TEXT, interval: 3 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: AXIS_TEXT },
      splitLine: { lineStyle: { color: SPLIT_LINE } },
    },
    series: [
      {
        name: '回款金额',
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbolSize: 6,
        lineStyle: { width: 2, color: '#38bdf8' },
        itemStyle: { color: '#38bdf8', borderColor: '#0b1220', borderWidth: 1 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(56, 189, 248, 0.36)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.02)' },
            ],
          },
        },
        data: points.map((p) => Number(p.amount) || 0),
      },
    ],
  }
}

/** 商机漏斗(暗色) */
export function funnelDarkOption(
  points: { stage: string; count: number }[],
  stageLabel: (stage: string) => string,
): EChartsOption {
  return {
    backgroundColor: 'transparent',
    color: BS_PALETTE,
    tooltip: {
      trigger: 'item',
      ...darkTooltip,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- echarts 回调参数联合类型过宽,窄化反而不兼容
      formatter: (params: any) => `${params.name}:${params.value} 个`,
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        right: '10%',
        top: 14,
        bottom: 10,
        minSize: '22%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          color: '#eaf4ff',
          fontSize: 12,
          formatter: '{b}  {c}',
        },
        itemStyle: { borderColor: 'rgba(56, 189, 248, 0.45)', borderWidth: 1 },
        data: points.map((p, i) => ({
          name: stageLabel(p.stage),
          value: p.count,
          itemStyle: { color: BS_PALETTE[i % BS_PALETTE.length] },
        })),
      },
    ],
  }
}

/** 各阶段合同金额:横向渐变条形 */
export function stageBarOption(categories: string[], values: number[]): EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...darkTooltip,
      valueFormatter: (v) => `¥${Number(v).toLocaleString()}`,
    },
    grid: { left: 84, right: 70, top: 10, bottom: 10 },
    xAxis: {
      type: 'value',
      axisLabel: { color: AXIS_TEXT },
      splitLine: { lineStyle: { color: SPLIT_LINE } },
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: AXIS_TEXT, width: 76, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: values,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: 'rgba(56, 189, 248, 0.95)' },
              { offset: 1, color: 'rgba(34, 211, 238, 0.2)' },
            ],
          },
        },
        label: {
          show: true,
          position: 'right',
          color: '#9fdcff',
          fontSize: 11,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 同上,echarts 回调参数窄化不兼容
          formatter: (params: any) => Number(params.value).toLocaleString(),
        },
      },
    ],
  }
}
