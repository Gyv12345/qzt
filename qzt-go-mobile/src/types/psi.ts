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
  /** 规格SKU ID(0=历史数据未指定) */
  sku_id: number
  /** 规格描述(后端回填,空=默认规格) */
  sku_spec?: string
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

// ── 库存盘点/调拨(P15 移动端) ──

export const STOCKTAKE_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '盘点中', color: 'warning' },
  2: { text: '已确认', color: 'success' },
  3: { text: '已作废', color: 'default' },
}

export const STOCK_TRANSFER_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '在途', color: 'warning' },
  2: { text: '完成', color: 'success' },
  3: { text: '已作废', color: 'default' },
}

/** 盘点单 */
export interface PsiStocktake {
  id: number
  stocktake_no: string
  warehouse_id: number
  status: number
  take_date: string
  remark: string
  warehouse_name?: string
  items?: PsiStocktakeItem[]
}

/** 盘点明细 */
export interface PsiStocktakeItem {
  id: number
  product_id: number
  sku_id: number
  sku_spec?: string
  expected_qty: string
  actual_qty: string | null
  diff_qty: string
  remark: string
}

/** 盘点单详情(含明细) */
export type PsiStocktakeDetail = PsiStocktake & {
  items: PsiStocktakeItem[] | null
}

/** 调拨单 */
export interface PsiStockTransfer {
  id: number
  transfer_no: string
  from_warehouse_id: number
  to_warehouse_id: number
  status: number
  transfer_date: string
  remark: string
  from_warehouse_name?: string
  to_warehouse_name?: string
  items?: PsiStockTransferItem[]
}

/** 调拨明细 */
export interface PsiStockTransferItem {
  id: number
  product_id: number
  sku_id: number
  sku_spec?: string
  quantity: string
  remark: string
}

/** 调拨单详情(含明细) */
export type PsiStockTransferDetail = PsiStockTransfer & {
  items: PsiStockTransferItem[] | null
}

/** 库存结余行(调拨选商品用) */
export interface PsiStockRow {
  id: number
  product_id: number
  sku_id: number
  warehouse_id: number
  quantity: string
  product_name?: string
  sku_spec?: string
}
