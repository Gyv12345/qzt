import { useRef, useState } from 'react'
import { Button, Tag, Typography } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { listMyProcessed } from '../../../services/approval'
import type { ApprovalTask } from '../../../types/approval'
import InstanceDrawer from '../InstanceDrawer'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function ApprovalDonePage() {
  const actionRef = useRef<ActionType>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerInstanceId, setDrawerInstanceId] = useState<number | null>(null)

  const openDetail = (record: ApprovalTask) => {
    setDrawerInstanceId(record.instance_id ?? null)
    setDrawerOpen(true)
  }

  const columns: ProColumns<ApprovalTask>[] = [
    pageIndexColumn(actionRef),
    {
      title: '类型',
      width: 100,
      search: false,
      render: (_, record) => record.instance?.form_type_label || record.instance?.type || '-',
    },
    {
      title: '标题',
      width: 240,
      search: false,
      ellipsis: true,
      render: (_, record) => {
        const title = record.instance?.resource_title
        return title ? (
          <Typography.Link onClick={() => openDetail(record)}>{title}</Typography.Link>
        ) : (
          '-'
        )
      },
    },
    { title: '轮次', dataIndex: 'node_round', width: 70, search: false },
    {
      title: '我的操作',
      dataIndex: 'action',
      width: 90,
      search: false,
      render: (_, record) =>
        record.action === 'APPROVE' ? (
          <Tag color="success">通过</Tag>
        ) : record.action === 'REJECT' ? (
          <Tag color="error">驳回</Tag>
        ) : (
          <Tag>{record.action || '-'}</Tag>
        ),
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => openDetail(record)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <>
      <ProTable<ApprovalTask>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listMyProcessed({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        headerTitle="我的已办"
      />
      <InstanceDrawer
        instanceId={drawerInstanceId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
