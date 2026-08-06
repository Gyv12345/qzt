/**
 * ExportButtons — 通用导出按钮组件(CSV + Excel)。
 *
 * 从 ProTable 的 dataSource 里取当前列表数据,直接生成文件下载。
 * 不需要后端改动,纯前端实现。
 *
 * 用法:
 * <ExportButtons fileName="客户列表" columns={columns} dataSource={dataSource} />
 *
 * 或者如果 ProTable 用的是 request 模式(没有 dataSource),
 * 传一个 fetchAll 函数一次性拉全量数据:
 * <ExportButtons fileName="客户列表" columns={columns} fetchAll={async () => { ... return list }} />
 */

import { Button, Dropdown, type ButtonProps } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import type { ProColumns } from '@ant-design/pro-components'

interface ExportButtonsProps<T = any> {
  fileName: string
  columns: ProColumns<T>[]
  /** 当前页面已有数据(优先用) */
  dataSource?: T[]
  /** 拉全量数据的函数(dataSource 为空或需要导出全部时用) */
  fetchAll?: () => Promise<T[]>
  buttonProps?: ButtonProps
}

/** 从 ProColumns 提取可导出的列(有 dataIndex 且 search !== false 或 hideInTable !== true) */
function getExportColumns<T>(columns: ProColumns<T>[]) {
  return columns.filter((c) => {
    // 排除操作列、序号列
    if (c.valueType === 'option' || c.valueType === 'indexBorder') return false
    // 只要有 dataIndex 就可以导出
    return c.dataIndex || c.key
  })
}

/** 获取单元格的显示值:优先用 render 的结果,否则取 dataIndex 的值 */
function getCellValue<T>(record: T, col: ProColumns<T>): string {
  const dataKey = (col.dataIndex || col.key) as string
  let value: any = (record as any)[dataKey]

  // 如果有 valueEnum,转换成文本
  if (col.valueEnum && value !== undefined && value !== null) {
    const enumItem = (col.valueEnum as any)[value]
    if (enumItem?.text) return String(enumItem.text)
  }

  if (value === undefined || value === null) return ''
  return String(value)
}

/** 生成 CSV 字符串 */
function toCSV<T>(data: T[], columns: ProColumns<T>[]): string {
  const cols = getExportColumns(columns)
  const headers = cols.map((c) => String(c.title || '')).join(',')
  const rows = data.map((record) =>
    cols
      .map((col) => {
        const val = getCellValue(record, col)
        // CSV 转义:含逗号/引号/换行的用双引号包裹
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      })
      .join(','),
  )
  // 加 BOM 头让 Excel 正确识别 UTF-8
  return '\uFEFF' + [headers, ...rows].join('\n')
}

/** 生成简单的 Excel(用 HTML table 格式,Excel 能打开) */
function toExcelHTML<T>(data: T[], columns: ProColumns<T>[], fileName: string): string {
  const cols = getExportColumns(columns)
  const headers = cols.map((c) => `<th>${c.title || ''}</th>`).join('')
  const rows = data
    .map(
      (record) =>
        `<tr>${cols.map((col) => `<td>${escapeHtml(getCellValue(record, col))}</td>`).join('')}</tr>`,
    )
    .join('')
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${fileName}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table border="1"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></body></html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export default function ExportButtons<T extends Record<string, any>>({
  fileName,
  columns,
  dataSource,
  fetchAll,
  buttonProps,
}: ExportButtonsProps<T>) {
  const handleExport = async (format: 'csv' | 'excel') => {
    let data: T[] = dataSource || []
    // 如果没有 dataSource 或者有 fetchAll,拉全量
    if (fetchAll) {
      data = await fetchAll()
    }
    if (!data || data.length === 0) {
      return
    }
    const date = new Date().toISOString().slice(0, 10)
    if (format === 'csv') {
      downloadFile(toCSV(data, columns), `${fileName}_${date}.csv`, 'text/csv;charset=utf-8')
    } else {
      downloadFile(
        toExcelHTML(data, columns, `${fileName}_${date}`),
        `${fileName}_${date}.xls`,
        'application/vnd.ms-excel',
      )
    }
  }

  return (
    <Dropdown
      key="export"
      menu={{
        items: [
          { key: 'csv', label: '导出 CSV' },
          { key: 'excel', label: '导出 Excel' },
        ],
        onClick: ({ key }) => handleExport(key as 'csv' | 'excel'),
      }}
    >
      <Button icon={<DownloadOutlined />} {...buttonProps}>
        导出
      </Button>
    </Dropdown>
  )
}
