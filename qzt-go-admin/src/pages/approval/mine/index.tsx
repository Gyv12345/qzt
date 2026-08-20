import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listMyInitiated, revokeApprovalInstance } from '../../../services/approval'
import type { ApprovalInstance } from '../../../types/approval'
import InstanceDrawer from '../InstanceDrawer'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function ApprovalMinePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerInstanceId, setDrawerInstanceId] = useState<number | null>(null)

  const openDetail = (record: ApprovalInstance) => {
    setDrawerInstanceId(record.id)
    setDrawerOpen(true)
  }

  const handleRevoke = async (record: ApprovalInstance) => {
    await revokeApprovalInstance(record.id)
    message.success('已撤回')
    actionRef.current?.reload()
  }

  const columns: ProColumns<ApprovalInstance>[] = [
    pageIndexColumn(actionRef),
    {
      title: '类型',
      dataIndex: 'form_type_label',
      width: 100,
      search: false,
      render: (_, record) => record.form_type_label || record.type || '-',
    },
    {
      title: '标题',
      dataIndex: 'resource_title',
      width: 240,
      search: false,
      ellipsis: true,
      render: (_, record) => record.resource_title || '-',
    },
    {
      title: '状态',
      dataIndex: 'approval_status',
      width: 100,
      search: false,
      render: (_, record) => {
        switch (record.approval_status) {
          case 'PENDING':
          case 'APPROVING':
            return <Tag color="processing">审批中</Tag>
          case 'APPROVED':
            return <Tag color="success">已通过</Tag>
          case 'REJECTED':
          case 'UNAPPROVED':
            return <Tag color="error">已驳回</Tag>
          case 'REVOKED':
            return <Tag>已撤回</Tag>
          default:
            return <Tag>{record.approval_status || '-'}</Tag>
        }
      },
    },
    {
      title: '提交时间',
      dataIndex: 'submit_time',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {(record.approval_status === 'PENDING' || record.approval_status === 'APPROVING') && (
            <Auth perm="approval:mine:revoke">
              <Popconfirm
                title="确认撤回该审批?"
                okText="撤回"
                cancelText="取消"
                onConfirm={() => handleRevoke(record)}
              >
                <Button type="link" size="small" danger>
                  撤回
                </Button>
              </Popconfirm>
            </Auth>
          )}
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<ApprovalInstance>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listMyInitiated({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        headerTitle="我发起的"
      />
      <InstanceDrawer
        instanceId={drawerInstanceId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
