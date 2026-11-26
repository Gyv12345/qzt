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

// ---------- 商城营销:优惠券 / 限时特价(admin 管理侧) ----------

/** 启停状态:1启用 2停用 */
export type MallEnableStatus = 1 | 2

export const MALL_ENABLE_STATUS_TEXT: Record<MallEnableStatus, string> = { 1: '启用', 2: '停用' }

/** 优惠券(满减券) */
export interface MallCoupon {
  id: number
  name: string
  /** 满减门槛金额(两位小数) */
  threshold: number | string
  /** 优惠金额(两位小数) */
  discount: number | string
  total_count: number
  /** 已领取张数 */
  claimed: number
  /** 每人限领张数 */
  per_user_limit: number
  /** 有效期起止(空 = 长期有效) */
  start_at?: string | null
  end_at?: string | null
  status: MallEnableStatus
  created_at: string
}

export interface MallCouponPayload {
  name: string
  threshold: number
  discount: number
  total_count: number
  per_user_limit: number
  start_at?: string
  end_at?: string
  /** 仅编辑(半增量)时提交 */
  status?: MallEnableStatus
}

/** 限时特价活动 */
export interface MallPromotion {
  id: number
  name: string
  product_id: number
  product_name: string
  /** 促销价(两位小数) */
  promo_price: number | string
  start_at: string
  end_at: string
  status: MallEnableStatus
  created_at: string
}

export interface MallPromotionPayload {
  name: string
  product_id: number
  promo_price: number
  start_at: string
  end_at: string
  /** 仅编辑(半增量)时提交 */
  status?: MallEnableStatus
}
