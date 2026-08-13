import { Popup, TextArea, Button, Toast, Selector } from 'antd-mobile'
import { useEffect, useState } from 'react'
import { createStockInOrder, createStockOutOrder, listEnabledWarehouses } from '../services/psi'
import { STOCK_IN_BIZ_TYPE, STOCK_OUT_BIZ_TYPE, type PsiWarehouse } from '../types/psi'
import StockItemEditor, { type StockItem } from './StockItemEditor'

interface Props {
  visible: boolean
  onClose: () => void
  /** in=入库单, out=出库单(均创建即生效) */
  mode: 'in' | 'out'
  onSubmitted?: () => void
}

/** 其他入库/出库单表单(选仓库 + 业务类型 + 商品明细) */
export default function StockIoSheet({ visible, onClose, mode, onSubmitted }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined)
  const [bizType, setBizType] = useState<string | undefined>(undefined)
  const [remark, setRemark] = useState('')
  const [items, setItems] = useState<StockItem[]>([])
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])

  const bizMap = mode === 'in' ? STOCK_IN_BIZ_TYPE : STOCK_OUT_BIZ_TYPE

  useEffect(() => {
    if (visible) {
      listEnabledWarehouses().then(setWarehouses).catch(() => {})
      setWarehouseId(undefined)
      setBizType(undefined)
      setRemark('')
      setItems([])
    }
  }, [visible])

  const submit = async () => {
    if (!warehouseId) {
      Toast.show('请选择仓库')
      return
    }
    if (!bizType) {
      Toast.show('请选择业务类型')
      return
    }
    if (items.length === 0) {
      Toast.show('请添加商品明细')
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'in') {
        await createStockInOrder({
          warehouse_id: warehouseId,
          biz_type: bizType,
          remark: remark || undefined,
          items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity, unit_cost: it.unit_cost || undefined })),
        })
      } else {
        await createStockOutOrder({
          warehouse_id: warehouseId,
          biz_type: bizType,
          remark: remark || undefined,
          items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
        })
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
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      destroyOnClose
      bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '88vh', overflowY: 'auto' }}
    >
      <div style={{ padding: '16px 16px 24px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
          {mode === 'in' ? '新建入库单' : '新建出库单'}
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
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>业务类型</div>
          <Selector
            options={Object.entries(bizMap).map(([value, label]) => ({ label, value }))}
            value={bizType ? [bizType] : []}
            onChange={(v) => setBizType(v[0] as string)}
            columns={2}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>备注</div>
          <TextArea placeholder="选填" rows={2} value={remark} onChange={setRemark} />
        </div>

        <StockItemEditor items={items} onChange={setItems} mode={mode} />

        <Button block color="primary" size="large" style={{ marginTop: 16 }} loading={submitting} onClick={submit}>
          创建
        </Button>
      </div>
    </Popup>
  )
}
