// 独立站(storefront)模块类型:上架商品 + 站点配置
// 与后端 /storefront API 契约对齐(P28-A)

/** 单语言文案 */
export interface StorefrontLocaleText {
  name?: string
  summary?: string
  description?: string
}

/** 多语言文案,按 config.locales 配置扩展 */
export interface StorefrontI18n {
  en?: StorefrontLocaleText
  zh?: StorefrontLocaleText
}

/** 上架商品状态:1上架 2下架(与 CRM 商品状态口径一致) */
export type StorefrontProductStatus = 1 | 2

/** 独立站商品列表行 */
export interface StorefrontProduct {
  id: number
  /** 后端对外商品 ID(列表页/前台路由用) */
  storefront_product_id: number
  /** 关联 CRM 商品 ID */
  product_id: number
  slug: string
  /** 当前语言解析后的展示文案(非原始 i18n 存储) */
  name: string
  summary: string
  description: string
  /** 直标价,null=按 CRM 价折算 */
  price: number | null
  /** 直标价原值(仅详情接口返回;编辑回填用,区别于展示价 price) */
  direct_price?: number | null
  /** 各语言原文(仅详情接口返回;编辑回填用) */
  i18n?: StorefrontI18n
  currency: string
  /** 价格来源:direct=直标 crm=按 CRM 价折算 */
  price_source: string
  image_url: string
  /** 上架状态(契约行字段未显式列出,但状态列/快捷上下架必需) */
  status: StorefrontProductStatus
  in_stock: boolean
  featured: boolean
  /** 已完成翻译的 locale 列表,如 ['en','zh'] */
  locales_done: string[]
  crm_name: string
  crm_price: string
  /** CRM 商品状态(字典 PRODUCT_STATUS) */
  crm_status: number
  sort: number
}

/** 创建/更新上架商品请求体(创建时 product_id/slug/i18n.en.name 必填) */
export interface StorefrontProductPayload {
  /** 仅创建时必填 */
  product_id?: number
  slug?: string
  status?: StorefrontProductStatus
  sort?: number
  /** null=清空直标价,回落按 CRM 价折算 */
  price?: number | null
  currency?: string
  featured?: boolean
  i18n?: StorefrontI18n
}

/** 独立站站点配置 */
export interface StorefrontConfig {
  /** 站点开放的语言列表,如 ['en','zh'] */
  locales: string[]
  /** 货币→汇率映射,如 {USD:1,EUR:0.92} */
  rates: Record<string, number>
  /** 订单/询盘邮件通知收件人,逗号分隔;空=邮件通知通道关闭 (P28-C) */
  notify_email?: string
}

export interface StorefrontConfigPayload {
  locales: string[]
  rates: Record<string, number>
  /** 逗号分隔收件人;PUT 传空串=清除(邮件通知关闭) */
  notify_email?: string
}

/** 独立站订单状态:1待支付 2已支付 3已取消 4已过期(Stripe Checkout 生命周期) */
export type StorefrontOrderStatus = 1 | 2 | 3 | 4

export const STOREFRONT_ORDER_STATUS_TEXT: Record<StorefrontOrderStatus, string> = {
  1: '待支付',
  2: '已支付',
  3: '已取消',
  4: '已过期',
}

/** 独立站订单商品行(下单时快照,金额为 Go decimal 序列化字符串) */
export interface StorefrontOrderItem {
  id: number
  /** 关联 CRM 商品 ID */
  product_id: number
  /** 商品名快照 */
  product_name: string
  /** 规格/SKU 快照(空 = 默认规格) */
  sku: string
  quantity: number
  /** 单价 */
  unit_amount: string
  /** 小计 = quantity × unit_amount */
  amount: string
}

/** 独立站订单(Stripe Checkout 支付) */
export interface StorefrontOrder {
  id: number
  order_no: string
  status: StorefrontOrderStatus
  currency: string
  total_amount: string
  customer_email: string
  customer_name: string
  customer_country: string
  /** Stripe Checkout Session ID(下单即有) */
  stripe_session_id: string | null
  /** Stripe Payment Intent ID(支付成功后回填) */
  payment_intent_id: string | null
  /** 关联 PSI 销售单号(未生成为空) */
  psi_order_no: string
  /** 下单语言,如 en/zh */
  locale: string
  /** 下单 IP */
  ip: string
  /** 支付时间(未支付为 null) */
  paid_at: string | null
  created_at: string
  items: StorefrontOrderItem[]
}
