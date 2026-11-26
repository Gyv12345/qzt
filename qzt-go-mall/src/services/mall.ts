import request from '../utils/request'
import type {
  CreateOrderPayload,
  CreateOrderResult,
  MallGoods,
  MallUser,
  PublicCoupon,
  PublicOrder,
  UserCouponItem,
} from '../types/mall'

/** 商城商品列表(上架商品,免登录) */
export const listGoods = () => request.get<unknown, MallGoods[]>('/mall/public/goods')

/** 商城下单(匿名可下单;登录买家可带 coupon_no 用券) */
export const createOrder = (data: CreateOrderPayload) =>
  request.post<unknown, CreateOrderResult>('/mall/public/orders', data)

/** 凭订单号查单 */
export const getOrderByNo = (orderNo: string) =>
  request.get<unknown, PublicOrder>(`/mall/public/orders/${encodeURIComponent(orderNo)}`)

// ── 买家账号(/mall/public/auth/* 免鉴权,/mall/auth/* 需 Bearer token)──

/** 注册(仅返回买家用户,登录请调 loginMallUser) */
export const registerMallUser = (data: { phone: string; password: string; nickname?: string }) =>
  request.post<unknown, MallUser>('/mall/public/auth/register', data)

export const loginMallUser = (data: { phone: string; password: string }) =>
  request.post<unknown, { token: string; user: MallUser }>('/mall/public/auth/login', data)

/** 页面 bootstrap 校验:token 有效则返回最新用户资料,失效走拦截器报错 */
export const getMallMe = () => request.get<unknown, MallUser>('/mall/auth/me')

// ── 优惠券 ──

/** 领券中心:可领的公开券列表(免登录可见,领取需登录) */
export const listPublicCoupons = () => request.get<unknown, PublicCoupon[]>('/mall/public/coupons')

/** 领取(需登录;已领过/售罄由后端报错,拦截器 Toast) */
export const claimCoupon = (couponId: number) =>
  request.post<unknown, true>(`/mall/auth/coupons/${couponId}/claim`)

/** 我的券包(需登录) */
export const listMyCoupons = () => request.get<unknown, UserCouponItem[]>('/mall/auth/coupons')
