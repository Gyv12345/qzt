import { useEffect, useState } from 'react'
import { Descriptions, Drawer, Spin, Table, Tag } from 'antd'
import { DictTag } from '../../../components/DictSelect'
import { getExpense } from '../../../services/oa'
import { APPROVAL_STATUS_MAP, type OaExpenseDetail } from '../../../types/oa'

interface DetailDrawerProps {
  open: boolean
  expenseId: number | null
  onOpenChange: (open: boolean) => void
}

export default function ExpenseDetailDrawer({ open, expenseId, onOpenChange }: DetailDrawerProps) {
  const [detail, setDetail] = useState<OaExpenseDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !expenseId) return
    setLoading(true)
    getExpense(expenseId)
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [open, expenseId])

  const e = detail?.expense
  const statusInfo = e ? APPROVAL_STATUS_MAP[e.approval_status] ?? APPROVAL_STATUS_MAP.NONE : APPROVAL_STATUS_MAP.NONE

  const columns = [
    { title: '类型', dataIndex: 'item_type', width: 120 },
    { title: '金额', dataIndex: 'amount', width: 120, render: (v: string) => `¥${Number(v).toFixed(2)}` },
    { title: '日期', dataIndex: 'occur_date', width: 120 },
    { title: '发票号', dataIndex: 'invoice_no', width: 120 },
    { title: '备注', dataIndex: 'remark' },
  ]

  return (
    <Drawer
      title="报销单详情"
      open={open}
      onClose={() => onOpenChange(false)}
      width={680}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      ) : detail && e ? (
        <>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="单号">{e.expense_no}</Descriptions.Item>
            <Descriptions.Item label="审批状态">
              <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="标题" span={2}>{e.title}</Descriptions.Item>
            <Descriptions.Item label="费用类型">
              <DictTag code="EXPENSE_TYPE" value={e.expense_type} />
            </Descriptions.Item>
            <Descriptions.Item label="金额">¥{Number(e.amount).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="发生日期">{e.occur_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="打款状态">
              {e.payment_status === 1 ? <Tag color="success">已打款</Tag> : <Tag>未打款</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{e.created_at}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{e.updated_at}</Descriptions.Item>
            {e.description && (
              <Descriptions.Item label="说明" span={2}>{e.description}</Descriptions.Item>
            )}
          </Descriptions>

          <h3 style={{ marginTop: 24, marginBottom: 12 }}>费用明细</h3>
          <Table
            size="small"
            rowKey="id"
            dataSource={detail.items}
            columns={columns}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 80, color: '#999' }}>无数据</div>
      )}
    </Drawer>
  )
}
