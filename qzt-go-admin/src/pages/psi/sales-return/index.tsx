import OrderDocPage, { type OrderDocFormValues } from '../components/OrderDocPage'
import {
  createSalesReturn,
  getSalesReturn,
  listSalesReturns,
  stockInSalesReturn,
  type SalesReturnQuery,
} from '../../../services/psi'
import type { PsiReturnOrder, PsiSalesOrderPayload } from '../../../types/psi'

const toPayload = (v: OrderDocFormValues): PsiSalesOrderPayload => ({
  customer_id: v.party_id,
  warehouse_id: v.warehouse_id,
  order_date: v.order_date,
  discount_amount: v.discount_amount,
  items: v.items,
})

/** 销售退货单:仅新增 + 退货入库(无编辑/删除/审批) */
export default function SalesReturnPage() {
  return (
    <OrderDocPage<PsiReturnOrder>
      docName="销售退货"
      listTitle="销售退货列表"
      addLabel="新增销售退货"
      dateLabel="退货日期"
      itemsLabel="退货明细"
      party="customer"
      statusLabels={{ 1: '待入库', 2: '已完成' }}
      createMessage="销售退货单已创建"
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
      perms={{ add: 'psi:sales-return:add' }}
      service={{
        list: (p) => listSalesReturns(p as SalesReturnQuery),
        get: (id) => getSalesReturn(id),
        create: (v) => createSalesReturn(toPayload(v)),
        stock: {
          perm: 'psi:sales-return:stock-in',
          label: '执行入库',
          confirmTitle: '确认执行退货入库?将按明细数量增加库存',
          success: '退货入库已执行',
          run: (id) => stockInSalesReturn(id),
        },
      }}
    />
  )
}
