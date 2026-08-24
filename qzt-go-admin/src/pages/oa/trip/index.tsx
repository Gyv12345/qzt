import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Select, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteTrip, listTrips, submitTripApproval } from '../../../services/oa'
import { APPROVAL_STATUS_MAP, APPROVAL_STATUS_OPTIONS, type OaBusinessTrip, canResubmitApproval} from '../../../types/oa'
import TripEditModal from './EditModal'
import ApprovalFlowSetup from '../../../components/ApprovalFlowSetup'
import { usePageGuide } from '../../../components/guide/usePageGuide'
import { GuideHelpButton } from '../../../components/guide/GuideHelpButton'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function TripPage() {
  usePageGuide('oa.trip')
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleSubmit = async (record: OaBusinessTrip) => {
    await submitTripApproval(record.id)
    message.success('已提交审批')
    actionRef.current?.reload()
  }

  const handleDelete = async (id: number) => {
    await deleteTrip(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaBusinessTrip>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '单号', dataIndex: 'trip_no', width: 150 },
    { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
    { title: '目的地', dataIndex: 'destination', width: 120 },
    { title: '出发', dataIndex: 'start_date', width: 120, search: false, render: (_, r) => r.start_date?.slice(0, 10) },
    { title: '返回', dataIndex: 'end_date', width: 120, search: false, render: (_, r) => r.end_date?.slice(0, 10) },
    { title: '交通', dataIndex: 'transport', width: 80, search: false },
    { title: '预算', dataIndex: 'budget_amount', width: 100, search: false, render: (_, r) => r.budget_amount ? `¥${r.budget_amount}` : '-' },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      width: 100,
      valueType: 'select',
      renderFormItem: () => <Select options={[...APPROVAL_STATUS_OPTIONS]} placeholder="全部" allowClear />,
      render: (_, r) => {
        const s = APPROVAL_STATUS_MAP[r.approval_status] ?? APPROVAL_STATUS_MAP.NONE
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: <span data-guide="action-column">操作</span>,
      valueType: 'option',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {canResubmitApproval(record.approval_status) && (
            <Popconfirm title="提交审批?" okText="提交" cancelText="取消" onConfirm={() => handleSubmit(record)}>
              <Button type="link" size="small">提交审批</Button>
            </Popconfirm>
          )}
          {canResubmitApproval(record.approval_status) && (
            <Auth perm="oa:trip:edit">
              <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
            </Auth>
          )}
          {record.approval_status === 'NONE' && (
            <Auth perm="oa:trip:delete">
              <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<OaBusinessTrip>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listTrips({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="oa:trip:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} data-guide="add" onClick={() => { setEditingId(null); setEditOpen(true) }}>新增出差</Button>
          </Auth>,
          <GuideHelpButton key="guide-help" />,
        ]}
        headerTitle={
          <Space align="center">
            <span>出差管理</span>
            <ApprovalFlowSetup formType="TRIP" label="出差审批" />
          </Space>
        }
      />
      <TripEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
    </>
  )
}
