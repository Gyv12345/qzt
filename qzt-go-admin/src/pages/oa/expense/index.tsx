import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import { deleteExpense, listExpenses, markExpensePaid, submitExpenseApproval } from '../../../services/oa'
import { APPROVAL_STATUS_MAP, type OaExpense, canResubmitApproval} from '../../../types/oa'
import ExpenseEditModal from './EditModal'
import ExpenseDetailDrawer from './DetailDrawer'
import ApprovalFlowSetup from '../../../components/ApprovalFlowSetup'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function ExpensePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setEditOpen(true)
  }

  const openEdit = (id: number) => {
    setEditingId(id)
    setEditOpen(true)
  }

  const openDetail = (id: number) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  const handleSubmitApproval = async (record: OaExpense) => {
    await submitExpenseApproval(record.id)
    message.success('已提交审批')
    actionRef.current?.reload()
  }

  const handleDelete = async (id: number) => {
    await deleteExpense(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const handleMarkPaid = async (id: number) => {
    await markExpensePaid(id)
    message.success('已标记打款')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaExpense>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    {
      title: '报销单号',
      dataIndex: 'expense_no',
      width: 150,
      render: (_, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openDetail(r.id)}>
          {r.expense_no}
        </Button>
      ),
    },
    { title: '标题', dataIndex: 'title', width: 200, ellipsis: true },
    {
      title: '费用类型',
      dataIndex: 'expense_type',
      width: 100,
      renderFormItem: () => <DictSelect code="EXPENSE_TYPE" placeholder="全部" />,
      render: (_, r) => <DictTag code="EXPENSE_TYPE" value={r.expense_type} />,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      search: false,
      render: (_, r) => `¥${Number(r.amount).toFixed(2)}`,
    },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      width: 100,
      renderFormItem: () => <DictSelect code="EXPENSE_TYPE" placeholder="全部" />,
      render: (_, r) => {
        const s = APPROVAL_STATUS_MAP[r.approval_status] ?? APPROVAL_STATUS_MAP.NONE
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '打款',
      dataIndex: 'payment_status',
      width: 80,
      search: false,
      render: (_, r) =>
        r.payment_status === 1 ? <Tag color="success">已打款</Tag> : <Tag>未打款</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 160, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {canResubmitApproval(record.approval_status) && (
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
          {canResubmitApproval(record.approval_status) && (
            <Auth perm="oa:expense:edit">
              <Button type="link" size="small" onClick={() => openEdit(record.id)}>
                编辑
              </Button>
            </Auth>
          )}
          {record.approval_status === 'APPROVED' && record.payment_status === 0 && (
            <Auth perm="oa:expense:pay">
              <Popconfirm
                title="确认标记已打款?"
                okText="确认"
                cancelText="取消"
                onConfirm={() => handleMarkPaid(record.id)}
              >
                <Button type="link" size="small">
                  打款
                </Button>
              </Popconfirm>
            </Auth>
          )}
          {record.approval_status === 'NONE' && (
            <Auth perm="oa:expense:delete">
              <Popconfirm
                title="确认删除?"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={() => handleDelete(record.id)}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<OaExpense>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listExpenses({
            page: current || 1,
            page_size: pageSize || 10,
            ...rest,
          })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="oa:expense:add" key="add">
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增报销
            </Button>
          </Auth>,
        ]}
        headerTitle={
          <Space align="center">
            <span>报销管理</span>
            <ApprovalFlowSetup formType="EXPENSE" label="报销审批" />
          </Space>
        }
      />
      <ExpenseEditModal
        open={editOpen}
        editingId={editingId}
        onOpenChange={setEditOpen}
        onSuccess={() => actionRef.current?.reload()}
      />
      <ExpenseDetailDrawer
        open={detailOpen}
        expenseId={detailId}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
