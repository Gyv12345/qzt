import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  MallCoupon,
  MallCouponPayload,
  MallOrder,
  MallOrderDetail,
  MallOrderStatus,
  MallPromotion,
  MallPromotionPayload,
} from '../types/mall'

interface PageResult<T> { list: T[]; total: number }

export interface MallOrderQuery extends PageParams {
  status?: MallOrderStatus
  keyword?: string
}

export const listMallOrders = (params?: MallOrderQuery) =>
  request.get<unknown, PageResult<MallOrder>>('/mall/orders', { params })

export const getMallOrder = (id: number) =>
  request.get<unknown, MallOrderDetail>(`/mall/orders/${id}`)

/** 状态流转:2已确认 3已完成 4已取消 */
export const updateMallOrderStatus = (id: number, status: MallOrderStatus) =>
  request.put(`/mall/orders/${id}/status`, { status })

/** 手动生成 PSI 销售单(下单时无默认仓库的订单) */
export const generateMallSalesOrder = (id: number, warehouseId: number) =>
  request.post<unknown, { sales_order_no: string }>(`/mall/orders/${id}/generate-sales-order`, { warehouse_id: warehouseId })

// ---------- 优惠券(admin,/mall/admin/coupons) ----------

export interface MallCouponQuery extends PageParams {
  keyword?: string
}

export const listMallCoupons = (params?: MallCouponQuery) =>
  request.get<unknown, PageResult<MallCoupon>>('/mall/admin/coupons', { params })

export const createMallCoupon = (data: MallCouponPayload) =>
  request.post('/mall/admin/coupons', data)

/** 半增量更新(含 status 启停) */
export const updateMallCoupon = (id: number, data: Partial<MallCouponPayload>) =>
  request.put(`/mall/admin/coupons/${id}`, data)

/** 软删除 */
export const deleteMallCoupon = (id: number) =>
  request.delete(`/mall/admin/coupons/${id}`)

// ---------- 限时特价(admin,/mall/admin/promotions) ----------

export const listMallPromotions = (params?: PageParams) =>
  request.get<unknown, PageResult<MallPromotion>>('/mall/admin/promotions', { params })

export const createMallPromotion = (data: MallPromotionPayload) =>
  request.post('/mall/admin/promotions', data)

/** 半增量更新(含 status 启停) */
export const updateMallPromotion = (id: number, data: Partial<MallPromotionPayload>) =>
  request.put(`/mall/admin/promotions/${id}`, data)

export const deleteMallPromotion = (id: number) =>
  request.delete(`/mall/admin/promotions/${id}`)
