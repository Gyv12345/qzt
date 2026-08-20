/** 与后端 internal/module/mall/service DTO 对齐 */

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
}

export interface CreateOrderItemPayload {
  product_id: number
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
  items: { product_name: string; quantity: string; unit_price: string; amount: string }[]
  created_at: string
}
