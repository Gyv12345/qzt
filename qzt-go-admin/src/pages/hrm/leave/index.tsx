import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import { approveLeave, listLeaves, submitLeaveApproval } from '../../../services/hrm'
import { LEAVE_APPROVAL_STATUS, type HrmLeave } from '../../../types/hrm'
import LeaveEditModal from './EditModal'
import ApprovalFlowSetup from '../../../components/ApprovalFlowSetup'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function LeavePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)

  const handleSubmitApproval = async (record: HrmLeave) => {
    await submitLeaveApproval(record.id)
    message.success('已提交审批')
    actionRef.current?.reload()
  }

  const handleQuickApprove = async (record: HrmLeave) => {
    await approveLeave(record.id, true, '快速通过')
    message.success('已通过')
    actionRef.current?.reload()
  }

  const columns: ProColumns<HrmLeave>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '单号', dataIndex: 'leave_no', width: 150 },
    {
      title: '请假类型',
      dataIndex: 'leave_type',
      width: 100,
      renderFormItem: () => <DictSelect code="LEAVE_TYPE" placeholder="全部" />,
      render: (_, r) => <DictTag code="LEAVE_TYPE" value={r.leave_type} />,
    },
    { title: '开始', dataIndex: 'start_date', width: 160, search: false },
    { title: '结束', dataIndex: 'end_date', width: 160, search: false },
    { title: '天数', dataIndex: 'duration_days', width: 80, search: false },
    { title: '事由', dataIndex: 'reason', width: 180, ellipsis: true, search: false },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      width: 100,
      render: (_, r) => {
        const s = LEAVE_APPROVAL_STATUS[r.approval_status] ?? LEAVE_APPROVAL_STATUS.NONE
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    { title: '创建时间', dataIndex: 'created_at', width: 160, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.approval_status === 'NONE' && (
            <Popconfirm
              title="提交审批?"
              okText="提交"
              cancelText="取消"
              onConfirm={() => handleSubmitApproval(record)}
            >
              <Button type="link" size="small">
                提交审批
              </Button>
            </Popconfirm>
          )}
          {record.approval_status === 'NONE' && (
            <Button type="link" size="small" onClick={() => handleQuickApprove(record)}>
              快速通过
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<HrmLeave>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listLeaves({
            page: current || 1,
            page_size: pageSize || 10,
            ...rest,
          })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="hrm:leave:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditOpen(true)}>
              申请请假
            </Button>
          </Auth>,
        ]}
        headerTitle={
          <Space align="center">
            <span>请假管理</span>
            <ApprovalFlowSetup formType="LEAVE" label="请假审批" />
          </Space>
        }
      />
      <LeaveEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => actionRef.current?.reload()}
      />
    </>
  )
}
