import { useRef, useState } from 'react'
import { App, Button, Modal, Form, InputNumber, Input, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listReceivables, settleReceivable } from '../../../services/finance'
import { SETTLE_STATUS, type FinReceivable } from '../../../types/finance'
import ReceivableEditModal from './EditModal'
import { pageIndexColumn } from '../../../components/IndexTag'

const DIRECTION_TEXT: Record<string, { text: string; color: string }> = {
  RECEIVABLE: { text: '应收', color: 'blue' },
  PAYABLE: { text: '应付', color: 'orange' },
}

export default function ReceivablePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [settleTarget, setSettleTarget] = useState<FinReceivable | null>(null)
  const [settleForm] = Form.useForm<{ amount: number; remark?: string }>()

  const openSettle = (record: FinReceivable) => {
    setSettleTarget(record)
    const remaining = Number(record.original_amount) - Number(record.settled_amount)
    settleForm.setFieldsValue({ amount: remaining, remark: '' })
  }

  const handleSettle = async () => {
    if (!settleTarget) return
    const values = await settleForm.validateFields()
    await settleReceivable(settleTarget.id, String(values.amount), values.remark)
    message.success('结算成功')
    setSettleTarget(null)
    actionRef.current?.reload()
  }

  const columns: ProColumns<FinReceivable>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '单号', dataIndex: 'doc_no', width: 150 },
    {
      title: '方向',
      dataIndex: 'direction',
      width: 80,
      render: (_, r) => {
        const d = DIRECTION_TEXT[r.direction] || { text: r.direction, color: 'default' }
        return <Tag color={d.color}>{d.text}</Tag>
      },
    },
    { title: '往来方', dataIndex: 'party_name', width: 160, ellipsis: true },
    { title: '发生日期', dataIndex: 'occur_date', width: 110, search: false, render: (_, r) => r.occur_date?.slice(0, 10) },
    { title: '到期', dataIndex: 'due_date', width: 110, search: false, render: (_, r) => r.due_date?.slice(0, 10) || '-' },
    { title: '原始金额', dataIndex: 'original_amount', width: 110, search: false, render: (_, r) => `¥${Number(r.original_amount).toFixed(2)}` },
    { title: '已结算', dataIndex: 'settled_amount', width: 110, search: false, render: (_, r) => `¥${Number(r.settled_amount).toFixed(2)}` },
    {
      title: '剩余',
      width: 110,
      search: false,
      render: (_, r) => {
        const remaining = Number(r.original_amount) - Number(r.settled_amount)
        return remaining > 0 ? <span style={{ color: '#cf1322' }}>¥{remaining.toFixed(2)}</span> : <span>¥0.00</span>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_, r) => {
        const s = SETTLE_STATUS[r.status] || SETTLE_STATUS[0]
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status !== 2 && (
            <Auth perm="finance:receivable:settle">
              <Button type="link" size="small" onClick={() => openSettle(record)}>
                结算
              </Button>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<FinReceivable>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listReceivables({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="finance:receivable:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditOpen(true)}>
              新增往来
            </Button>
          </Auth>,
        ]}
        headerTitle="应收应付"
      />
      <ReceivableEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => actionRef.current?.reload()}
      />
      <Modal
        title={`结算 - ${settleTarget?.doc_no || ''}`}
        open={!!settleTarget}
        onOk={handleSettle}
        onCancel={() => setSettleTarget(null)}
        destroyOnHidden
      >
        {settleTarget && (
          <div style={{ marginBottom: 16, color: '#666' }}>
            往来方:{settleTarget.party_name} | 原始:¥{Number(settleTarget.original_amount).toFixed(2)} |
            已结:¥{Number(settleTarget.settled_amount).toFixed(2)} |
            剩余:¥{(Number(settleTarget.original_amount) - Number(settleTarget.settled_amount)).toFixed(2)}
          </div>
        )}
        <Form form={settleForm} layout="vertical">
          <Form.Item name="amount" label="本次结算金额" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} addonBefore="¥" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
