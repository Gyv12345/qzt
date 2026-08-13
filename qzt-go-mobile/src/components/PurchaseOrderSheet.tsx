import { Popup, TextArea, Button, Toast, Selector, SearchBar, List, SpinLoading } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { createPurchaseOrder, createPurchaseReturn, listEnabledWarehouses, listSuppliers, updatePurchaseOrder } from '../services/psi'
import type { PsiPurchaseOrder, PsiSupplier, PsiWarehouse } from '../types/psi'
import OrderItemEditor, { type OrderItem } from './OrderItemEditor'

interface Props {
  visible: boolean
  onClose: () => void
  order?: PsiPurchaseOrder | null
  /** order=采购单(默认), return=采购退货单 */
  mode?: 'order' | 'return'
  onSubmitted?: () => void
}

export default function PurchaseOrderSheet({ visible, onClose, order, mode = 'order', onSubmitted }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [supplier, setSupplier] = useState<{ id: number; name: string } | null>(null)
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined)
  const [remark, setRemark] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])
  const [showSupplier, setShowSupplier] = useState(false)
  const [supKw, setSupKw] = useState('')
  const [supList, setSupList] = useState<PsiSupplier[]>([])
  const [supLoading, setSupLoading] = useState(false)
  const isEdit = mode === 'order' && !!order

  useEffect(() => {
    if (visible) {
      listEnabledWarehouses().then(setWarehouses).catch(() => {})
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    if (order) {
      const o = order as any
      setSupplier({ id: o.supplier_id, name: o.supplier_name || '' })
      setWarehouseId(o.warehouse_id)
      setRemark(o.remark || '')
      setItems((o.items || []).map((it: any) => ({ product_id: it.product_id, product_name: it.product_name, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })))
    } else {
      setSupplier(null)
      setWarehouseId(undefined)
      setRemark('')
      setItems([])
    }
  }, [visible, order])

  const searchSuppliers = (k: string) => {
    setSupLoading(true)
    listSuppliers({ page: 1, page_size: 20, keyword: k || undefined })
      .then((r) => setSupList(r.list || []))
      .catch(() => setSupList([]))
      .finally(() => setSupLoading(false))
  }
  useEffect(() => {
    if (showSupplier) searchSuppliers('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSupplier])

  const submit = async () => {
    if (!supplier) {
      Toast.show('请选择供应商')
      return
    }
    if (!warehouseId) {
      Toast.show('请选择仓库')
      return
    }
    if (items.length === 0) {
      Toast.show('请添加商品明细')
      return
    }
    setSubmitting(true)
    try {
      const itemPayload = items.map((it) => ({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price }))
      if (mode === 'return') {
        await createPurchaseReturn({ supplier_id: supplier.id, warehouse_id: warehouseId, remark: remark || undefined, items: itemPayload })
      } else if (isEdit && order) {
        await updatePurchaseOrder(order.id, { supplier_id: supplier.id, warehouse_id: warehouseId, remark: remark || undefined, items: itemPayload })
      } else {
        await createPurchaseOrder({ supplier_id: supplier.id, warehouse_id: warehouseId, remark: remark || undefined, items: itemPayload })
      }
      Toast.show({ icon: 'success', content: '已创建' })
      onSubmitted?.()
      onClose()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Popup
        visible={visible}
        onMaskClick={onClose}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div style={{ padding: '16px 16px 24px' }}>
          <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
            {mode === 'return' ? '新建采购退货单' : isEdit ? '编辑采购单' : '新建采购单'}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>供应商</div>
            <div onClick={() => setShowSupplier(true)} style={{ padding: '8px 0', fontSize: 15, color: supplier ? 'var(--text-primary)' : 'var(--text-tertiary)', borderBottom: '1px solid var(--divider)' }}>
              {supplier?.name || '请选择供应商'}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>仓库</div>
            <Selector
              options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
              value={warehouseId != null ? [warehouseId] : []}
              onChange={(v) => setWarehouseId(v[0] as number)}
              columns={2}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>备注</div>
            <TextArea placeholder="选填" rows={2} value={remark} onChange={setRemark} />
          </div>

          <OrderItemEditor items={items} onChange={setItems} />

          <Button block color="primary" size="large" style={{ marginTop: 16 }} loading={submitting} onClick={submit}>
            创建
          </Button>
        </div>
      </Popup>

      <Popup
        visible={showSupplier}
        onMaskClick={() => setShowSupplier(false)}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '12px 16px', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>选择供应商</div>
        <div style={{ padding: '0 12px' }}>
          <SearchBar
            placeholder="搜索供应商"
            value={supKw}
            onChange={(v) => { setSupKw(v); searchSuppliers(v) }}
            onClear={() => { setSupKw(''); searchSuppliers('') }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {supLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>
          ) : supList.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>无匹配供应商</div>
          ) : (
            <List>
              {supList.map((s) => (
                <List.Item key={s.id} onClick={() => { setSupplier({ id: s.id, name: s.name }); setShowSupplier(false) }}>
                  {s.name}
                </List.Item>
              ))}
            </List>
          )}
        </div>
      </Popup>
    </>
  )
}
