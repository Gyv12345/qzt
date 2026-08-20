import request from '../utils/request'
import type { PageParams } from '../types'
import type { MallOrder, MallOrderDetail, MallOrderStatus } from '../types/mall'

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
