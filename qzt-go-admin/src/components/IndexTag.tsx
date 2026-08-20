import type { RefObject } from 'react'
import type { ActionType, ProColumns } from '@ant-design/pro-components'

/**
 * 序号/排名胶囊,复刻 ProTable valueType="indexBorder" 的样式(前三名深色高亮,之后灰色)。
 * 用于原生 antd Table 的序号列,保持与全站 ProTable 序号样式一致。
 */
export default function IndexTag({ index }: { index: number }) {
  const no = index + 1
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 4px',
        boxSizing: 'border-box',
        fontSize: 12,
        lineHeight: '12px',
        color: '#fff',
        borderRadius: 9,
        backgroundColor: no > 3 ? '#979797' : '#314659',
      }}
    >
      {no}
    </span>
  )
}

/**
 * 「编号」列(普通分页表格):跨分页连续序号(第 2 页接续上一页编号),
 * 胶囊样式与 valueType="indexBorder" 一致。树状表格勿用(子行编号无意义)。
 */
export function pageIndexColumn<T extends object>(
  actionRef: RefObject<ActionType | null | undefined>,
  overrides?: ProColumns<T>,
): ProColumns<T> {
  return {
    title: '编号',
    width: 70,
    search: false,
    ...overrides,
    render: (_dom, _record, index) => {
      const { current = 1, pageSize = 10 } = actionRef.current?.pageInfo ?? {}
      return <IndexTag index={(current - 1) * pageSize + index} />
    },
  }
}
