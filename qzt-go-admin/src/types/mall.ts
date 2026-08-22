// 与后端 internal/model/mall/ + internal/module/mall/service/ 对齐
// 商城订单(垂直商城:商品复用 crm_product,此处仅订单域)

/** 商城订单状态:1待处理 2已确认 3已完成 4已取消 */
export type MallOrderStatus = 1 | 2 | 3 | 4

export interface MallOrder {
  id: number
  order_no: string
  customer_id?: number | null
  contact_name: string
  contact_phone: string
  address: string
  remark?: string
  total_quantity: string
  total_amount: string
  status: MallOrderStatus
  psi_order_id?: number | null
  created_at: string
  updated_at: string
}

export interface MallOrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id?: number
  product_name: string
  /** 规格描述快照(空 = 默认规格) */
  spec?: string
  quantity: string
  unit_price: string
  amount: string
}

/** 订单详情(管理侧,含客户名与关联销售单号) */
export interface MallOrderDetail extends MallOrder {
  status_label: string
  items: MallOrderItem[]
  customer_name: string
  sales_order_no: string
}

export const MALL_STATUS_TEXT: Record<MallOrderStatus, string> = {
  1: '待处理',
  2: '已确认',
  3: '已完成',
  4: '已取消',
}
