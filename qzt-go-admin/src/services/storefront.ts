import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  StorefrontConfig,
  StorefrontConfigPayload,
  StorefrontOrder,
  StorefrontOrderStatus,
  StorefrontProduct,
  StorefrontProductPayload,
} from '../types/storefront'

interface PageResult<T> {
  list: T[]
  total: number
}

export interface StorefrontProductQuery extends PageParams {
  keyword?: string
}

/** 独立站商品列表 */
export const listStorefrontProducts = (params?: StorefrontProductQuery) =>
  request.get<unknown, PageResult<StorefrontProduct>>('/storefront/products', { params })

/** 独立站商品详情(附 direct_price + i18n map,编辑回填用) */
export const getStorefrontProduct = (id: number) =>
  request.get<unknown, StorefrontProduct>(`/storefront/products/${id}`)

/** 创建上架商品(product_id/slug/i18n.en.name 必填) */
export const createProduct = (data: StorefrontProductPayload) =>
  request.post<unknown, { id: number }>('/storefront/products', data)

/** 更新上架商品;price 传 null 清空直标价 */
export const updateProduct = (id: number, data: StorefrontProductPayload) =>
  request.put<unknown, boolean>(`/storefront/products/${id}`, data)

/** 独立站站点配置 */
export const getStorefrontConfig = () => request.get<unknown, StorefrontConfig>('/storefront/config')

export const updateStorefrontConfig = (data: StorefrontConfigPayload) =>
  request.put<unknown, boolean>('/storefront/config', data)

export interface StorefrontOrderQuery extends PageParams {
  status?: StorefrontOrderStatus
}

/** 独立站订单列表 */
export const getStorefrontOrders = (params?: StorefrontOrderQuery) =>
  request.get<unknown, PageResult<StorefrontOrder>>('/storefront/orders', { params })

/** 独立站订单详情(含商品明细) */
export const getStorefrontOrder = (id: number) =>
  request.get<unknown, StorefrontOrder>(`/storefront/orders/${id}`)
