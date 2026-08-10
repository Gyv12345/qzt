import { useRef, useState } from 'react'
import { Button, Tag } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { listMyProcessed } from '../../../services/approval'
import type { ApprovalRecord } from '../../../types/approval'
import InstanceDrawer from '../InstanceDrawer'

export default function ApprovalDonePage() {
  const actionRef = useRef<ActionType>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerInstanceId, setDrawerInstanceId] = useState<number | null>(null)

  const openDetail = (record: ApprovalRecord) => {
    setDrawerInstanceId(record.instance_id ?? null)
    setDrawerOpen(true)
  }

  const columns: ProColumns<ApprovalRecord>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '实例 ID', dataIndex: 'instance_id', width: 90, search: false },
    { title: '轮次', dataIndex: 'node_round', width: 70, search: false },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      search: false,
      render: (_, record) =>
        record.result === 'APPROVE' ? (
          <Tag color="success">通过</Tag>
        ) : record.result === 'REJECT' ? (
          <Tag color="error">驳回</Tag>
        ) : (
          <Tag>{record.result || '-'}</Tag>
        ),
    },
    { title: '意见', dataIndex: 'comment', width: 200, search: false, ellipsis: true },
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
      <ProTable<ApprovalRecord>
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
