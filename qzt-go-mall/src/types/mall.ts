/** 与后端 internal/module/mall/service DTO 对齐 */

/** 商城买家账号(注册/登录返回;auth/me 返回同形) */
export interface MallUser {
  id: number
  phone: string
  nickname: string
}

/** 商品规格 SKU(spec 为空 = 默认规格/单规格) */
export interface MallSku {
  id: number
  spec: string
  sku_no: string
  price: string
  image_url: string
  stock_qty: string
  in_stock: boolean
}

export interface MallGoods {
  id: number
  name: string
  product_no: string
  category: string
  unit: string
  standard_price: string
  /** 活动价(null = 无促销);存在时主价显示它,original_price 划线 */
  promo_price: string | null
  original_price: string
  image_url: string
  description: string
  stock_qty: string
  in_stock: boolean
  skus: MallSku[]
}

/** 是否多规格商品(存在规格描述非空的 SKU,或 SKU 多于一条) */
export const isMultiSpec = (g: MallGoods) =>
  (g.skus ?? []).length > 1 || (g.skus ?? []).some((s) => s.spec !== '')

export interface CreateOrderItemPayload {
  product_id: number
  sku_id?: number
  quantity: number
}

export interface CreateOrderPayload {
  items: CreateOrderItemPayload[]
  contact_name: string
  contact_phone: string
  address: string
  remark?: string
  /** 已登录买家使用的优惠券券号;匿名下单不带 */
  coupon_no?: string
}

export interface CreateOrderResult {
  order_no: string
  total_amount: string
  /** 优惠券抵扣金额(未用券为 0) */
  discount_amount: string
  status: number
  sales_order_no: string
}

export interface PublicOrder {
  order_no: string
  status: number
  status_label: string
  total_amount: string
  discount_amount?: string
  items: { product_name: string; spec: string; quantity: string; unit_price: string; amount: string }[]
  created_at: string
}

/** 领券中心的可领券(GOODS 公开接口) */
export interface PublicCoupon {
  id: number
  name: string
  /** 满减门槛(满 threshold 可用),字符串金额 */
  threshold: string
  /** 抵扣面额,字符串金额 */
  discount: string
  /** 剩余可领数量 */
  remaining: string
  /** 每人限领张数 */
  per_user_limit: number
}

/** 我的券包条目(status: 1 未使用 / 2 已使用 / 3 已过期) */
export interface UserCouponItem {
  id: number
  coupon_id: number
  coupon_no: string
  /** 后端券包 DTO 为扁平结构(name/threshold/discount 平铺,非嵌套 coupon 对象) */
  name: string
  threshold: string
  discount: string
  status: number
  status_label: string
  used_order_no: string
  used_at: string | null
  start_at: string | null
  end_at: string | null
}
