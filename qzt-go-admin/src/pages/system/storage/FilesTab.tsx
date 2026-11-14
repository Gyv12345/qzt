import { useRef } from 'react'
import { App, Button } from 'antd'
import type { ActionType, ProColumns } from '@ant-design/pro-components'
import { ProTable } from '@ant-design/pro-components'
import { pageIndexColumn } from '../../../components/IndexTag'
import { listStorageFiles } from '../../../services/system'
import type { StorageFile } from '../../../types/storage'

/** 字节数 → 人类可读(B/KB/MB/GB),保留 1 位小数 */
const formatSize = (bytes?: number) => {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Tab2 文件列表:平台全部上传文件总览 */
export default function FilesTab() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)

  const columns: ProColumns<StorageFile>[] = [
    pageIndexColumn<StorageFile>(actionRef, { width: 70 }),
    { title: '文件名', dataIndex: 'name', search: false, width: 280, ellipsis: true },
    {
      // 搜索栏单独的 keyword 条件(hideInTable),后端按文件名模糊匹配
      title: '文件名',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '按文件名搜索' },
    },
    { title: '大小', dataIndex: 'size', search: false, width: 110, render: (_, r) => formatSize(r.size) },
    { title: '上传人', dataIndex: 'uploader_name', search: false, width: 120, render: (_, r) => r.uploader_name || '-' },
    { title: '上传时间', dataIndex: 'created_at', search: false, width: 170, valueType: 'dateTime' },
    {
      title: '操作',
      valueType: 'option',
      width: 90,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="download"
          type="link"
          size="small"
          onClick={() => {
            if (!record.download_url) {
              message.warning('该文件没有可用的下载地址')
              return
            }
            window.open(record.download_url)
          }}
        >
          下载
        </Button>,
      ],
    },
  ]

  return (
    <ProTable<StorageFile>
      headerTitle="平台文件"
      actionRef={actionRef}
      rowKey="id"
      columns={columns}
      scroll={{ x: 'max-content' }}
      search={{ labelWidth: 'auto' }}
      pagination={{ defaultPageSize: 20, showSizeChanger: true }}
      request={async (params) => {
        const res = await listStorageFiles({
          page: params.current,
          page_size: params.pageSize,
          keyword: (params as { keyword?: string }).keyword || undefined,
        })
        return { data: res.list, total: res.total, success: true }
      }}
    />
  )
}
