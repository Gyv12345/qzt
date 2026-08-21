import { useNavigate } from 'react-router-dom'
import { Button, Dialog, Stepper, SwipeAction } from 'antd-mobile'
import { useCartStore, cartTotal } from '../../stores/cart'

/** 购物车:改量/左滑删除/清空,底部合计与去结算 */
export default function Cart() {
  const navigate = useNavigate()
  const { items, setQuantity, remove, clear } = useCartStore()
  const total = cartTotal(items)

  return (
    <div className="page" style={{ paddingBottom: items.length > 0 ? 84 : 24 }}>
      <div className="topbar">
        <a className="topbar-back" onClick={() => navigate(-1)}>
          ‹
        </a>
        <div className="topbar-title">购物车</div>
        {items.length > 0 ? (
          <a
            onClick={() =>
              Dialog.confirm({
                title: '清空购物车',
                content: '确认清空购物车中的全部商品?',
                confirmText: '清空',
                onConfirm: clear,
              })
            }
            style={{ fontSize: 13, color: 'var(--adm-color-danger)', cursor: 'pointer' }}
          >
            清空
          </a>
        ) : (
          <div style={{ width: 26 }} />
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-tip">
          购物车是空的
          <div style={{ marginTop: 12 }}>
            <Button color="primary" fill="outline" size="small" onClick={() => navigate('/goods')}>
              去逛逛
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '10px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => (
            <SwipeAction
              key={it.id}
              rightActions={[
                {
                  key: 'delete',
                  text: '删除',
                  color: 'danger',
                  onClick: () => remove(it.id),
                },
              ]}
            >
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    background: '#eef1f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {it.image ? (
                    <img src={it.image} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 24 }}>📦</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                    ¥{Number(it.price).toFixed(2)} / {it.unit || '件'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                    <span className="price" style={{ fontSize: 15 }}>
                      &yen;{(Number(it.price) * it.quantity).toFixed(2)}
                    </span>
                    <div style={{ flex: 1 }} />
                    <Stepper min={0} max={999} value={it.quantity} onChange={(v) => setQuantity(it.id, v)} />
                  </div>
                </div>
              </div>
            </SwipeAction>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="bottom-bar">
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>合计</span>
          <span className="price" style={{ fontSize: 22, margin: '0 6px 0 6px' }}>
            ¥{total.toFixed(2)}
          </span>
          <div style={{ flex: 1 }} />
          <Button
            color="primary"
            style={{
              borderRadius: 999,
              minWidth: 128,
              background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
              border: 'none',
              boxShadow: '0 4px 14px rgba(15,76,129,.35)',
            }}
            onClick={() => navigate('/checkout')}
          >
            去结算
          </Button>
        </div>
      )}
    </div>
  )
}
