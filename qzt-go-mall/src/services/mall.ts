import request from '../utils/request'
import type { CreateOrderPayload, CreateOrderResult, MallGoods, PublicOrder } from '../types/mall'

/** 商城商品列表(上架商品,免登录) */
export const listGoods = () => request.get<unknown, MallGoods[]>('/mall/public/goods')

/** 商城下单(免登录,每 IP 每分钟限 5 单) */
export const createOrder = (data: CreateOrderPayload) =>
  request.post<unknown, CreateOrderResult>('/mall/public/orders', data)

/** 凭订单号查单 */
export const getOrderByNo = (orderNo: string) =>
  request.get<unknown, PublicOrder>(`/mall/public/orders/${encodeURIComponent(orderNo)}`)
