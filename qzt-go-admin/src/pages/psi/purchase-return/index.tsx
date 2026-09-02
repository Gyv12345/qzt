import OrderDocPage, { type OrderDocFormValues } from '../components/OrderDocPage'
import {
  createPurchaseReturn,
  getPurchaseReturn,
  listPurchaseReturns,
  stockOutPurchaseReturn,
  type PurchaseReturnQuery,
} from '../../../services/psi'
import type { PsiPurchaseOrderPayload, PsiReturnOrder } from '../../../types/psi'

const toPayload = (v: OrderDocFormValues): PsiPurchaseOrderPayload => ({
  supplier_id: v.party_id,
  warehouse_id: v.warehouse_id,
  order_date: v.order_date,
  discount_amount: v.discount_amount,
  items: v.items,
})

/** 采购退货单:仅新增 + 退货出库(无编辑/删除/审批) */
export default function PurchaseReturnPage() {
  return (
    <OrderDocPage<PsiReturnOrder>
      docName="采购退货"
      listTitle="采购退货列表"
      addLabel="新增采购退货"
      dateLabel="退货日期"
      itemsLabel="退货明细"
      party="supplier"
      statusLabels={{ 1: '待出库', 2: '已完成' }}
      createMessage="采购退货单已创建"
      drawerWidth={720}
      detailFields={[
        { key: 'no' },
        { key: 'party' },
        { key: 'warehouse' },
        { key: 'date' },
        { key: 'totalQuantity' },
        { key: 'totalAmount' },
        { key: 'createdAt' },
        { key: 'remark' },
      ]}
      perms={{ add: 'psi:purchase-return:add' }}
      service={{
        list: (p) => listPurchaseReturns(p as PurchaseReturnQuery),
        get: (id) => getPurchaseReturn(id),
        create: (v) => createPurchaseReturn(toPayload(v)),
        stock: {
          perm: 'psi:purchase-return:stock-out',
          label: '执行出库',
          confirmTitle: '确认执行退货出库?将按明细数量减少库存',
          success: '退货出库已执行',
          run: (id) => stockOutPurchaseReturn(id),
        },
      }}
    />
  )
}
