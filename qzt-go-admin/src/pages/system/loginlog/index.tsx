import { useRef } from 'react'
import { Tag } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { listLoginLogs } from '../../../services/system'
import type { LoginLogQuery, SysLoginLog } from '../../../types'

export default function LoginLogPage() {
  const actionRef = useRef<ActionType>(null)

  const columns: ProColumns<SysLoginLog>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '用户名', dataIndex: 'username', width: 140 },
    { title: '动作', dataIndex: 'action', width: 120, search: false },
    {
      title: '结果',
      dataIndex: 'success',
      width: 90,
      valueType: 'select',
      valueEnum: {
        true: { text: '成功' },
        false: { text: '失败' },
      },
      render: (_, r) =>
        r.success ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>,
    },
    { title: 'IP 地址', dataIndex: 'client_ip', width: 140 },
    {
      title: 'User-Agent',
      dataIndex: 'user_agent',
      width: 280,
      search: false,
      ellipsis: true,
      render: (_, r) => r.user_agent || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '失败原因',
      dataIndex: 'error_msg',
      width: 220,
      search: false,
      render: (_, r) => (!r.success ? r.error_msg || '-' : '-'),
    },
  ]

  return (
    <ProTable<SysLoginLog, LoginLogQuery>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      scroll={{ x: 'max-content' }}
      search={{ labelWidth: 'auto' }}
      request={async ({ current: page, pageSize, ...rest }) => {
        const res = await listLoginLogs({ page, page_size: pageSize, ...rest })
        return { data: res.list, total: res.total, success: true }
      }}
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      headerTitle="登录日志"
      options={false}
    />
  )
}
