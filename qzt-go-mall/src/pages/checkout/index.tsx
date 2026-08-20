import { useRef, useState } from 'react'
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
  const formRef = useRef<{ submit: () => void } | null>(null)

  if (done) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="topbar-title">下单结果</div>
        </div>
        <div style={{ background: '#fff', margin: 20, borderRadius: 12, padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 52 }}>✅</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 8 }}>下单成功</div>
          <div style={{ color: '#9aa0a8', fontSize: 13, marginTop: 6 }}>
            合计 ¥{done.amount},商家确认后将联系您安排发货
          </div>
          <div
            style={{
              margin: '18px auto 0',
              padding: '10px 16px',
              background: '#f4f6fa',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {done.orderNo}
          </div>
          <div style={{ color: '#9aa0a8', fontSize: 12, marginTop: 6 }}>请保存订单号,可用于查询进度</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <Button fill="outline" style={{ flex: 1, borderRadius: 22 }} onClick={() => navigate(`/order/query?no=${done.orderNo}`)}>
              查看订单
            </Button>
            <Button color="primary" style={{ flex: 1, borderRadius: 22 }} onClick={() => navigate('/goods')}>
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
          <a onClick={() => navigate(-1)} style={{ fontSize: 20 }}>‹</a>
          <div className="topbar-title">确认下单</div>
          <div style={{ width: 20 }} />
        </div>
        <div className="empty-tip">没有待结算商品</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topbar">
        <a onClick={() => navigate(-1)} style={{ fontSize: 20 }}>‹</a>
        <div className="topbar-title">确认下单</div>
        <div style={{ width: 20 }} />
      </div>

      <div style={{ background: '#fff', marginTop: 10, padding: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>商品清单</div>
        {items.map((it) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', fontSize: 14 }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.name}
            </span>
            <span style={{ color: '#666', margin: '0 8px' }}>×{it.quantity}</span>
            <span style={{ fontWeight: 600 }}>¥{(Number(it.price) * it.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 14 }}>
          合计 <span style={{ color: '#e5484d', fontSize: 20, fontWeight: 700 }}>¥{total.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ background: '#fff', marginTop: 10, padding: 14 }}>
        <Form
          layout="vertical"
          form={formRef as never}
          onFinish={async (values) => {
            setSubmitting(true)
            try {
              const res = await createOrder({
                items: items.map((it) => ({ product_id: it.id, quantity: it.quantity })),
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
              style={{ borderRadius: 22 }}
              onClick={() => formRef.current?.submit()}
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
  )
}
