import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from 'antd-mobile'
import { RightOutline, SearchOutline } from 'antd-mobile-icons'
import { listGoods } from '../../services/mall'
import { useCartStore, cartCount } from '../../stores/cart'
import type { MallGoods } from '../../types/mall'

/** 商品列表(商城首页):品牌顶栏 + banner + 悬浮搜索 + 分类胶囊 + 图片卡片流 + 底部购物车条 */
export default function GoodsList() {
  const navigate = useNavigate()
  const [goods, setGoods] = useState<MallGoods[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const items = useCartStore((s) => s.items)

  useEffect(() => {
    listGoods()
      .then(setGoods)
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  // 分类列表(去重;SKU 少,直接从数据提取)
  const categories = useMemo(() => {
    const set = new Set<string>()
    goods.forEach((g) => g.category && set.add(g.category))
    return Array.from(set)
  }, [goods])

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    return goods.filter((g) => {
      if (category && g.category !== category) return false
      if (!k) return true
      return g.name.toLowerCase().includes(k) || g.category.toLowerCase().includes(k)
    })
  }, [goods, keyword, category])

  const count = cartCount(items)

  return (
    <div className="page">
      {/* 品牌顶栏 */}
      <div className="brand-topbar">
        <span className="brand-logo">企</span>
        <span className="brand-name">企智通商城</span>
        <div style={{ flex: 1 }} />
        <a className="topbar-link" onClick={() => navigate('/order/query')}>
          查订单 <RightOutline fontSize={11} />
        </a>
      </div>

      {/* banner: slogan + 装饰网格光斑 */}
      <div className="banner">
        <div className="banner-title">企业管理软件, 一站购齐</div>
        <div className="banner-sub">源码级私有化部署 · 数据完全归企业所有</div>
      </div>

      {/* 悬浮搜索框 */}
      <div className="search-wrap">
        <SearchOutline fontSize={16} color="#93a0b8" />
        <Input placeholder="搜索商品名称 / 分类" value={keyword} onChange={setKeyword} clearable style={{ '--font-size': 14 } as never} />
      </div>

      {/* 分类胶囊 */}
      {categories.length > 1 && (
        <div className="cat-row">
          <span className={`cat-chip${category === '' ? ' active' : ''}`} onClick={() => setCategory('')}>
            全部
          </span>
          {categories.map((c) => (
            <span
              key={c}
              className={`cat-chip${category === c ? ' active' : ''}`}
              onClick={() => setCategory(category === c ? '' : c)}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* 商品卡片流 */}
      {loading ? (
        <div className="empty-tip">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-tip">暂无在售商品,敬请期待</div>
      ) : (
        <div className="goods-grid">
          {filtered.map((g) => (
            <div key={g.id} className="goods-card" onClick={() => navigate(`/goods/${g.id}`)}>
              <div className="goods-cover">
                {g.image_url ? (
                  <img src={g.image_url} alt={g.name} />
                ) : (
                  <span style={{ fontSize: 40 }}>📦</span>
                )}
              </div>
              <div className="goods-info">
                <div className="goods-name">{g.name}</div>
                <div className="goods-meta">
                  <span className="price">¥{Number(g.standard_price).toFixed(2)}</span>
                  <span className="price-unit">/{g.unit || '件'}</span>
                  <div style={{ flex: 1 }} />
                  {g.in_stock ? <span className="stock-tag">有货</span> : <span className="stock-tag out">缺货</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部悬浮购物车条 */}
      {count > 0 && (
        <div className="cart-float" onClick={() => navigate('/cart')}>
          <span style={{ fontSize: 20 }}>🛒</span>
          <span style={{ margin: '0 10px', fontSize: 14 }}>购物车({count})</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>去结算 ›</span>
        </div>
      )}
    </div>
  )
}
