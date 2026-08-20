import { useNavigate } from 'react-router-dom'
import { Button, Dialog, Stepper, SwipeAction, List } from 'antd-mobile'
import { useCartStore, cartTotal } from '../../stores/cart'

/** 购物车:改量/左滑删除/清空,底部合计与去结算 */
export default function Cart() {
  const navigate = useNavigate()
  const { items, setQuantity, remove, clear } = useCartStore()
  const total = cartTotal(items)

  return (
    <div className="page">
      <div className="topbar">
        <a onClick={() => navigate(-1)} style={{ fontSize: 20 }}>
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
            style={{ fontSize: 13, color: '#e5484d' }}
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
        <List style={{ marginTop: 10 }}>
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
              <List.Item
                description={`¥${Number(it.price).toFixed(2)} / ${it.unit || '件'}`}
                prefix={
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      background: '#f2f3f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {it.image ? (
                      <img src={it.image} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 22 }}>📦</span>
                    )}
                  </div>
                }
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>&yen;{(Number(it.price) * it.quantity).toFixed(2)}</span>
                    <Stepper min={0} max={999} value={it.quantity} onChange={(v) => setQuantity(it.id, v)} />
                  </div>
                }
              >
                <div style={{ fontSize: 14, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.name}
                </div>
              </List.Item>
            </SwipeAction>
          ))}
        </List>
      )}

      {items.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            background: '#fff',
            padding: '10px 14px',
            borderTop: '1px solid #eceef2',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#666' }}>合计</span>
          <span style={{ color: '#e5484d', fontSize: 20, fontWeight: 700, margin: '0 6px 0 8px' }}>
            ¥{total.toFixed(2)}
          </span>
          <div style={{ flex: 1 }} />
          <Button color="primary" style={{ borderRadius: 22, minWidth: 120 }} onClick={() => navigate('/checkout')}>
            去结算
          </Button>
        </div>
      )}
    </div>
  )
}
