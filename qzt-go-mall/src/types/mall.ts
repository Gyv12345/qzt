/** 与后端 internal/module/mall/service DTO 对齐 */

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
}

export interface CreateOrderResult {
  order_no: string
  total_amount: string
  status: number
  sales_order_no: string
}

export interface PublicOrder {
  order_no: string
  status: number
  status_label: string
  total_amount: string
  items: { product_name: string; spec: string; quantity: string; unit_price: string; amount: string }[]
  created_at: string
}
