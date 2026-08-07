// PSI 进销存模块类型(移动端子集)

/** 采购单 */
export interface PsiPurchaseOrder {
  id: number
  order_no: string
  supplier_id: number | null
  supplier_name: string
  warehouse_id: number | null
  warehouse_name: string
  total_amount: string
  status: number
  approval_status: string
  created_at: string
}

/** 销售单 */
export interface PsiSalesOrder {
  id: number
  order_no: string
  customer_id: number | null
  customer_name: string
  warehouse_id: number | null
  warehouse_name: string
  total_amount: string
  status: number
  approval_status: string
  created_at: string
}

/** 库存 */
export interface PsiStock {
  id: number
  product_id: number
  product_name: string
  product_no: string
  warehouse_id: number
  warehouse_name: string
  quantity: string
  unit: string
}

/** 固定资产 */
export interface PsiAsset {
  id: number
  asset_no: string
  name: string
  category: string
  spec: string
  serial_no: string
  purchase_price: string
  net_value: string
  status: number
  location: string
  created_at: string
}

export const PURCHASE_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '待入库', color: 'warning' },
  2: { text: '已入库', color: 'success' },
  3: { text: '已关闭', color: 'default' },
}

export const ASSET_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '使用中', color: 'success' },
  2: { text: '闲置', color: 'default' },
  3: { text: '维修中', color: 'warning' },
  4: { text: '已报废', color: 'danger' },
  5: { text: '丢失', color: 'danger' },
}
