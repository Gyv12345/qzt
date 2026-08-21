import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Form, Input, Tag } from 'antd-mobile'
import { getOrderByNo } from '../../services/mall'
import type { PublicOrder } from '../../types/mall'

const statusColor: Record<number, string> = {
  1: 'warning',
  2: 'primary',
  3: 'success',
  4: 'default',
}

/** 订单查询:凭下单返回的订单号查状态与明细 */
export default function OrderQuery() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [error, setError] = useState('')
  const [querying, setQuerying] = useState(false)
  const [form] = Form.useForm()
  const initialNo = params.get('no') ?? ''

  const query = async (orderNo: string) => {
    if (!orderNo.trim()) return
    setQuerying(true)
    setError('')
    setOrder(null)
    try {
      setOrder(await getOrderByNo(orderNo.trim()))
    } catch {
      setError('未找到该订单,请核对订单号')
    } finally {
      setQuerying(false)
    }
  }

  // URL 带订单号进入时自动查询一次
  useEffect(() => {
    if (initialNo) query(initialNo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNo])

  return (
    <div className="page">
      <div className="topbar">
        <a className="topbar-back" onClick={() => navigate(-1)}>
          ‹
        </a>
        <div className="topbar-title">订单查询</div>
        <div style={{ width: 26 }} />
      </div>

      <div style={{ padding: '10px 12px 0' }}>
        <div className="card">
          <Form
            layout="horizontal"
            form={form}
            onFinish={(values) => query(String(values.order_no || ''))}
            footer={
              <Button
                block
                color="primary"
                loading={querying}
                style={{
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                  border: 'none',
                }}
                onClick={() => form.submit()}
              >
                查询
              </Button>
            }
          >
            <Form.Item name="order_no" label="订单号" initialValue={initialNo} rules={[{ required: true, message: '请输入订单号' }]}>
              <Input placeholder="下单时返回的订单号(MO 开头)" clearable />
            </Form.Item>
          </Form>

          {error && <div style={{ textAlign: 'center', color: 'var(--adm-color-danger)', fontSize: 13, padding: 12 }}>{error}</div>}
        </div>

        {order && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{order.order_no}</span>
              <div style={{ flex: 1 }} />
              <Tag color={statusColor[order.status] ?? 'default'} fill="outline">
                {order.status_label}
              </Tag>
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, margin: '6px 0 10px' }}>下单时间 {order.created_at}</div>
            {order.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', fontSize: 14, padding: '5px 0', color: 'var(--ink)' }}>
                <span style={{ flex: 1 }}>{it.product_name}</span>
                <span style={{ color: 'var(--ink-3)', margin: '0 8px' }}>×{Number(it.quantity)}</span>
                <span>¥{Number(it.amount).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ textAlign: 'right', marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)', fontSize: 14 }}>
              合计 <span className="price" style={{ fontSize: 20 }}>¥{Number(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
