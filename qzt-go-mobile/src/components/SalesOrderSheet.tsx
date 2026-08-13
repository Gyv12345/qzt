import { Popup, TextArea, Button, Toast, Selector, SearchBar, List, SpinLoading } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { createSalesOrder, createSalesReturn, listEnabledWarehouses, updateSalesOrder } from '../services/psi'
import { listCustomers } from '../services/crm'
import type { PsiSalesOrder, PsiWarehouse } from '../types/psi'
import OrderItemEditor, { type OrderItem } from './OrderItemEditor'

interface Props {
  visible: boolean
  onClose: () => void
  order?: PsiSalesOrder | null
  /** order=销售单(默认), return=销售退货单 */
  mode?: 'order' | 'return'
  onSubmitted?: () => void
}

export default function SalesOrderSheet({ visible, onClose, order, mode = 'order', onSubmitted }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(null)
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined)
  const [remark, setRemark] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])
  const [showCustomer, setShowCustomer] = useState(false)
  const [kw, setKw] = useState('')
  const [custList, setCustList] = useState<{ id: number; name: string; customer_no: string }[]>([])
  const [custLoading, setCustLoading] = useState(false)
  const isEdit = mode === 'order' && !!order

  useEffect(() => {
    if (visible) listEnabledWarehouses().then(setWarehouses).catch(() => {})
  }, [visible])

  useEffect(() => {
    if (!visible) return
    if (order) {
      const o = order as any
      setCustomer({ id: o.customer_id, name: o.customer_name || '' })
      setWarehouseId(o.warehouse_id)
      setRemark(o.remark || '')
      setItems((o.items || []).map((it: any) => ({ product_id: it.product_id, product_name: it.product_name, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })))
    } else {
      setCustomer(null)
      setWarehouseId(undefined)
      setRemark('')
      setItems([])
    }
  }, [visible, order])

  const searchCustomers = (k: string) => {
    setCustLoading(true)
    listCustomers({ page: 1, page_size: 20, keyword: k || undefined })
      .then((r) => setCustList(r.list || []))
      .catch(() => setCustList([]))
      .finally(() => setCustLoading(false))
  }
  useEffect(() => {
    if (showCustomer) searchCustomers('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCustomer])

  const submit = async () => {
    if (!customer) {
      Toast.show('请选择客户')
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
        await createSalesReturn({ customer_id: customer.id, warehouse_id: warehouseId, remark: remark || undefined, items: itemPayload })
      } else if (isEdit && order) {
        await updateSalesOrder(order.id, { customer_id: customer.id, warehouse_id: warehouseId, remark: remark || undefined, items: itemPayload })
      } else {
        await createSalesOrder({ customer_id: customer.id, warehouse_id: warehouseId, remark: remark || undefined, items: itemPayload })
      }
      Toast.show({ icon: 'success', content: '已创建' })
      onSubmitted?.()
      onClose()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const title = mode === 'return' ? '新建销售退货单' : isEdit ? '编辑销售单' : '新建销售单'

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
          <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>{title}</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>客户</div>
            <div onClick={() => setShowCustomer(true)} style={{ padding: '8px 0', fontSize: 15, color: customer ? 'var(--text-primary)' : 'var(--text-tertiary)', borderBottom: '1px solid var(--divider)' }}>
              {customer?.name || '请选择客户'}
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
        visible={showCustomer}
        onMaskClick={() => setShowCustomer(false)}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '12px 16px', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>选择客户</div>
        <div style={{ padding: '0 12px' }}>
          <SearchBar
            placeholder="搜索客户"
            value={kw}
            onChange={(v) => { setKw(v); searchCustomers(v) }}
            onClear={() => { setKw(''); searchCustomers('') }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {custLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>
          ) : custList.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>无匹配客户</div>
          ) : (
            <List>
              {custList.map((c) => (
                <List.Item key={c.id} description={c.customer_no} onClick={() => { setCustomer({ id: c.id, name: c.name }); setShowCustomer(false) }}>
                  {c.name}
                </List.Item>
              ))}
            </List>
          )}
        </div>
      </Popup>
    </>
  )
}
