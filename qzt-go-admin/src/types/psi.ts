// PSI 进销存模块 API 契约类型,与 qzt-go-server swagger 定义保持一致
// 注意:数量/金额字段后端以字符串(decimal)返回

/** 供应商 */
export interface PsiSupplier {
  id: number
  name: string
  supplier_no: string
  contact_person: string
  phone: string
  email: string
  address: string
  bank_name: string
  bank_account: string
  /** 1 启用 0 停用 */
  status: number
  remark: string
  created_at: string
  updated_at: string
}

/** 创建/更新供应商请求 */
export interface PsiSupplierPayload {
  name: string
  supplier_no?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  bank_name?: string
  bank_account?: string
  status?: number
  remark?: string
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
  /** 1 启用 0 停用 */
  status: number
  /** 1 默认仓库 */
  is_default: number
  remark: string
  created_at: string
  updated_at: string
}

/** 创建/更新仓库请求 */
export interface PsiWarehousePayload {
  code: string
  name: string
  address?: string
  manager_id?: number
  phone?: string
  sort?: number
  status?: number
  is_default?: number
  remark?: string
}

/** 单据明细行(请求)。sku_id 不传时后端解析商品默认规格(多规格商品必传) */
export interface PsiOrderItemPayload {
  product_id: number
  sku_id?: number
  quantity: number
  unit_price?: number
  unit_cost?: number
  remark?: string
}

/** 采购单 */
export interface PsiPurchaseOrder {
  id: number
  order_no: string
  supplier_id: number
  warehouse_id: number
  order_date: string
  expected_date: string | null
  total_quantity: string
  total_amount: string
  discount_amount: string
  /** 1 正常 */
  status: number
  /** NONE / PENDING / APPROVED / REJECTED */
  approval_status: string
  operator_id: number
  remark: string
  created_at: string
  updated_at: string
  /** 详情时返回 */
  items?: PsiPurchaseOrderItem[]
}

/** 采购单明细 */
export interface PsiPurchaseOrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id?: number
  /** 规格描述(后端回填,空 = 默认规格) */
  sku_spec?: string
  quantity: string
  received_quantity: string
  unit_price: string
  amount: string
  remark: string
  created_at: string
  updated_at: string
}

/** 创建采购单请求 */
export interface PsiPurchaseOrderPayload {
  supplier_id: number
  warehouse_id: number
  order_date?: string
  expected_date?: string
  discount_amount?: number
  remark?: string
  items: PsiOrderItemPayload[]
}

/** 销售单 */
export interface PsiSalesOrder {
  id: number
  order_no: string
  customer_id: number
  warehouse_id: number
  order_date: string
  total_quantity: string
  total_amount: string
  discount_amount: string
  status: number
  approval_status: string
  operator_id: number
  remark: string
  created_at: string
  updated_at: string
  items?: PsiSalesOrderItem[]
}

/** 销售单明细 */
export interface PsiSalesOrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id?: number
  /** 规格描述(后端回填,空 = 默认规格) */
  sku_spec?: string
  quantity: string
  /** 已出库数量(后端字段为 delivered_quantity) */
  delivered_quantity?: string
  unit_price: string
  amount: string
  remark: string
  created_at: string
  updated_at: string
}

/** 创建销售单请求 */
export interface PsiSalesOrderPayload {
  customer_id: number
  warehouse_id: number
  order_date?: string
  discount_amount?: number
  remark?: string
  items: PsiOrderItemPayload[]
}

/** 退货单(采购退货/销售退货共用结构) */
export interface PsiReturnOrder {
  id: number
  order_no?: string
  return_no?: string
  supplier_id?: number
  customer_id?: number
  warehouse_id: number
  order_date: string
  total_quantity: string
  total_amount: string
  status: number
  operator_id: number
  remark: string
  created_at: string
  updated_at: string
  items?: PsiReturnOrderItem[]
}

