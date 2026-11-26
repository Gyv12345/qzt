import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, Skeleton, Tag, Toast } from 'antd-mobile'
import { getMallMe, listMyCoupons } from '../../services/mall'
import { useUserStore } from '../../stores/user'
import type { UserCouponItem } from '../../types/mall'

const statusMeta: Record<number, { label: string; color: 'primary' | 'default' | 'danger' }> = {
  1: { label: '未使用', color: 'primary' },
  2: { label: '已使用', color: 'default' },
  3: { label: '已过期', color: 'danger' },
}

/** 我的:账号信息 + 券包。已登录展示头像/手机号/优惠券列表/退出登录;未登录引导登录注册 */
export default function Mine() {
  const navigate = useNavigate()
  const { token, user, setUser, logout } = useUserStore()
  const [checking, setChecking] = useState(!!token)
  const [coupons, setCoupons] = useState<UserCouponItem[]>([])
  const [couponsLoading, setCouponsLoading] = useState(false)

  // bootstrap:本地有 token 时静默校验有效性,失效则清态(回到匿名购物)
  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }
    getMallMe()
      .then((u) => {
        setUser(u)
        setChecking(false)
        setCouponsLoading(true)
        listMyCoupons()
          .then(setCoupons)
          .catch(() => undefined)
          .finally(() => setCouponsLoading(false))
      })
      .catch(() => {
        logout()
        setChecking(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (checking) {
    return (
      <div className="page">
        <div className="topbar">
          <a className="topbar-back" onClick={() => navigate(-1)}>
            ‹
          </a>
          <div className="topbar-title">我的</div>
          <div style={{ width: 26 }} />
        </div>
        <div style={{ padding: 16 }}>
          <Skeleton animated style={{ '--height': 84, '--border-radius': 12 } as never} />
        </div>
      </div>
    )
  }

  if (!token || !user) {
    return (
      <div className="page">
        <div className="topbar">
          <a className="topbar-back" onClick={() => navigate(-1)}>
            ‹
          </a>
          <div className="topbar-title">我的</div>
          <div style={{ width: 26 }} />
        </div>
        <div style={{ padding: '40px 12px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: 'var(--ink-2)' }}>登录后可领券、下单用券</div>
          <Button
            block
            color="primary"
            size="large"
            style={{
              marginTop: 20,
              borderRadius: 999,
              background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
              border: 'none',
              boxShadow: '0 4px 14px rgba(15,76,129,.35)',
            }}
            onClick={() => navigate('/login', { state: { from: '/mine' } })}
          >
            登录 / 注册
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topbar">
        <a className="topbar-back" onClick={() => navigate(-1)}>
          ‹
        </a>
        <div className="topbar-title">我的</div>
        <div style={{ width: 26 }} />
      </div>

      {/* 账号卡:头像(昵称首字) + 昵称/手机号 */}
      <div className="mine-header">
        <div className="mine-avatar">{(user.nickname || user.phone).slice(0, 1).toUpperCase()}</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{user.nickname || '买家'}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', marginTop: 4 }}>{user.phone}</div>
        </div>
        <div style={{ flex: 1 }} />
        <Button
          size="small"
          fill="none"
          style={{ '--text-color': 'rgba(255,255,255,.75)', '--background-color': 'transparent' } as never}
          onClick={() => {
            logout()
            Toast.show({ content: '已退出登录' })
          }}
        >
          退出登录
        </Button>
      </div>

      {/* 券包 */}
      <div style={{ padding: '14px 12px 0' }}>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center' }}>
            我的优惠券
            <div style={{ flex: 1 }} />
            <a
              style={{ fontSize: 12, fontWeight: 400, color: 'var(--brand-500)' }}
              onClick={() => navigate('/coupons')}
            >
              去领券 ›
            </a>
          </div>

          {couponsLoading ? (
            <Skeleton animated style={{ '--height': 90, '--border-radius': 12 } as never} />
          ) : coupons.length === 0 ? (
            <Empty
              style={{ padding: '18px 0' }}
              description={<span style={{ fontSize: 13, color: 'var(--ink-3)' }}>还没有优惠券,去领券中心逛逛</span>}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {coupons.map((it) => {
                const meta = statusMeta[it.status] ?? statusMeta[3]
                return (
                  <div key={it.id} className="coupon-card">
                    <div className="coupon-face">
                      <span style={{ fontSize: 13 }}>¥</span>
                      <span style={{ fontSize: 26, fontWeight: 800 }}>{Number(it.discount).toFixed(0)}</span>
                    </div>
                    <div className="coupon-divider" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                        满 ¥{Number(it.threshold).toFixed(0)} 可用 · 有效期至 {it.end_at}
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color={meta.color} fill="outline" style={{ '--font-size': 11 } as never}>
                          {meta.label}
                        </Tag>
                        {it.status === 1 && (
                          <a style={{ fontSize: 12, color: 'var(--brand-500)' }} onClick={() => navigate('/goods')}>
                            去使用 ›
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
