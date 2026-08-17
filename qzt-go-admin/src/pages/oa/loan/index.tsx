import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteLoan, listLoans, markLoanRepaid, submitLoanApproval } from '../../../services/oa'
import { APPROVAL_STATUS_MAP, type OaLoan, canResubmitApproval} from '../../../types/oa'
import LoanEditModal from './EditModal'
import ApprovalFlowSetup from '../../../components/ApprovalFlowSetup'

const REPAY_TEXT: Record<number, string> = { 0: '未还', 1: '部分', 2: '已还清' }
const REPAY_COLOR: Record<number, string> = { 0: 'default', 1: 'warning', 2: 'success' }

export default function LoanPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleSubmit = async (record: OaLoan) => {
    await submitLoanApproval(record.id)
    message.success('已提交审批')
    actionRef.current?.reload()
  }

  const handleDelete = async (id: number) => {
    await deleteLoan(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const handleRepaid = async (id: number) => {
    await markLoanRepaid(id)
    message.success('已标记还清')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaLoan>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
    { title: '单号', dataIndex: 'loan_no', width: 150 },
    { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
    { title: '类型', dataIndex: 'loan_type', width: 100 },
    { title: '金额', dataIndex: 'amount', width: 100, search: false, render: (_, r) => `¥${r.amount}` },
    { title: '预计还款', dataIndex: 'expected_date', width: 110, search: false, render: (_, r) => r.expected_date?.slice(0, 10) || '-' },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      width: 100,
      render: (_, r) => {
        const s = APPROVAL_STATUS_MAP[r.approval_status] ?? APPROVAL_STATUS_MAP.NONE
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '还款',
      dataIndex: 'repaid_status',
      width: 80,
      search: false,
      render: (_, r) => <Tag color={REPAY_COLOR[r.repaid_status]}>{REPAY_TEXT[r.repaid_status]}</Tag>,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {canResubmitApproval(record.approval_status) && (
            <Popconfirm title="提交审批?" okText="提交" cancelText="取消" onConfirm={() => handleSubmit(record)}>
              <Button type="link" size="small">提交审批</Button>
            </Popconfirm>
          )}
          {canResubmitApproval(record.approval_status) && (
            <Auth perm="oa:loan:edit">
              <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
            </Auth>
          )}
          {record.approval_status === 'APPROVED' && record.repaid_status !== 2 && (
            <Auth perm="oa:loan:repay">
              <Popconfirm title="确认标记已还清?" okText="确认" cancelText="取消" onConfirm={() => handleRepaid(record.id)}>
                <Button type="link" size="small">还款</Button>
              </Popconfirm>
            </Auth>
          )}
          {record.approval_status === 'NONE' && (
            <Auth perm="oa:loan:delete">
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
      <ProTable<OaLoan>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listLoans({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="oa:loan:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新增借款</Button>
          </Auth>,
        ]}
        headerTitle={
          <Space align="center">
            <span>借款管理</span>
            <ApprovalFlowSetup formType="LOAN" label="借款审批" />
          </Space>
        }
      />
      <LoanEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
    </>
  )
}
