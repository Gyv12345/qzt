import { Popup, SearchBar, List, SpinLoading, Button, Input } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { listProducts } from '../services/crm'

export interface OrderItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
}

interface Props {
  items: OrderItem[]
  onChange: (items: OrderItem[]) => void
}

/** 采购/销售单的商品明细编辑器(多行:选商品 + 数量 + 单价) */
export default function OrderItemEditor({ items, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const [pickingIndex, setPickingIndex] = useState(-1) // -1 = 新增行
  const [kw, setKw] = useState('')
  const [prods, setProds] = useState<{ id: number; name: string; product_no: string; price: string }[]>([])
  const [loading, setLoading] = useState(false)

  const search = (k: string) => {
    setLoading(true)
    listProducts({ page: 1, page_size: 20, keyword: k || undefined })
      .then((r) => setProds(r.list || []))
      .catch(() => setProds([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (showPicker) search('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPicker])

  const openPicker = (index: number) => {
    setPickingIndex(index)
    setShowPicker(true)
  }

  const pickProduct = (p: { id: number; name: string; price: string }) => {
    if (pickingIndex === -1) {
      onChange([...items, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: Number(p.price) || 0 }])
    } else {
      const copy = [...items]
      copy[pickingIndex] = { ...copy[pickingIndex], product_id: p.id, product_name: p.name }
      onChange(copy)
    }
    setShowPicker(false)
  }

  const updateRow = (i: number, patch: Partial<OrderItem>) => {
    const copy = [...items]
    copy[i] = { ...copy[i], ...patch }
    onChange(copy)
  }
  const removeRow = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  const total = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 600, margin: '8px 0' }}>商品明细</div>
      {items.map((it, i) => (
        <div key={i} style={{ borderBottom: '1px solid var(--divider)', padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span onClick={() => openPicker(i)} style={{ color: 'var(--brand)', fontSize: 14 }}>
              {it.product_name || '选择商品'}
            </span>
            <a style={{ color: '#ff4d4f', fontSize: 12 }} onClick={() => removeRow(i)}>删除</a>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
            <Input placeholder="数量" type="number" value={String(it.quantity)} onChange={(v) => updateRow(i, { quantity: Number(v) || 0 })} style={{ flex: 1, '--font-size': '13px' } as any} />
            <Input placeholder="单价" type="number" value={String(it.unit_price)} onChange={(v) => updateRow(i, { unit_price: Number(v) || 0 })} style={{ flex: 1, '--font-size': '13px' } as any} />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 72, textAlign: 'right' }}>¥{(it.quantity * it.unit_price).toFixed(2)}</span>
          </div>
        </div>
      ))}
      <Button size="small" onClick={() => openPicker(-1)} style={{ marginTop: 8 }}>+ 添加明细</Button>
      {items.length > 0 && (
        <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 600, fontSize: 14 }}>合计 ¥{total.toFixed(2)}</div>
      )}

      <Popup
        visible={showPicker}
        onMaskClick={() => setShowPicker(false)}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '12px 16px', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>选择商品</div>
        <div style={{ padding: '0 12px' }}>
          <SearchBar
            placeholder="搜索商品名称"
            value={kw}
            onChange={(v) => {
              setKw(v)
              search(v)
            }}
            onClear={() => {
              setKw('')
              search('')
            }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>
          ) : prods.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>无匹配商品</div>
          ) : (
            <List>
              {prods.map((p) => (
                <List.Item key={p.id} description={p.product_no} extra={p.price ? `¥${p.price}` : ''} onClick={() => pickProduct(p)}>
                  {p.name}
                </List.Item>
              ))}
            </List>
          )}
        </div>
      </Popup>
    </div>
  )
}
