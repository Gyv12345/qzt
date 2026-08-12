import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  PsiPurchaseOrder,
  PsiSalesOrder,
  PsiStock,
  PsiAsset,
  PsiSupplier,
  PsiWarehouse,
  PsiStockMovement,
  PsiPurchaseReturn,
  PsiSalesReturn,
} from '../types/psi'

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

// ── 供应商 ──

export const listSuppliers = (params: PageParams & { keyword?: string }) =>
  request.get<unknown, PageResult<PsiSupplier>>('/psi/suppliers', { params })

// ── 仓库 ──

export const listWarehouses = (params: PageParams & { keyword?: string }) =>
  request.get<unknown, PageResult<PsiWarehouse>>('/psi/warehouses', { params })

/** 启用仓库下拉(建 warehouse name 映射用) */
export const listEnabledWarehouses = () =>
  request.get<unknown, PsiWarehouse[]>('/psi/warehouses/enabled')

// ── 库存流水 ──

export const listStockMovements = (params: PageParams & { warehouse_id?: number }) =>
  request.get<unknown, PageResult<PsiStockMovement>>('/psi/stock/movements', { params })

// ── 采购退货 ──

export const listPurchaseReturns = (params: PageParams) =>
  request.get<unknown, PageResult<PsiPurchaseReturn>>('/psi/purchase-returns', { params })

export const getPurchaseReturn = (id: number) =>
  request.get<unknown, PsiPurchaseReturn>(`/psi/purchase-returns/${id}`)

// ── 销售退货 ──

export const listSalesReturns = (params: PageParams) =>
  request.get<unknown, PageResult<PsiSalesReturn>>('/psi/sales-returns', { params })

export const getSalesReturn = (id: number) =>
  request.get<unknown, PsiSalesReturn>(`/psi/sales-returns/${id}`)
