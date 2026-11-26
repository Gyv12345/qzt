import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Skeleton, Toast } from 'antd-mobile'
import { claimCoupon, listPublicCoupons } from '../../services/mall'
import { useUserStore } from '../../stores/user'
import type { PublicCoupon } from '../../types/mall'

/** 领券中心:可领券列表。浏览免登录;领取需登录(未登录跳 /login),成功后按钮变「已领取」 */
export default function CouponsCenter() {
  const navigate = useNavigate()
  const token = useUserStore((s) => s.token)
  const [coupons, setCoupons] = useState<PublicCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [claimed, setClaimed] = useState<Set<number>>(new Set())
  const [claiming, setClaiming] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    setError(false)
    listPublicCoupons()
      .then(setCoupons)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const claim = async (c: PublicCoupon) => {
    if (!token) {
      Toast.show({ content: '请先登录再领券' })
      navigate('/login', { state: { from: '/coupons' } })
      return
    }
    setClaiming(c.id)
    try {
      await claimCoupon(c.id)
      setClaimed((s) => new Set(s).add(c.id))
      Toast.show({ content: `已领取「${c.name}」,下单时可用` })
    } catch {
      // 拦截器已 Toast(已领过 / 已售罄等)
    } finally {
      setClaiming(null)
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <a className="topbar-back" onClick={() => navigate(-1)}>
          ‹
        </a>
        <div className="topbar-title">领券中心</div>
        <div style={{ width: 26 }} />
      </div>

      {/* banner */}
      <div className="coupon-banner">
        <div style={{ fontSize: 19, fontWeight: 800 }}>优惠券中心</div>
        <div style={{ fontSize: 12.5, marginTop: 5, color: 'rgba(255,255,255,.72)' }}>先领券,再下单,立省真金白银</div>
      </div>

      {loading ? (
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton animated style={{ '--height': 96, '--border-radius': 12 } as never} />
          <Skeleton animated style={{ '--height': 96, '--border-radius': 12 } as never} />
        </div>
      ) : error ? (
        <div className="empty-tip">
          网络异常,优惠券加载失败
          <div style={{ marginTop: 12 }}>
            <Button color="primary" fill="outline" size="small" onClick={load}>
              重新加载
            </Button>
          </div>
        </div>
      ) : coupons.length === 0 ? (
        <div className="empty-tip">暂无可领的优惠券,敬请期待</div>
      ) : (
        <div style={{ padding: '14px 12px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {coupons.map((c) => {
            const done = claimed.has(c.id)
            const soldOut = Number(c.remaining) <= 0
            return (
              <div key={c.id} className="coupon-card coupon-card-lg">
                <div className="coupon-face">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>¥</span>
                  <span style={{ fontSize: 34, fontWeight: 800 }}>{Number(c.discount).toFixed(0)}</span>
                </div>
                <div className="coupon-divider" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600, marginTop: 3 }}>
                    满 ¥{Number(c.threshold).toFixed(0)} 可用
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                    剩余 {c.remaining} 张 · 每人限领 {c.per_user_limit} 张
                  </div>
                </div>
                <Button
                  size="small"
                  color="primary"
                  loading={claiming === c.id}
                  disabled={done || soldOut}
                  style={
                    done
                      ? { borderRadius: 999, '--background-color': '#eef1f6', '--text-color': 'var(--ink-3)', border: 'none' } as never
                      : {
                          borderRadius: 999,
                          background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                          border: 'none',
                        } as never
                  }
                  onClick={() => claim(c)}
                >
                  {done ? '已领取' : soldOut ? '已领完' : '立即领取'}
                </Button>
              </div>
            )
          })}
          {!token && (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 12, padding: '4px 0 16px' }}>
              登录后即可领取,优惠券下单自动抵扣
            </div>
          )}
        </div>
      )}
    </div>
  )
}
