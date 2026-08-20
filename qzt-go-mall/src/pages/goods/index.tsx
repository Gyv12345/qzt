import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Tag } from 'antd-mobile'
import { RightOutline, SearchOutline } from 'antd-mobile-icons'
import { listGoods } from '../../services/mall'
import { useCartStore, cartCount } from '../../stores/cart'
import type { MallGoods } from '../../types/mall'

/** 商品列表:搜索(本地过滤)+ 图片卡片流 + 底部购物车栏 */
export default function GoodsList() {
  const navigate = useNavigate()
  const [goods, setGoods] = useState<MallGoods[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const items = useCartStore((s) => s.items)

  useEffect(() => {
    listGoods()
      .then(setGoods)
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return goods
    return goods.filter((g) => g.name.toLowerCase().includes(k) || g.category.toLowerCase().includes(k))
  }, [goods, keyword])

  const count = cartCount(items)

  return (
    <div className="page">
      <div className="topbar">
        <div style={{ fontWeight: 700, fontSize: 18 }}>🛒 企智通商城</div>
        <div style={{ flex: 1 }} />
        <a
          onClick={() => navigate('/order/query')}
          style={{ fontSize: 13, color: '#666', display: 'flex', alignItems: 'center' }}
        >
          查订单 <RightOutline fontSize={11} />
        </a>
      </div>

      <div style={{ padding: '10px 12px 4px', background: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        <SearchOutline fontSize={16} color="#9aa0a8" />
        <Input placeholder="搜索商品名称 / 分类" value={keyword} onChange={setKeyword} clearable style={{ '--font-size': 14 } as never} />
      </div>

      {loading ? (
        <div className="empty-tip">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-tip">暂无在售商品,敬请期待</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 12 }}>
          {filtered.map((g) => (
            <div
              key={g.id}
              onClick={() => navigate(`/goods/${g.id}`)}
              style={{ background: '#fff', borderRadius: 10, overflow: 'hidden' }}
            >
              <div
                style={{
                  height: 150,
                  background: '#f2f3f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {g.image_url ? (
                  <img src={g.image_url} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 40 }}>📦</span>
                )}
              </div>
              <div style={{ padding: '8px 10px 10px' }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    minHeight: 38,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {g.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, gap: 6 }}>
                  <span style={{ color: '#e5484d', fontWeight: 700, fontSize: 16 }}>
                    ¥{Number(g.standard_price).toFixed(2)}
                  </span>
                  <span style={{ color: '#9aa0a8', fontSize: 11 }}>/{g.unit || '件'}</span>
                  <div style={{ flex: 1 }} />
                  {g.in_stock ? (
                    <Tag color="primary" fill="outline" style={{ '--font-size': 10 } as never}>
                      有货
                    </Tag>
                  ) : (
                    <Tag color="default" style={{ '--font-size': 10 } as never}>
                      缺货
                    </Tag>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {count > 0 && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 16,
            background: '#2e6be6',
            color: '#fff',
            borderRadius: 24,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 4px 14px rgba(46,107,230,.35)',
          }}
          onClick={() => navigate('/cart')}
        >
          <span style={{ fontSize: 20 }}>🛒</span>
          <span style={{ margin: '0 10px', fontSize: 14 }}>购物车({count})</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>去结算 ›</span>
        </div>
      )}
    </div>
  )
}