/** 退货单明细 */
export interface PsiReturnOrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id?: number
  /** 规格描述(后端回填,空 = 默认规格) */
  sku_spec?: string
  quantity: string
  unit_price?: string
  amount?: string
  remark: string
  created_at: string
  updated_at: string
}

/** 其他入库单/出库单 */
export interface PsiStockOrder {
  id: number
  order_no: string
  /** 入库:INIT/PROFIT/GIFT/OTHER;出库:LOSS/SCRAP/USE/OTHER */
  biz_type: string
  warehouse_id: number
  order_date: string
  total_quantity: string
  status: number
  operator_id: number
  remark: string
  created_at: string
  updated_at: string
  items?: PsiStockOrderItem[]
}

/** 其他出入库单明细 */
export interface PsiStockOrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id?: number
  /** 规格描述(后端回填,空 = 默认规格) */
  sku_spec?: string
  quantity: string
  unit_cost?: string
  remark: string
  created_at: string
  updated_at: string
}

/** 创建其他入库单请求 */
export interface PsiStockInPayload {
  warehouse_id: number
  biz_type: string
  order_date?: string
  remark?: string
  items: PsiOrderItemPayload[]
}

/** 创建其他出库单请求 */
export interface PsiStockOutPayload {
  warehouse_id: number
  biz_type: string
  order_date?: string
  remark?: string
  items: PsiOrderItemPayload[]
}

/** 库存结余(按 规格SKU+仓库 维度) */
export interface PsiStock {
  id: number
  product_id: number
  sku_id: number
  /** 规格描述(后端回填,空 = 默认规格) */
  sku_spec: string
  warehouse_id: number
  /** 仓库名称(后端回填,含停用仓库) */
  warehouse_name?: string
  quantity: string
  safety_stock: string
  product_name: string
  product_no: string
  unit: string
  category: string
  created_at: string
  updated_at: string
}

/** 库存收发明细 */
export interface PsiStockMovement {
  id: number
  /** PURCHASE_IN / SALE_OUT / RETURN_IN / RETURN_OUT / OTHER_IN / OTHER_OUT 等 */
  biz_type: string
  biz_order_type: string
  biz_order_id: number
  biz_order_no: string
  product_id: number
  /** 商品名称(后端回填) */
  product_name: string
  sku_id: number
  /** 规格描述(后端回填,空 = 默认规格) */
  sku_spec: string
  warehouse_id: number
  /** 仓库名称(后端回填,含停用仓库) */
  warehouse_name?: string
  in_qty: string
  out_qty: string
  balance_after: string
  unit_cost: string
  operator_id: number
  remark: string
  created_at: string
  updated_at: string
}

/** 采购汇总数据点 */
export interface PsiPurchaseSummaryItem {
  date: string
  count: number
  amount: string
}

/** 商品销量排行(后端文档未定义,字段按常规推断,均为可选) */
export interface PsiSalesRankItem {
  product_id?: number
  product_name?: string
  product_no?: string
  quantity?: string
  amount?: string
}

// ---------- 固定资产 ----------

export interface PsiAsset {
  id: number
  asset_no: string
  name: string
  category: string
  spec: string
  serial_no: string
  warehouse_id: number | null
  dept_id: number | null
  owner_id: number | null
  purchase_date: string | null
  purchase_price: string
  depreciation: string
  net_value: string
  useful_life: number
  status: number
  location: string
  remark: string
  created_at: string
  updated_at: string
}

export const ASSET_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '使用中', color: 'success' },
  2: { text: '闲置', color: 'default' },
  3: { text: '维修中', color: 'warning' },
  4: { text: '已报废', color: 'error' },
  5: { text: '丢失', color: 'error' },
}

export const ASSET_CATEGORY: Record<string, string> = {
  电脑: '电脑', 设备: '设备', 家具: '家具', 车辆: '车辆', 其他: '其他',
}
