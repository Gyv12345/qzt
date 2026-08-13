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

/** 供应商 */
export interface PsiSupplier {
  id: number
  name: string
  supplier_no: string
  contact_person: string
  phone: string
  email: string
  address: string
  status: number
  created_at: string
}

/** 仓库 */
export interface PsiWarehouse {
  id: number
  code: string
  name: string
  address: string
  manager_id: number | null
  phone: string
  sort: number
  is_default: number
  status: number
}

/** 库存流水 */
export interface PsiStockMovement {
  id: number
  biz_type: string
  biz_order_no: string
  product_id: number
  product_name?: string
  warehouse_id: number
  warehouse_name?: string
  in_qty: string
  out_qty: string
  balance_after: string
  unit_cost: string
  remark: string
  created_at: string
}

/** 采购退货单 */
export interface PsiPurchaseReturn {
  id: number
  return_no: string
  supplier_id: number | null
  supplier_name: string
  return_date: string | null
  total_amount: string
  status: number
  approval_status: string
  created_at: string
}

/** 销售退货单 */
export interface PsiSalesReturn {
  id: number
  return_no: string
  customer_id: number | null
  customer_name: string
  return_date: string | null
  total_amount: string
  status: number
  approval_status: string
  created_at: string
}

export const RETURN_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '待处理', color: 'warning' },
  2: { text: '已完成', color: 'success' },
}

/** 业务类型映射(库存流水) */
export const BIZ_TYPE_TEXT: Record<string, string> = {
  PURCHASE_IN: '采购入库',
  SALE_OUT: '销售出库',
  RETURN_OUT: '采购退货',
  RETURN_IN: '销售退货',
  OTHER_IN: '其他入库',
  OTHER_OUT: '其他出库',
}
export const BIZ_TYPE_COLOR: Record<string, string> = {
  PURCHASE_IN: 'success',
  SALE_OUT: 'primary',
  RETURN_OUT: 'danger',
  RETURN_IN: 'warning',
  OTHER_IN: 'success',
  OTHER_OUT: 'danger',
}

export const PSI_STATUS_TEXT: Record<number, string> = { 1: '启用', 2: '停用' }

/** 其他入库单 */
export interface PsiStockInOrder {
  id: number
  order_no: string
  warehouse_id: number
  warehouse_name?: string
  biz_type: string
  order_date: string | null
  total_amount: string
  status: number
  operator_id: number | null
  remark: string
  created_at: string
}

export interface PsiStockInOrderDetail {
  id: number
  order_id: number
  product_id: number
  product_name?: string
  quantity: string
  unit_cost: string
  remark: string
}

/** 其他出库单 */
export interface PsiStockOutOrder {
  id: number
  order_no: string
  warehouse_id: number
  warehouse_name?: string
  biz_type: string
  order_date: string | null
  status: number
  operator_id: number | null
  remark: string
  created_at: string
}

export interface PsiStockOutOrderDetail {
  id: number
  order_id: number
  product_id: number
  product_name?: string
  quantity: string
  remark: string
}

export const STOCK_IN_BIZ_TYPE: Record<string, string> = {
  INIT: '期初', PROFIT: '盘盈', GIFT: '赠品', OTHER: '其他',
}
export const STOCK_OUT_BIZ_TYPE: Record<string, string> = {
  LOSS: '盘亏', SCRAP: '报废', USE: '领用', OTHER: '其他',
}
export const STOCK_IO_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '待生效', color: 'warning' },
  2: { text: '已生效', color: 'success' },
}
