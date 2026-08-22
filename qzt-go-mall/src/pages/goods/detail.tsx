import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Stepper, Toast } from 'antd-mobile'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { listGoods } from '../../services/mall'
import { useCartStore } from '../../stores/cart'
import { isMultiSpec, type MallGoods } from '../../types/mall'

/** 商品详情:大图/价格/规格/数量,加入购物车或立即购买 */
export default function GoodsDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [goods, setGoods] = useState<MallGoods | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [skuId, setSkuId] = useState<number | null>(null)
  const add = useCartStore((s) => s.add)

  useEffect(() => {
    listGoods()
      .then((list) => {
        const g = list.find((it) => it.id === Number(id)) ?? null
        setGoods(g)
        // 单规格商品静默选中其唯一 SKU,不展示规格选择器
        if (g && (g.skus ?? []).length === 1) setSkuId(g.skus[0].id)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [id])

  const multi = goods ? isMultiSpec(goods) : false
  const sku = useMemo(
    () => (goods?.skus ?? []).find((s) => s.id === skuId) ?? null,
    [goods, skuId],
  )
  const price = sku?.price ?? goods?.standard_price
  const inStock = sku ? sku.in_stock : goods?.in_stock
  const image = sku?.image_url || goods?.image_url
  const total = useMemo(() => (price ? (Number(price) * quantity).toFixed(2) : '0.00'), [price, quantity])

  if (loading) return <div className="empty-tip">加载中…</div>
  if (!goods) return <div className="empty-tip">商品不存在或已下架</div>

  /** 加入购物车/立即购买前置:多规格必须已选规格 */
  const withSku = (fn: (skuId: number) => void) => {
    if (!sku) {
      Toast.show('请先选择规格')
      return
    }
    fn(sku.id)
  }

  return (
    <div className="page" style={{ paddingBottom: 84 }}>
      <div className="topbar">
        <a className="topbar-back" onClick={() => navigate(-1)}>
          ‹
        </a>
        <div className="topbar-title">商品详情</div>
        <div style={{ width: 26 }} />
      </div>

      <div style={{ background: '#fff', padding: 14 }}>
        <div
          style={{
            height: 300,
            background: '#eef1f6',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {image ? (
            <img src={image} alt={goods.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 72 }}>📦</span>
          )}
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="price" style={{ fontSize: 26 }}>
            ¥{Number(price).toFixed(2)}
          </span>
          <span className="price-unit" style={{ fontSize: 12 }}>
            /{goods.unit || '件'}
          </span>
          <div style={{ flex: 1 }} />
          {inStock ? (
            <span className="stock-tag" style={{ fontSize: 11, padding: '3px 10px' }}>
              有货
            </span>
          ) : (
            <span className="stock-tag out" style={{ fontSize: 11, padding: '3px 10px' }}>
              缺货(仍可下单,客服会联系)
            </span>
          )}
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 8, color: 'var(--ink)' }}>{goods.name}</div>
        <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>
          {[goods.category, goods.product_no].filter(Boolean).join(' · ')}
        </div>

        {multi && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 10 }}>规格</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(goods.skus ?? []).map((s) => {
                const active = s.id === skuId
                return (
                  <button
                    key={s.id}
                    onClick={() => setSkuId(s.id)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      border: active ? '1.5px solid var(--brand-500)' : '1px solid var(--line, #e5e7eb)',
                      background: active ? 'rgba(15,76,129,.08)' : '#f7f8fa',
                      color: active ? 'var(--brand-500)' : 'var(--ink-2)',
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {s.spec || '默认规格'}
                    {Number(s.price) !== Number(goods.standard_price) && `  ¥${Number(s.price).toFixed(2)}`}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 18 }}>
          <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>数量</span>
          <div style={{ flex: 1 }} />
          <Stepper min={1} max={999} value={quantity} onChange={(v) => setQuantity(v)} />
        </div>
      </div>

      {goods.description && (
        <div className="card" style={{ margin: '10px 12px 0', fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)' }}>
          <div className="card-title">商品介绍</div>
          <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(goods.description) }} />
        </div>
      )}

      <div className="bottom-bar">
        <Button
          fill="outline"
          color="primary"
          style={{ flex: 1, borderRadius: 999 }}
          onClick={() =>
            withSku(() => {
              add(goods, sku!, quantity)
              Toast.show('已加入购物车')
            })
          }
        >
          加入购物车
        </Button>
        <Button
          color="primary"
          style={{
            flex: 1,
            borderRadius: 999,
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
            border: 'none',
            boxShadow: '0 4px 14px rgba(15,76,129,.35)',
          }}
          onClick={() =>
            withSku(() => {
              add(goods, sku!, quantity)
              navigate('/checkout')
            })
          }
        >
          立即购买(¥{total})
        </Button>
      </div>
    </div>
  )
}

/** 商品介绍 Markdown 渲染(marked 解析 + DOMPurify 消毒) */
function renderMarkdown(md: string): string {
  return DOMPurify.sanitize(marked.parse(md, { async: false }) as string)
}
