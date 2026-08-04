import request from '../utils/request'
import type {
  PsiPurchaseOrder,
  PsiPurchaseOrderPayload,
  PsiPurchaseSummaryItem,
  PsiReturnOrder,
  PsiSalesOrder,
  PsiSalesOrderPayload,
  PsiSalesRankItem,
  PsiStock,
  PsiStockInPayload,
  PsiStockMovement,
  PsiStockOrder,
  PsiStockOutPayload,
  PsiSupplier,
  PsiSupplierPayload,
  PsiWarehouse,
  PsiWarehousePayload,
} from '../types/psi'
import type { PageParams } from '../types'

/** PSI 分页结构(只有 list+total) */
export interface PsiPageResult<T> {
  list: T[]
  total: number
}

// ---------- 供应商 ----------

export interface SupplierQuery extends PageParams {
  keyword?: string
  status?: number
}

export const listSuppliers = (params?: SupplierQuery) =>
  request.get<unknown, PsiPageResult<PsiSupplier>>('/psi/suppliers', { params })

/** 启用供应商(下拉用) */
export const listEnabledSuppliers = () =>
  request.get<unknown, PsiSupplier[]>('/psi/suppliers/enabled')

export const createSupplier = (data: PsiSupplierPayload) => request.post('/psi/suppliers', data)

export const updateSupplier = (id: number, data: PsiSupplierPayload) =>
  request.put(`/psi/suppliers/${id}`, data)

export const deleteSupplier = (id: number) => request.delete(`/psi/suppliers/${id}`)

// ---------- 仓库 ----------

export interface WarehouseQuery extends PageParams {
  keyword?: string
  status?: number
}

export const listWarehouses = (params?: WarehouseQuery) =>
  request.get<unknown, PsiPageResult<PsiWarehouse>>('/psi/warehouses', { params })

/** 启用仓库(下拉用) */
export const listEnabledWarehouses = () =>
  request.get<unknown, PsiWarehouse[]>('/psi/warehouses/enabled')

export const createWarehouse = (data: PsiWarehousePayload) => request.post('/psi/warehouses', data)

export const updateWarehouse = (id: number, data: PsiWarehousePayload) =>
  request.put(`/psi/warehouses/${id}`, data)

export const deleteWarehouse = (id: number) => request.delete(`/psi/warehouses/${id}`)

// ---------- 采购单 ----------

export interface PurchaseOrderQuery extends PageParams {
  keyword?: string
  supplier_id?: number
  status?: number
  approval_status?: string
}

export const listPurchaseOrders = (params?: PurchaseOrderQuery) =>
  request.get<unknown, PsiPageResult<PsiPurchaseOrder>>('/psi/purchase-orders', { params })

export const getPurchaseOrder = (id: number) =>
  request.get<unknown, PsiPurchaseOrder>(`/psi/purchase-orders/${id}`)

export const createPurchaseOrder = (data: PsiPurchaseOrderPayload) =>
  request.post('/psi/purchase-orders', data)

export const updatePurchaseOrder = (id: number, data: PsiPurchaseOrderPayload) =>
  request.put(`/psi/purchase-orders/${id}`, data)

export const deletePurchaseOrder = (id: number) => request.delete(`/psi/purchase-orders/${id}`)

/** 执行采购入库(无请求体) */
export const stockInPurchaseOrder = (id: number) =>
  request.post(`/psi/purchase-orders/${id}/stock-in`)

// ---------- 采购退货 ----------

export interface PurchaseReturnQuery extends PageParams {
  keyword?: string
  supplier_id?: number
  status?: number
}

export const listPurchaseReturns = (params?: PurchaseReturnQuery) =>
  request.get<unknown, PsiPageResult<PsiReturnOrder>>('/psi/purchase-returns', { params })

export const getPurchaseReturn = (id: number) =>
  request.get<unknown, PsiReturnOrder>(`/psi/purchase-returns/${id}`)

export const createPurchaseReturn = (data: PsiPurchaseOrderPayload) =>
  request.post('/psi/purchase-returns', data)

