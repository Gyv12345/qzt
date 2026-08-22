import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, TextArea } from 'antd-mobile'
import { createOrder } from '../../services/mall'
import { useCartStore, cartTotal } from '../../stores/cart'

/** 确认下单:收货信息表单 → 提交 → 展示订单号 */
export default function Checkout() {
  const navigate = useNavigate()
  const { items, clear } = useCartStore()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ orderNo: string; amount: string } | null>(null)
  const total = cartTotal(items)
  const [form] = Form.useForm()

  if (done) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="topbar-title">下单结果</div>
        </div>
        <div className="card" style={{ margin: 20, padding: '34px 24px', textAlign: 'center' }}>
          <div className="success-ring">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 14, color: 'var(--ink)' }}>下单成功</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 6 }}>
            合计 ¥{done.amount},商家确认后将联系您安排发货
          </div>
          <div className="order-no-box">{done.orderNo}</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 8 }}>请保存订单号,可用于查询进度</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <Button fill="outline" color="primary" style={{ flex: 1, borderRadius: 999 }} onClick={() => navigate(`/order/query?no=${done.orderNo}`)}>
              查看订单
            </Button>
            <Button
              color="primary"
              style={{
                flex: 1,
                borderRadius: 999,
                background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                border: 'none',
              }}
              onClick={() => navigate('/goods')}
            >
              继续逛逛
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="topbar">
          <a className="topbar-back" onClick={() => navigate(-1)}>
            ‹
          </a>
          <div className="topbar-title">确认下单</div>
          <div style={{ width: 26 }} />
        </div>
        <div className="empty-tip">没有待结算商品</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topbar">
        <a className="topbar-back" onClick={() => navigate(-1)}>
          ‹
        </a>
        <div className="topbar-title">确认下单</div>
        <div style={{ width: 26 }} />
      </div>

      <div style={{ padding: '10px 12px 0' }}>
        <div className="card">
          <div className="card-title">商品清单</div>
          {items.map((it) => (
            <div key={it.skuId} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', fontSize: 14 }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)' }}>
                {it.name}
                {it.spec && <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>({it.spec})</span>}
              </span>
              <span style={{ color: 'var(--ink-3)', margin: '0 8px' }}>×{it.quantity}</span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>¥{(Number(it.price) * it.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ textAlign: 'right', marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)', fontSize: 14 }}>
            合计 <span className="price" style={{ fontSize: 22 }}>¥{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">收货信息</div>
          <Form
            layout="vertical"
            form={form}
            onFinish={async (values) => {
              setSubmitting(true)
              try {
                const res = await createOrder({
                  items: items.map((it) => ({ product_id: it.productId, sku_id: it.skuId, quantity: it.quantity })),
                  contact_name: String(values.contact_name || ''),
                  contact_phone: String(values.contact_phone || ''),
                  address: String(values.address || ''),
                  remark: values.remark ? String(values.remark) : undefined,
                })
                clear()
                setDone({ orderNo: res.order_no, amount: Number(res.total_amount).toFixed(2) })
              } catch {
                // 拦截器已 Toast
              } finally {
                setSubmitting(false)
              }
            }}
            footer={
              <Button
                block
                color="primary"
                size="large"
                loading={submitting}
                style={{
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(15,76,129,.35)',
                }}
                onClick={() => form.submit()}
              >
                提交订单(货到付款/商家联系)
              </Button>
            }
          >
            <Form.Item name="contact_name" label="收货人" rules={[{ required: true, message: '请填写收货人姓名' }]}>
              <Input placeholder="收货人姓名" maxLength={30} />
            </Form.Item>
            <Form.Item
              name="contact_phone"
              label="联系电话"
              rules={[
                { required: true, message: '请填写手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
              ]}
            >
              <Input type="tel" placeholder="11 位手机号" maxLength={11} />
            </Form.Item>
            <Form.Item name="address" label="收货地址" rules={[{ required: true, message: '请填写收货地址' }]}>
              <TextArea placeholder="省市区 + 详细地址" maxLength={200} rows={2} />
            </Form.Item>
            <Form.Item name="remark" label="备注(选填)">
              <TextArea placeholder="留言备注" maxLength={200} rows={2} />
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  )
}
