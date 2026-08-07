import request from '../utils/request'
import type { PageParams } from '../types'
import type { PsiPurchaseOrder, PsiSalesOrder, PsiStock, PsiAsset } from '../types/psi'

interface PageResult<T> { list: T[]; total: number }

// ── 采购 ──

export const listPurchaseOrders = (params: PageParams) =>
  request.get<unknown, PageResult<PsiPurchaseOrder>>('/psi/purchase-orders', { params })

export const getPurchaseOrder = (id: number) =>
  request.get<unknown, PsiPurchaseOrder>(`/psi/purchase-orders/${id}`)

// ── 销售 ──

export const listSalesOrders = (params: PageParams) =>
  request.get<unknown, PageResult<PsiSalesOrder>>('/psi/sales-orders', { params })

export const getSalesOrder = (id: number) =>
  request.get<unknown, PsiSalesOrder>(`/psi/sales-orders/${id}`)

// ── 库存 ──

export const listStock = (params: PageParams & { keyword?: string }) =>
  request.get<unknown, PageResult<PsiStock>>('/psi/stock', { params })

// ── 资产 ──

export const listAssets = (params: PageParams & { keyword?: string }) =>
  request.get<unknown, PageResult<PsiAsset>>('/psi/assets', { params })

export const getAsset = (id: number) =>
  request.get<unknown, PsiAsset>(`/psi/assets/${id}`)
