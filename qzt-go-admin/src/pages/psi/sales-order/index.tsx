import OrderDocPage, { type OrderDocFormValues } from '../components/OrderDocPage'
import {
  createSalesOrder,
  deleteSalesOrder,
  getSalesOrder,
  listSalesOrders,
  stockOutSalesOrder,
  updateSalesOrder,
  type SalesOrderQuery,
} from '../../../services/psi'
import type { PsiSalesOrder, PsiSalesOrderPayload } from '../../../types/psi'

const toPayload = (v: OrderDocFormValues): PsiSalesOrderPayload => ({
  customer_id: v.party_id,
  warehouse_id: v.warehouse_id,
  order_date: v.order_date,
  discount_amount: v.discount_amount,
  items: v.items,
})

/** 销售单:客户 + 仓库 + 审批流,支持编辑/删除/销售出库 */
export default function SalesOrderPage() {
  return (
    <OrderDocPage<PsiSalesOrder>
      docName="销售单"
      listTitle="销售单列表"
      addLabel="新增销售单"
      dateLabel="订单日期"
      itemsLabel="单据明细"
      party="customer"
      showApproval
      showDiscountInList
      detailItemExtra="shipped"
      detailFields={[
        { key: 'no' },
        { key: 'party' },
        { key: 'warehouse' },
        { key: 'date' },
        { key: 'approval' },
        { key: 'createdAt' },
        { key: 'totalQuantity' },
        { key: 'totalAmount' },
        { key: 'discount' },
        { key: 'remark' },
      ]}
      perms={{
        add: 'psi:sales-order:add',
        edit: 'psi:sales-order:edit',
        delete: 'psi:sales-order:delete',
      }}
      service={{
        list: (p) => listSalesOrders(p as SalesOrderQuery),
        get: (id) => getSalesOrder(id),
        create: (v) => createSalesOrder(toPayload(v)),
        update: (id, v) => updateSalesOrder(id, toPayload(v)),
        remove: (id) => deleteSalesOrder(id),
        stock: {
          perm: 'psi:sales-order:stock-out',
          label: '执行出库',
          confirmTitle: '确认执行销售出库?将按明细数量减少库存',
          success: '销售出库已执行',
          run: (id) => stockOutSalesOrder(id),
        },
      }}
    />
  )
}
