import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Stepper, Tag, Toast } from 'antd-mobile'
import { listGoods } from '../../services/mall'
import { useCartStore } from '../../stores/cart'
import type { MallGoods } from '../../types/mall'

/** 商品详情:大图/价格/数量,加入购物车或立即购买 */
export default function GoodsDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [goods, setGoods] = useState<MallGoods | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const add = useCartStore((s) => s.add)

  useEffect(() => {
    listGoods()
      .then((list) => setGoods(list.find((g) => g.id === Number(id)) ?? null))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [id])

  const total = useMemo(() => (goods ? (Number(goods.standard_price) * quantity).toFixed(2) : '0.00'), [goods, quantity])

  if (loading) return <div className="empty-tip">加载中…</div>
  if (!goods) return <div className="empty-tip">商品不存在或已下架</div>

  return (
    <div className="page">
      <div className="topbar">
        <a onClick={() => navigate(-1)} style={{ fontSize: 20 }}>
          ‹
        </a>
        <div className="topbar-title">商品详情</div>
        <div style={{ width: 20 }} />
      </div>

      <div style={{ background: '#fff', padding: 14 }}>
        <div
          style={{
            height: 300,
            background: '#f2f3f5',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {goods.image_url ? (
            <img src={goods.image_url} alt={goods.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 72 }}>📦</span>
          )}
        </div>

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: '#e5484d', fontSize: 24, fontWeight: 700 }}>¥{Number(goods.standard_price).toFixed(2)}</span>
          <span style={{ color: '#9aa0a8', fontSize: 12 }}>/{goods.unit || '件'}</span>
          <div style={{ flex: 1 }} />
          {goods.in_stock ? (
            <Tag color="primary" fill="outline">有货</Tag>
          ) : (
            <Tag color="default">缺货(仍可下单,客服会联系)</Tag>
          )}
        </div>

        <div style={{ fontSize: 17, fontWeight: 600, marginTop: 8 }}>{goods.name}</div>
        <div style={{ color: '#9aa0a8', fontSize: 12, marginTop: 4 }}>
          {[goods.category, goods.product_no].filter(Boolean).join(' · ')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 14 }}>数量</span>
          <div style={{ flex: 1 }} />
          <Stepper min={1} max={999} value={quantity} onChange={(v) => setQuantity(v)} />
        </div>
      </div>

      {goods.description && (
        <div style={{ background: '#fff', padding: 14, marginTop: 10, fontSize: 14, lineHeight: 1.7, color: '#444' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>商品介绍</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{goods.description}</div>
        </div>
      )}

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
          gap: 10,
        }}
      >
        <Button
          style={{ flex: 1, borderRadius: 22 }}
          onClick={() => {
            add(goods, quantity)
            Toast.show('已加入购物车')
          }}
        >
          加入购物车
        </Button>
        <Button
          color="primary"
          style={{ flex: 1, borderRadius: 22 }}
          onClick={() => {
            add(goods, quantity)
            navigate('/checkout')
          }}
        >
          立即购买(¥{total})
        </Button>
      </div>
    </div>
  )
}
