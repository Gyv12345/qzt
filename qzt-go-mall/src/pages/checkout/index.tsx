import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, Popup, TextArea } from 'antd-mobile'
import { RightOutline } from 'antd-mobile-icons'
import { createOrder, listMyCoupons } from '../../services/mall'
import { useCartStore, cartTotal } from '../../stores/cart'
import { useUserStore } from '../../stores/user'
import type { UserCouponItem } from '../../types/mall'

/** 确认下单:收货信息表单 + 选券 → 提交 → 展示订单号 */
export default function Checkout() {
  const navigate = useNavigate()
  const { items, clear } = useCartStore()
  const token = useUserStore((s) => s.token)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ orderNo: string; amount: string; discount: number } | null>(null)
  const total = cartTotal(items)
  const [form] = Form.useForm()
  const [myCoupons, setMyCoupons] = useState<UserCouponItem[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<UserCouponItem | null>(null)
  const [couponPopup, setCouponPopup] = useState(false)

  // 已登录时拉取本人券包,结算页筛出可用券
  useEffect(() => {
    if (!token) return
    listMyCoupons()
      .then(setMyCoupons)
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  /** 可用券:未使用且满减门槛 <= 当前合计 */
  const usableCoupons = useMemo(
    () => myCoupons.filter((c) => c.status === 1 && Number(c.threshold) <= total),
    [myCoupons, total],
  )
  const discount = selectedCoupon ? Number(selectedCoupon.discount) : 0
  const payable = Math.max(total - discount, 0)

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
          {done.discount > 0 && (
            <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 8, fontWeight: 600 }}>
              优惠券已抵扣 ¥{done.discount.toFixed(2)}
            </div>
          )}
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 6 }}>
            应付 ¥{done.amount},商家确认后将联系您安排发货
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
            {selectedCoupon && (
              <>
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--accent)' }}>
                  优惠券抵扣 <span style={{ fontWeight: 700 }}>-¥{discount.toFixed(2)}</span>
                </div>
                <div style={{ marginTop: 2 }}>
                  应付 <span className="price" style={{ fontSize: 20 }}>¥{payable.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 优惠券入口:已登录可选券;匿名给一行小字提示 */}
        {token ? (
          <>
            <div
              className="card"
              style={{ display: 'flex', alignItems: 'center', padding: '14px 14px', cursor: 'pointer' }}
              onClick={() => setCouponPopup(true)}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>优惠券</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 13, marginRight: 6, color: selectedCoupon ? 'var(--accent)' : 'var(--ink-3)' }}>
                {usableCoupons.length === 0
                  ? '暂无可用券'
                  : selectedCoupon
                    ? `-¥${discount.toFixed(2)}(满¥${Number(selectedCoupon.threshold).toFixed(0)})`
                    : `${usableCoupons.length} 张可用`}
              </span>
              <RightOutline fontSize={12} color="#93a0b8" />
            </div>

            <Popup
              visible={couponPopup}
              onMaskClick={() => setCouponPopup(false)}
              bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh', overflowY: 'auto' }}
            >
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>选择优惠券</div>
                <div
                  className="coupon-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedCoupon(null)
                    setCouponPopup(false)
                  }}
                >
                  <div style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>不使用优惠券</div>
                  {!selectedCoupon && <span style={{ color: 'var(--brand-500)', fontSize: 18, fontWeight: 700 }}>✓</span>}
                </div>
                {usableCoupons.map((c) => (
                  <div
                    key={c.id}
                    className="coupon-card"
                    style={{ marginTop: 10, cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedCoupon(c)
                      setCouponPopup(false)
                    }}
                  >
                    <div className="coupon-face">
                      <span style={{ fontSize: 12 }}>¥</span>
                      <span style={{ fontSize: 22, fontWeight: 800 }}>{Number(c.discount).toFixed(0)}</span>
                    </div>
                    <div className="coupon-divider" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                        满 ¥{Number(c.threshold).toFixed(0)} 可用 · 有效期至 {c.end_at}
                      </div>
                    </div>
                    {selectedCoupon?.id === c.id && (
                      <span style={{ color: 'var(--brand-500)', fontSize: 18, fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                ))}
                {usableCoupons.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '16px 0 8px' }}>
                    当前合计不满券门槛,或暂无未使用券
                  </div>
                )}
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <Button
                    block
                    fill="none"
                    size="small"
                    onClick={() => {
                      setCouponPopup(false)
                      navigate('/coupons')
                    }}
                    style={{ '--text-color': 'var(--brand-500)' } as never}
                  >
                    去领券中心看更多 ›
                  </Button>
                </div>
              </div>
            </Popup>
          </>
        ) : (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', padding: '2px 0' }}>
            <a style={{ color: 'var(--brand-500)' }} onClick={() => navigate('/login', { state: { from: '/checkout' } })}>
              登录
            </a>
            后可使用优惠券
          </div>
        )}

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
                  coupon_no: token && selectedCoupon ? selectedCoupon.coupon_no : undefined,
                })
                clear()
                setDone({
                  orderNo: res.order_no,
                  amount: Number(res.total_amount).toFixed(2),
                  discount: Number(res.discount_amount ?? 0),
                })
              } catch {
                // 拦截器已 Toast(券失效/门槛不足等)
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
