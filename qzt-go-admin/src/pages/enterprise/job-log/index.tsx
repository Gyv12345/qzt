import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { listJobLogs } from '../../../services/enterprise'
import type { EntJobLog } from '../../../types/enterprise'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function JobLogPage() {
  const actionRef = useRef<ActionType>(null)
  const [searchParams] = useSearchParams()
  const jobIdParam = searchParams.get('job_id')
  const initialJobId = jobIdParam ? Number(jobIdParam) : undefined

  const columns: ProColumns<EntJobLog>[] = [
    pageIndexColumn(actionRef),
    { title: 'ID', dataIndex: 'id', width: 90, search: false },
    {
      title: '任务ID',
      dataIndex: 'job_id',
      width: 90,
      hideInTable: true,
      valueType: 'digit',
    },
    { title: '任务ID', dataIndex: 'job_id', width: 90, search: false },
    {
      title: '任务名',
      dataIndex: 'job_name',
      width: 160,
      search: false,
      render: (_, record) => record.job_name ?? '-',
    },
    {
      title: '处理器',
      dataIndex: 'bean_class',
      width: 180,
      search: false,
      render: (_, record) => record.bean_class ?? '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      search: false,
      render: (_, record) => record.status ?? '-',
    },
    {
      title: '信息',
      dataIndex: 'message',
      width: 200,
      ellipsis: true,
      search: false,
      render: (_, record) => record.message ?? '-',
    },
    {
      title: '错误',
      dataIndex: 'error',
      width: 200,
      ellipsis: true,
      search: false,
      render: (_, record) => record.error ?? '-',
    },
    {
      title: '耗时(ms)',
      dataIndex: 'cost',
      width: 90,
      search: false,
      render: (_, record) => record.cost ?? '-',
    },
    {
      title: '执行时间',
      dataIndex: 'execute_time',
      valueType: 'dateTime',
      width: 170,
      search: false,
      render: (_, record) => record.execute_time ?? '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
      render: (_, record) => record.created_at ?? '-',
    },
  ]

  return (
    <ProTable<EntJobLog>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      scroll={{ x: 'max-content' }}
      form={{ initialValues: { job_id: initialJobId } }}
      request={async ({ current, pageSize, ...rest }) => {
        const res = await listJobLogs({ page: current, page_size: pageSize, ...rest })
        return { data: res.list, total: res.total, success: true }
      }}
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      headerTitle="任务执行日志"
    />
  )
}