/** 执行采购退货出库(无请求体) */
export const stockOutPurchaseReturn = (id: number) =>
  request.post(`/psi/purchase-returns/${id}/stock-out`)

// ---------- 销售单 ----------

export interface SalesOrderQuery extends PageParams {
  keyword?: string
  customer_id?: number
  status?: number
  approval_status?: string
}

export const listSalesOrders = (params?: SalesOrderQuery) =>
  request.get<unknown, PsiPageResult<PsiSalesOrder>>('/psi/sales-orders', { params })

export const getSalesOrder = (id: number) =>
  request.get<unknown, PsiSalesOrder>(`/psi/sales-orders/${id}`)

export const createSalesOrder = (data: PsiSalesOrderPayload) =>
  request.post('/psi/sales-orders', data)

export const updateSalesOrder = (id: number, data: PsiSalesOrderPayload) =>
  request.put(`/psi/sales-orders/${id}`, data)

export const deleteSalesOrder = (id: number) => request.delete(`/psi/sales-orders/${id}`)

/** 执行销售出库(无请求体) */
export const stockOutSalesOrder = (id: number) =>
  request.post(`/psi/sales-orders/${id}/stock-out`)

// ---------- 销售退货 ----------

export interface SalesReturnQuery extends PageParams {
  keyword?: string
  customer_id?: number
  status?: number
}

export const listSalesReturns = (params?: SalesReturnQuery) =>
  request.get<unknown, PsiPageResult<PsiReturnOrder>>('/psi/sales-returns', { params })

export const getSalesReturn = (id: number) =>
  request.get<unknown, PsiReturnOrder>(`/psi/sales-returns/${id}`)

export const createSalesReturn = (data: PsiSalesOrderPayload) =>
  request.post('/psi/sales-returns', data)

/** 执行销售退货入库(无请求体) */
export const stockInSalesReturn = (id: number) =>
  request.post(`/psi/sales-returns/${id}/stock-in`)

// ---------- 其他出入库 ----------

export interface StockOrderQuery extends PageParams {
  warehouse_id?: number
  biz_type?: string
}

export const listStockInOrders = (params?: StockOrderQuery) =>
  request.get<unknown, PsiPageResult<PsiStockOrder>>('/psi/stock-in-orders', { params })

export const getStockInOrder = (id: number) =>
  request.get<unknown, PsiStockOrder>(`/psi/stock-in-orders/${id}`)

export const createStockInOrder = (data: PsiStockInPayload) =>
  request.post('/psi/stock-in-orders', data)

export const listStockOutOrders = (params?: StockOrderQuery) =>
  request.get<unknown, PsiPageResult<PsiStockOrder>>('/psi/stock-out-orders', { params })

export const getStockOutOrder = (id: number) =>
  request.get<unknown, PsiStockOrder>(`/psi/stock-out-orders/${id}`)

export const createStockOutOrder = (data: PsiStockOutPayload) =>
  request.post('/psi/stock-out-orders', data)

// ---------- 库存 ----------

export interface StockQuery extends PageParams {
  warehouse_id?: number
  keyword?: string
  /** 只看低库存 */
  low_stock?: boolean
}

export const listStock = (params?: StockQuery) =>
  request.get<unknown, PsiPageResult<PsiStock>>('/psi/stock', { params })

export interface MovementQuery extends PageParams {
  warehouse_id?: number
  product_id?: number
  biz_type?: string
}

export const listStockMovements = (params?: MovementQuery) =>
  request.get<unknown, PsiPageResult<PsiStockMovement>>('/psi/stock/movements', { params })

// ---------- 报表 ----------

export const getPurchaseSummary = (params?: { start_date?: string; end_date?: string }) =>
  request.get<unknown, PsiPurchaseSummaryItem[]>('/psi/reports/purchase-summary', { params })

export const getSalesRanking = (params?: {
  warehouse_id?: number
  start_date?: string
  end_date?: string
  limit?: number
}) => request.get<unknown, PsiSalesRankItem[]>('/psi/reports/sales-ranking', { params })
