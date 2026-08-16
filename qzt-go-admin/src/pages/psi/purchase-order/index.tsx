import OrderDocPage, { type OrderDocFormValues } from '../components/OrderDocPage'
import { usePageGuide } from '../../../components/guide/usePageGuide'
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  stockInPurchaseOrder,
  updatePurchaseOrder,
  type PurchaseOrderQuery,
} from '../../../services/psi'
import type { PsiPurchaseOrder, PsiPurchaseOrderPayload } from '../../../types/psi'

const toPayload = (v: OrderDocFormValues): PsiPurchaseOrderPayload => ({
  supplier_id: v.party_id,
  warehouse_id: v.warehouse_id,
  order_date: v.order_date,
  expected_date: v.expected_date,
  discount_amount: v.discount_amount,
  items: v.items,
})

/** 采购单:供应商 + 仓库 + 预计到货 + 审批流,支持编辑/删除/采购入库 */
export default function PurchaseOrderPage() {
  usePageGuide('psi.purchase-order')
  return (
    <OrderDocPage<PsiPurchaseOrder>
      docName="采购单"
      listTitle="采购单列表"
      addLabel="新增采购单"
      dateLabel="订单日期"
      itemsLabel="单据明细"
      party="supplier"
      showApproval
      showExpectedDate
      showDiscountInList
      guide
      detailItemExtra="received"
      detailFields={[
        { key: 'no' },
        { key: 'party' },
        { key: 'warehouse' },
        { key: 'date' },
        { key: 'expected' },
        { key: 'approval' },
        { key: 'totalQuantity' },
        { key: 'totalAmount' },
        { key: 'discount' },
        { key: 'createdAt' },
        { key: 'remark', span: 2 },
      ]}
      perms={{
        add: 'psi:purchase-order:add',
        edit: 'psi:purchase-order:edit',
        delete: 'psi:purchase-order:delete',
      }}
      service={{
        list: (p) => listPurchaseOrders(p as PurchaseOrderQuery),
        get: (id) => getPurchaseOrder(id),
        create: (v) => createPurchaseOrder(toPayload(v)),
        update: (id, v) => updatePurchaseOrder(id, toPayload(v)),
        remove: (id) => deletePurchaseOrder(id),
        stock: {
          perm: 'psi:purchase-order:stock-in',
          label: '执行入库',
          confirmTitle: '确认执行采购入库?将按明细数量增加库存',
          success: '采购入库已执行',
          run: (id) => stockInPurchaseOrder(id),
        },
      }}
    />
  )
}
